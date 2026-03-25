import { prisma } from '../../config/prisma';
import { emailService } from '../email/email.service';
import { logger } from '../../config/logger';
import { 
  TaskStatus, 
  TaskType, 
  InteractionType, 
  InteractionSource,
} from '@prisma/client';
import { eventBus } from '../../shared/events/event-bus';
import { DomainEvent } from '../../shared/events/domain-events';

export class CadenceTaskExecutor {
  /**
   * Processa todas as tarefas de e-mail pendentes para todos os tenants
   */
  async processPendingTasks() {
    const now = new Date();
    
    // Busca tarefas de e-mail agendadas que ainda não foram executadas
    const pendingTasks = await prisma.task.findMany({
      where: {
        type: TaskType.CADENCE_STEP,
        channel: 'EMAIL',
        status: TaskStatus.PENDENTE,
        scheduled_at: { lte: now }
      },
      include: {
        lead: true,
        cadence_step: {
          include: { template: true }
        }
      },
      take: 50 // Processa em lotes para evitar sobrecarga
    });

    if (pendingTasks.length === 0) return;

    logger.info(`[CadenceTaskExecutor] Found ${pendingTasks.length} pending email tasks to process.`);

    for (const task of pendingTasks) {
      await this.executeTask(task);
    }
  }

  /**
   * Executa uma única tarefa de e-mail
   */
  private async executeTask(task: any) {
    const { tenant_id, lead_id, cadence_step, id: taskId } = task;
    const lead = task.lead;

    if (!lead || !lead.email) {
      logger.warn(`[CadenceTaskExecutor] Task ${taskId} has no lead email. Marking as FAILED.`);
      await this.failTask(task, 'Lead sem e-mail configurado');
      return;
    }

    if (!cadence_step || !cadence_step.template) {
      logger.warn(`[CadenceTaskExecutor] Task ${taskId} has no template. Marking as FAILED.`);
      await this.failTask(task, 'Passo de cadência sem template de e-mail');
      return;
    }

    try {
      // 1. Resolve o conteúdo (Placeholder simples por enquanto, pode ser expandido com Handlebars)
      const subject = this.replacePlaceholders(cadence_step.template.subject, lead);
      const html = this.replacePlaceholders(cadence_step.template.content_html, lead);

      // 2. Tenta o envio real via EmailService Multi-Tenant
      logger.info(`[CadenceTaskExecutor] Sending email for task ${taskId} (Tenant: ${tenant_id})`);
      
      const result = await emailService.send(tenant_id, {
        to: lead.email,
        subject,
        html,
      });

      if (!result) {
        // Tenant não tem provider ou está desativado
        await this.failTask(task, 'Tenant sem provedor de e-mail ativo ou configurado');
        return;
      }

      // 3. Sucesso: Registrar tudo
      await prisma.$transaction([
        // Atualiza a Task
        prisma.task.update({
          where: { id: taskId },
          data: { 
            status: TaskStatus.CONCLUIDA,
            completed_at: new Date(),
            outcome: 'ENVIADO'
          }
        }),
        // Registra a Interação (Audit Log)
        prisma.interaction.create({
          data: {
            tenant_id,
            lead_id,
            membership_id: task.membership_id,
            cadence_step_id: cadence_step.id,
            type: InteractionType.EMAIL,
            source: InteractionSource.CADENCIA,
            channel: 'EMAIL',
            external_id: result.id,
            subject,
            body: html,
            status: 'SENT',
            metadata: {
              provider: result.provider,
              sender: result.sender,
            }
          }
        })
      ]);

      // 4. Publica evento para avançar a cadência
      eventBus.publish(DomainEvent.TASK_COMPLETED, {
        tenant_id,
        membership_id: task.membership_id,
        timestamp: new Date().toISOString(),
        data: {
          task_id: taskId,
          lead_id: lead_id,
          type: TaskType.CADENCE_STEP
        }
      });

      logger.info(`[CadenceTaskExecutor] Task ${taskId} executed successfully. MessageId: ${result.id}`);

    } catch (error: any) {
      logger.error(`[CadenceTaskExecutor] Failed to execute task ${taskId}`, { error: error.message });
      
      // Tenta logar o assunto se o erro aconteceu após a resolução do conteúdo
      const subject = cadence_step?.template?.subject || 'Erro no envio';
      await this.failTask(task, error.message || 'Erro inesperado no provedor de e-mail', { subject });
    }
  }

  private async failTask(task: any, errorMessage: string, metadata?: any) {
    const { tenant_id, lead_id, cadence_step, id: taskId } = task;

    try {
      await prisma.$transaction([
        // Atualiza status da Task para PENDENTE (para retry ou manual) ou criamos um status FAILED no futuro
        prisma.task.update({
          where: { id: taskId },
          data: { 
            status: TaskStatus.PENDENTE, // Mantém pendente para o SDR ver que falhou
            outcome: `FALHA: ${errorMessage}`
          }
        }),
        // Registra a falha no Audit Log
        prisma.interaction.create({
          data: {
            tenant_id,
            lead_id,
            membership_id: task.membership_id,
            cadence_step_id: cadence_step?.id,
            type: InteractionType.EMAIL,
            source: InteractionSource.CADENCIA,
            channel: 'EMAIL',
            status: 'FAILED',
            error: errorMessage,
            subject: cadence_step?.template?.subject || 'Tentativa de Envio',
            metadata: metadata || undefined
          }
        })
      ]);
    } catch (err) {
      logger.error(`[CadenceTaskExecutor] Critical failure logging task error`, err);
    }
  }

  private replacePlaceholders(text: string, lead: any): string {
    if (!text) return '';
    return text
      .replace(/{{lead_name}}/g, lead.contact_name || lead.company_name || 'Prospect')
      .replace(/{{company_name}}/g, lead.company_name || '')
      .replace(/{{first_name}}/g, (lead.contact_name || '').split(' ')[0] || 'Prospect');
  }
}

export const cadenceTaskExecutor = new CadenceTaskExecutor();
