import { prisma } from '../../config/prisma';
import { Prisma, LeadStatus } from '@prisma/client';
import { AppError, PaginatedResult } from '../../shared/types';
import { CreateLeadInput, UpdateLeadInput, LeadFilters } from './lead.schema';
import { eventBus } from '../../shared/events/event-bus';
import { DomainEvent } from '../../shared/events/domain-events';
import { discoveryService } from './discovery.service';
import { planService } from '../billing/plan.service';
import { logger } from '../../config/logger';

// V2 Allowed Transitions based on methodology
const ALL_STATUSES = Object.values(LeadStatus);
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = ALL_STATUSES.reduce((acc, status) => {
  acc[status] = ALL_STATUSES.filter(s => s !== status);
  return acc;
}, {} as any);

const STATUS_WEIGHT: Record<LeadStatus, number> = {
  BANCO: 0,
  CONTA_FRIA: 1,
  DISCOVERY: 2,
  QUALIFICADO: 3,
  PROSPECCAO: 4,
  EM_PROSPECCAO: 5,
  FOLLOW_UP: 6,
  NUTRICAO: 7,
  REUNIAO_MARCADA: 8,
  PERDIDO: 99,
};

export class LeadService {
  async list(tenantId: string, filters: LeadFilters, membershipId?: string, role?: string): Promise<PaginatedResult<any>> {
    // If SDR, only see their assigned leads. If Manager/Owner, can see all or filter by sdr_id.
    const where: Prisma.LeadWhereInput = { tenant_id: tenantId };

    if (role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility === 'ALL') {
        if (filters.sdr_id) where.sdr_id = filters.sdr_id;
      } else {
        where.sdr_id = membershipId;
      }
    } else if (filters.sdr_id) {
      where.sdr_id = filters.sdr_id;
    }

    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { company_name: { contains: filters.search, mode: 'insensitive' } },
        { contact_name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { domain: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const limit = Number(filters.limit) || 20;
    const take = limit + 1;
    const cursor = filters.cursor ? { id: filters.cursor } : undefined;

    const leads = await prisma.lead.findMany({
      where,
      take,
      skip: cursor ? 1 : 0,
      cursor,
      orderBy: [{ icp_score: { sort: 'desc', nulls: 'last' } }, { created_at: 'desc' }],
      include: {
        sdr: {
          select: {
            id: true,
            user: { select: { name: true, avatar_url: true } }
          }
        },
        _count: { select: { interactions: true, tasks: true } },
      },
    });

    const hasMore = leads.length > limit;
    const data = hasMore ? leads.slice(0, -1) : leads;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    const total = await prisma.lead.count({ where });

    return {
      data,
      meta: {
        total,
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async getById(id: string, tenantId: string, membershipId?: string, role?: string) {
    const where: Prisma.LeadWhereInput = { id, tenant_id: tenantId };
    
    // SDRs can only view leads assigned to them or unassigned (if we want to allow picking)
    // For now, strict assignment as per user request
    if (role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility !== 'ALL') {
        where.sdr_id = membershipId;
      }
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        sdr: {
          select: {
            id: true,
            user: { select: { name: true, avatar_url: true } }
          }
        },
        distributor: {
          select: {
            id: true,
            user: { select: { name: true } }
          }
        },
        interactions: { 
          include: { 
            email_events: { orderBy: { created_at: 'asc' } } 
          },
          orderBy: { created_at: 'desc' }, 
          take: 20 
        },
        cadence_enrollments: { 
          include: { 
            cadence: {
              include: {
                steps: {
                  include: { template: true },
                  orderBy: { step_order: 'asc' }
                }
              }
            } 
          } 
        },
        tasks: { 
          where: { status: 'PENDENTE' },
          orderBy: { scheduled_at: 'asc' },
          take: 10,
          include: {
            cadence_step: {
              include: { template: true }
            }
          }
        },
        _count: { select: { interactions: true, tasks: true, handoffs: true } },
      },
    });

    if (!lead) {
      // Diagnostic check: does it exist at all in this tenant?
      const existsInTenant = await prisma.lead.findFirst({ where: { id, tenant_id: tenantId } });
      if (existsInTenant && role === 'SDR') {
        logger.warn(`[LeadService] SDR ${membershipId} attempted to access lead ${id} assigned to ${existsInTenant.sdr_id}`);
        throw new AppError(403, 'Você não tem permissão para acessar este lead (atribuído a outro SDR)', 'LEAD_FORBIDDEN');
      }
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }

    // Calcular Next Best Action dinamizamente
    const next_best_action = await discoveryService.getNextBestAction(lead as any);

    return {
      ...lead,
      next_best_action,
    };
  }

  async create(tenantId: string, membershipId: string, data: CreateLeadInput) {
    // Check Plan Limits
    await planService.checkLimit(tenantId, 'leads_monthly');

    // Check SDR Limit if assigned immediately
    if (data.sdr_id) {
      await this.checkSdrLeadLimit(data.sdr_id, 1);
    }

    // Check for duplicates within the same tenant
    if (data.domain) {
      const existing = await prisma.lead.findUnique({
        where: { domain_tenant_id: { domain: data.domain, tenant_id: tenantId } },
      });
      if (existing) throw new AppError(409, 'Domínio já cadastrado neste tenant', 'DOMAIN_DUPLICATE');
    }

    if (data.email) {
      const existing = await prisma.lead.findUnique({
        where: { email_tenant_id: { email: data.email, tenant_id: tenantId } },
      });
      if (existing) throw new AppError(409, 'E-mail já cadastrado neste tenant', 'EMAIL_DUPLICATE');
    }

    return prisma.lead.create({
      data: { 
        ...data, 
        tenant_id: tenantId,
        // Leads created manually initially go to BANCO unless distributed immediately
        status: LeadStatus.BANCO,
      },
    });
  }

  async update(id: string, tenantId: string, data: UpdateLeadInput, membershipId?: string, role?: string) {
    const where: Prisma.LeadWhereInput = { id, tenant_id: tenantId };
    if (role === 'SDR') where.sdr_id = membershipId;

    const lead = await prisma.lead.findFirst({ where });
    if (!lead) {
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }

    // Check SDR Limit if assignment is changing
    if (data.sdr_id && data.sdr_id !== lead.sdr_id) {
      const isActive = ([
        LeadStatus.BANCO, LeadStatus.CONTA_FRIA, LeadStatus.DISCOVERY,
        LeadStatus.QUALIFICADO, LeadStatus.PROSPECCAO, LeadStatus.EM_PROSPECCAO,
        LeadStatus.FOLLOW_UP, LeadStatus.NUTRICAO
      ] as LeadStatus[]).includes(lead.status as LeadStatus);
      await this.checkSdrLeadLimit(data.sdr_id, isActive ? 1 : 0);
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: data as any,
    });

    // Sub-task: AuditLog for status change
    if (data.status && data.status !== lead.status) {
      await prisma.auditLog.create({
        data: {
          tenant_id: tenantId,
          user_id: membershipId || null,
          lead_id: id,
          action: 'LEAD_STATUS_CHANGED',
          entity_type: 'Lead',
          entity_id: id,
          old_value: { status: lead.status } as any,
          new_value: { status: data.status, origin: 'UPDATE_FORM' } as any,
        }
      });
    }

    // If SDR was changed (assigned), emit event
    if (data.sdr_id && data.sdr_id !== lead.sdr_id) {
      await eventBus.publishAndWait(DomainEvent.LEAD_ASSIGNED, {
        tenant_id: tenantId,
        membership_id: membershipId || 'SYSTEM',
        timestamp: new Date().toISOString(),
        data: {
          lead_id: id,
          lead_name: updatedLead.contact_name || updatedLead.company_name,
          sdr_id: data.sdr_id,
        },
      });
    }

    return updatedLead;
  }

