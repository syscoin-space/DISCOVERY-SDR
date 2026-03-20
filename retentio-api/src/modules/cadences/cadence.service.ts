import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/types';
import { TaskType, TaskStatus, EnrollmentStatus } from '@prisma/client';

export class CadenceService {
  /**
   * List all cadences for a tenant
   */
  async listCadences(tenantId: string) {
    return prisma.cadence.findMany({
      where: { tenant_id: tenantId },
      include: {
        _count: {
          select: { enrollments: true, steps: true }
        },
        steps: {
          orderBy: { step_order: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Get a single cadence with steps
   */
  async getCadence(id: string, tenantId: string) {
    const cadence = await prisma.cadence.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        steps: { orderBy: { step_order: 'asc' } },
        enrollments: {
          take: 50,
          include: {
            lead: {
              select: { id: true, company_name: true, status: true, contact_name: true }
            }
          }
        },
        _count: { select: { enrollments: true } }
      }
    });

    if (!cadence) throw new AppError(404, 'Cadência não encontrada');
    return cadence;
  }

  /**
   * Create a new cadence with steps
   */
  async createCadence(tenantId: string, data: any) {
    const { name, purpose, description, steps } = data;

    return prisma.cadence.create({
      data: {
        tenant_id: tenantId,
        name,
        purpose,
        description,
        steps: {
          create: steps.map((step: any) => ({
            step_order: step.step_order,
            day_offset: step.day_offset,
            channel: step.channel,
            template_id: step.template_id,
            instructions: step.instructions,
          }))
        }
      },
      include: { steps: true }
    });
  }

  /**
   * Enroll a lead into a cadence
   */
  async enrollLead(tenantId: string, membershipId: string, leadId: string, cadenceId: string) {
    // 1. Validate lead and cadence
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenant_id: tenantId }
    });
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    const cadence = await prisma.cadence.findFirst({
      where: { id: cadenceId, tenant_id: tenantId },
      include: { steps: { orderBy: { step_order: 'asc' } } }
    });
    if (!cadence) throw new AppError(404, 'Cadência não encontrada');
    if (cadence.steps.length === 0) throw new AppError(400, 'Cadência sem passos configurados');

    // 2. Check for existing active enrollment
    const existing = await prisma.cadenceEnrollment.findUnique({
      where: { lead_id_cadence_id: { lead_id: leadId, cadence_id: cadenceId } }
    });
    if (existing && existing.status === EnrollmentStatus.ACTIVE) {
      throw new AppError(400, 'Lead já está inscrito e ativo nesta cadência');
    }

    // 3. Create or Update enrollment
    const enrollment = await prisma.cadenceEnrollment.upsert({
      where: { lead_id_cadence_id: { lead_id: leadId, cadence_id: cadenceId } },
      create: {
        lead_id: leadId,
        cadence_id: cadenceId,
        current_step: 1,
        status: EnrollmentStatus.ACTIVE,
        started_at: new Date()
      },
      update: {
        current_step: 1,
        status: EnrollmentStatus.ACTIVE,
        started_at: new Date(),
        completed_at: null
      }
    });

    // 4. Schedule the first task
    const firstStep = cadence.steps[0];
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + firstStep.day_offset);

    await prisma.task.create({
      data: {
        tenant_id: tenantId,
        membership_id: lead.sdr_id || membershipId, // Assigned SDR or the one who enrolled
        lead_id: leadId,
        type: TaskType.CADENCE_STEP,
        status: TaskStatus.PENDENTE,
        title: `${cadence.name} - Passo 1: ${firstStep.channel}`,
        description: firstStep.instructions || undefined,
        channel: firstStep.channel,
        scheduled_at: scheduledAt,
        cadence_enrollment_id: enrollment.id,
        cadence_step_id: firstStep.id
      }
    });

    return enrollment;
  }

  /**
   * Advancement logic when a task is completed
   */
  async handleTaskCompletion(taskId: string, tenantId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, tenant_id: tenantId },
      include: {
        cadence_enrollment: {
          include: { 
            cadence: { 
              include: { steps: { orderBy: { step_order: 'asc' } } } 
            } 
          }
        }
      }
    });

    if (!task || !task.cadence_enrollment) return;
    if (task.status !== TaskStatus.CONCLUIDA) return;

    const enrollment = task.cadence_enrollment;
    const steps = enrollment.cadence.steps;
    const currentTaskStep = steps.find(s => s.id === task.cadence_step_id);

    if (!currentTaskStep) return;

    // Idempotency: If enrollment already advanced past this step, ignore
    if (enrollment.current_step > currentTaskStep.step_order) {
      console.log(`[CadenceService] Enrollment ${enrollment.id} already past step ${currentTaskStep.step_order}. Skipping.`);
      return;
    }

    const nextStep = steps.find(s => s.step_order === currentTaskStep.step_order + 1);

    if (nextStep) {
      // Create next task
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + nextStep.day_offset);

      await prisma.task.create({
        data: {
          tenant_id: tenantId,
          membership_id: task.membership_id,
          lead_id: task.lead_id,
          type: TaskType.CADENCE_STEP,
          status: TaskStatus.PENDENTE,
          title: `${enrollment.cadence.name} - Passo ${nextStep.step_order}: ${nextStep.channel}`,
          description: nextStep.instructions || undefined,
          channel: nextStep.channel,
          scheduled_at: scheduledAt,
          cadence_enrollment_id: enrollment.id,
          cadence_step_id: nextStep.id
        }
      });

      // Update enrollment progress
      await prisma.cadenceEnrollment.update({
        where: { id: enrollment.id },
        data: { current_step: nextStep.step_order }
      });
    } else {
      // Completed last step
      await prisma.cadenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: EnrollmentStatus.COMPLETED_SUCCESS,
          completed_at: new Date()
        }
      });
    }
  }

  /**
   * Stop/Unenroll lead
   */
  async unenrollLead(tenantId: string, leadId: string, cadenceId: string) {
    const enrollment = await prisma.cadenceEnrollment.findUnique({
      where: { lead_id_cadence_id: { lead_id: leadId, cadence_id: cadenceId } }
    });

    if (!enrollment) return;

    // 1. Cancel pending tasks for this enrollment
    await prisma.task.updateMany({
      where: { 
        cadence_enrollment_id: enrollment.id,
        status: TaskStatus.PENDENTE 
      },
      data: { status: TaskStatus.CANCELADA }
    });

    // 2. Mark enrollment as cancelled
    return prisma.cadenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.CANCELLED,
        completed_at: new Date()
      }
    });
  }
}
