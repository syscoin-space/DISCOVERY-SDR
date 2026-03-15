import { prisma } from '../../config/prisma';
import { Prisma, LeadStatus } from '@prisma/client';
import { AppError, PaginatedResult } from '../../shared/types';
import { CreateLeadInput, UpdateLeadInput, LeadFilters } from './lead.schema';

// Estado-máquina de transições permitidas
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  CONTA_FRIA: ['EM_PROSPECCAO', 'SEM_PERFIL', 'NUTRICAO'],
  EM_PROSPECCAO: ['REUNIAO_AGENDADA', 'NUTRICAO', 'SEM_PERFIL', 'CONTA_FRIA'],
  REUNIAO_AGENDADA: ['OPORTUNIDADE_QUALIFICADA', 'EM_PROSPECCAO', 'NUTRICAO', 'SEM_PERFIL'],
  OPORTUNIDADE_QUALIFICADA: ['EM_PROSPECCAO', 'NUTRICAO'],
  NUTRICAO: ['CONTA_FRIA', 'EM_PROSPECCAO'],
  SEM_PERFIL: [],
};

export class LeadService {
  async list(sdrId: string, filters: LeadFilters): Promise<PaginatedResult<any>> {
    const where: Prisma.LeadWhereInput = { sdr_id: sdrId };

    if (filters.status) where.status = filters.status;
    if (filters.prr_tier) where.prr_tier = filters.prr_tier;
    if (filters.icp_tier) where.icp_tier = filters.icp_tier;
    if (filters.bloqueio_status) where.bloqueio_status = filters.bloqueio_status;
    if (filters.search) {
      where.OR = [
        { company_name: { contains: filters.search, mode: 'insensitive' } },
        { contact_name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
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
      orderBy: [{ prr_score: 'desc' }, { created_at: 'desc' }],
      include: {
        _count: { select: { interactions: true } },
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
    } as any;
  }

  async getById(id: string, sdrId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, sdr_id: sdrId },
      include: {
        prr_inputs: true,
        icp_answers: { include: { criteria: true } },
        discovered_stack: true,
        interactions: { orderBy: { created_at: 'desc' }, take: 20 },
        lead_cadences: { include: { cadence: true } },
        _count: { select: { interactions: true, handoffs: true } },
      },
    });

    if (!lead) {
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    return lead;
  }

  async create(sdrId: string, data: CreateLeadInput) {
    // Verifica CNPJ duplicado se informado
    if (data.cnpj) {
      const existing = await prisma.lead.findFirst({
        where: { cnpj: data.cnpj, sdr_id: sdrId },
      });
      if (existing) {
        throw new AppError(409, 'Já existe um lead com este CNPJ', 'CNPJ_DUPLICATE');
      }
    }

    return prisma.lead.create({
      data: { ...data, sdr_id: sdrId },
    });
  }

  async update(id: string, sdrId: string, data: UpdateLeadInput) {
    const lead = await prisma.lead.findFirst({ where: { id, sdr_id: sdrId } });
    if (!lead) {
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }

    return prisma.lead.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, sdrId: string, newStatus: LeadStatus) {
    const lead = await prisma.lead.findFirst({ where: { id, sdr_id: sdrId } });
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

    return prisma.lead.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async delete(id: string, sdrId: string) {
    const lead = await prisma.lead.findFirst({ where: { id, sdr_id: sdrId } });
    if (!lead) {
      throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }

    await prisma.lead.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Kanban: counts por status ──
  async pipelineCounts(sdrId: string) {
    const raw = await prisma.lead.groupBy({
      by: ['status'],
      where: { sdr_id: sdrId },
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