  async updateStatus(id: string, tenantId: string, newStatus: LeadStatus, membershipId?: string, role?: string) {
    const where: Prisma.LeadWhereInput = { id, tenant_id: tenantId };
    if (role === 'SDR') where.sdr_id = membershipId;

    const lead = await prisma.lead.findFirst({ where });
    if (!lead) {
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }

    const allowed = ALLOWED_TRANSITIONS[lead.status];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        422,
        `Transição de ${lead.status} para ${newStatus} não permitida`,
        'INVALID_TRANSITION',
      );
    }

    /* 
    // SDR can skip forward but ideally not go back. 
    // Removed for "Livremente" requirement.
    if (role === 'SDR') {
      const oldWeight = STATUS_WEIGHT[lead.status];
      const newWeight = STATUS_WEIGHT[newStatus];
      if (newWeight < oldWeight) {
        throw new AppError(403, 'SDR não pode retroceder a etapa do lead', 'BACKWARD_MOVE_FORBIDDEN');
      }
    }
    */

    // Rule: Discovery Disabled
    if (newStatus === 'DISCOVERY') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant && !tenant.discovery_enabled) {
        throw new AppError(403, 'A etapa Discovery está desativada para este tenant', 'DISCOVERY_DISABLED');
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: membershipId || null,
        lead_id: id,
        action: 'LEAD_STATUS_CHANGED',
        entity_type: 'Lead',
        entity_id: id,
        old_value: { status: lead.status } as any,
        new_value: { status: newStatus, origin: 'KANBAN' } as any,
      }
    });

    eventBus.publish(DomainEvent.LEAD_STATUS_CHANGED, {
      tenant_id: tenantId,
      membership_id: membershipId || 'SYSTEM',
      timestamp: new Date().toISOString(),
      data: {
        lead_id: id,
        old_status: lead.status,
        new_status: newStatus,
      },
    });

    return updatedLead;
  }

  async delete(id: string, tenantId: string, membershipId?: string, role?: string) {
    const where: Prisma.LeadWhereInput = { id, tenant_id: tenantId };
    if (role === 'SDR') where.sdr_id = membershipId;

    const lead = await prisma.lead.findFirst({ where });
    if (!lead) {
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }

    await prisma.lead.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Kanban: counts por status ──
  async pipelineCounts(tenantId: string, membershipId?: string, role?: string, filteredSdrId?: string) {
    const where: Prisma.LeadWhereInput = { tenant_id: tenantId };
    if (role === 'SDR') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as any;
      if (settings?.sdrVisibility === 'ALL') {
        if (filteredSdrId) where.sdr_id = filteredSdrId;
      } else {
        where.sdr_id = membershipId;
      }
    } else if (filteredSdrId) {
      where.sdr_id = filteredSdrId;
    }

    const raw = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const s of Object.values(LeadStatus)) {
      counts[s] = 0;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const discoveryEnabled = tenant?.discovery_enabled ?? false;

    for (const r of raw) {
      if (r.status === 'DISCOVERY' && !discoveryEnabled) {
        counts[r.status] = 0;
      } else {
        counts[r.status] = r._count.id;
      }
    }
    return counts;
  }

  async bulkAssign(tenantId: string, leadIds: string[], sdrId: string, membershipId?: string) {
    // We only count the leads that are actively taking up slots (not PERDIDO/REUNIAO)
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, tenant_id: tenantId },
      select: { id: true, sdr_id: true, status: true, contact_name: true, company_name: true }
    });

    if (leads.length === 0) return { updated: 0 };

    const activeStates: LeadStatus[] = [
      LeadStatus.BANCO, LeadStatus.CONTA_FRIA, LeadStatus.DISCOVERY,
      LeadStatus.QUALIFICADO, LeadStatus.PROSPECCAO, LeadStatus.EM_PROSPECCAO,
      LeadStatus.FOLLOW_UP, LeadStatus.NUTRICAO
    ];

    const activeIncomingCount = leads.filter(l => 
      l.sdr_id !== sdrId && // Evita contagem dupla se o lead já estiver com este SDR
      activeStates.includes(l.status as LeadStatus)
    ).length;

    // Use transaction to ensure limit cannot be bypassed by race conditions
    const updatedCount = await prisma.$transaction(async (tx) => {
      // Re-count active leads internally inside transaction lock
      const activeCount = await tx.lead.count({
        where: {
          sdr_id: sdrId,
          status: { in: activeStates }
        }
      });

      if (activeCount + activeIncomingCount > 100) {
        throw new AppError(403, `SDR atingiu o limite de 100 leads ativos (Atuais: ${activeCount}, Tentando adicionar: ${activeIncomingCount})`, 'SDR_LIMIT_REACHED');
      }

      // Perform update batch
      const result = await tx.lead.updateMany({
        where: { id: { in: leads.map(l => l.id) } },
        data: { sdr_id: sdrId }
      });

      // Insert AuditLog for the entire Bulk operation
      await tx.auditLog.create({
        data: {
          tenant_id: tenantId,
          user_id: membershipId || null,
          entity_type: 'Lead',
          entity_id: 'BULK', // Special identifier for bulk
          action: 'BULK_ASSIGN_LEADS',
          old_value: { count: leads.length } as any,
          new_value: { 
            target_sdr: sdrId, 
            count: leads.length, 
            lead_ids: leads.map(l => l.id) 
          } as any,
        }
      });

      return result.count;
    }, {
      isolationLevel: 'Serializable' // Prevents phantom reads
    });

    for (const lead of leads) {
      if (lead.sdr_id !== sdrId) {
        eventBus.publish(DomainEvent.LEAD_ASSIGNED, {
          tenant_id: tenantId,
          membership_id: membershipId || 'SYSTEM',
          timestamp: new Date().toISOString(),
          data: {
            lead_id: lead.id,
            lead_name: lead.contact_name || lead.company_name,
            sdr_id: sdrId,
          },
        });
      }
    }

    return { updated: updatedCount };
  }

  private async checkSdrLeadLimit(sdrId: string, incomingCount: number = 1) {
    const activeStates: LeadStatus[] = [
      LeadStatus.BANCO,
      LeadStatus.CONTA_FRIA,
      LeadStatus.DISCOVERY,
      LeadStatus.QUALIFICADO,
      LeadStatus.PROSPECCAO,
      LeadStatus.EM_PROSPECCAO,
      LeadStatus.FOLLOW_UP,
      LeadStatus.NUTRICAO
    ];

    const activeCount = await prisma.lead.count({
      where: {
        sdr_id: sdrId,
        status: { in: activeStates }
      }
    });

    if (activeCount + incomingCount > 100) {
      throw new AppError(403, `SDR atingiu o limite de 100 leads ativos (Atuais: ${activeCount}, Tentando adicionar: ${incomingCount})`, 'SDR_LIMIT_REACHED');
    }
  }
}

export const leadService = new LeadService();
