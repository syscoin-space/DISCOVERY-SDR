import { prisma } from '../../config/prisma';
import { Prisma, LeadStatus } from '@prisma/client';
import { AppError, PaginatedResult } from '../../shared/types';
import { CreateLeadInput, UpdateLeadInput, LeadFilters } from './lead.schema';
import { eventBus } from '../../shared/events/event-bus';
import { DomainEvent } from '../../shared/events/domain-events';
import { discoveryService } from './discovery.service';
import { planService } from '../billing/plan.service';

// V2 Allowed Transitions based on methodology
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  BANCO: ['CONTA_FRIA'],
  CONTA_FRIA: ['DISCOVERY', 'QUALIFICADO', 'EM_PROSPECCAO', 'PERDIDO'],
  DISCOVERY: ['QUALIFICADO', 'EM_PROSPECCAO', 'PERDIDO'],
  QUALIFICADO: ['PROSPECCAO', 'REUNIAO_MARCADA', 'PERDIDO'],
  PROSPECCAO: ['FOLLOW_UP', 'REUNIAO_MARCADA', 'NUTRICAO', 'PERDIDO'],
  EM_PROSPECCAO: ['FOLLOW_UP', 'REUNIAO_MARCADA', 'NUTRICAO', 'PERDIDO'],
  FOLLOW_UP: ['REUNIAO_MARCADA', 'EM_PROSPECCAO', 'NUTRICAO', 'PERDIDO'],
  NUTRICAO: ['EM_PROSPECCAO', 'PERDIDO', 'CONTA_FRIA'],
  REUNIAO_MARCADA: ['PERDIDO'],
  PERDIDO: ['CONTA_FRIA', 'BANCO'],
};

export class LeadService {
  async list(tenantId: string, filters: LeadFilters, membershipId?: string, role?: string): Promise<PaginatedResult<any>> {
    // If SDR, only see their assigned leads. If Manager/Owner, can see all or filter by sdr_id.
    const where: Prisma.LeadWhereInput = { tenant_id: tenantId };

    if (role === 'SDR') {
      where.sdr_id = membershipId;
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
    
    // SDRs can only view leads assigned to them
    if (role === 'SDR') {
      where.sdr_id = membershipId;
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
        interactions: { orderBy: { created_at: 'desc' }, take: 20 },
        cadence_enrollments: { include: { cadence: true } },
        tasks: { 
          where: { status: 'PENDENTE' },
          orderBy: { scheduled_at: 'asc' },
          take: 10 
        },
        _count: { select: { interactions: true, tasks: true, handoffs: true } },
      },
    });

    if (!lead) {
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

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: data as any,
    });

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

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { status: newStatus },
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
  async pipelineCounts(tenantId: string, membershipId?: string, role?: string) {
    const where: Prisma.LeadWhereInput = { tenant_id: tenantId };
    if (role === 'SDR') where.sdr_id = membershipId;

    const raw = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const s of Object.values(LeadStatus)) {
      counts[s] = 0;
    }
    for (const r of raw) {
      counts[r.status] = r._count.id;
    }
    return counts;
  }
}

export const leadService = new LeadService();
