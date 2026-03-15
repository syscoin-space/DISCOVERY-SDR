import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/types';

export class IcpService {
  /** Lista todos os critérios ICP ativos, ordenados por `order` */
  async listCriteria() {
    return prisma.icpCriteria.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
  }

  /** Retorna critério pelo id */
  async getCriteriaById(id: string) {
    const c = await prisma.icpCriteria.findUnique({ where: { id } });
    if (!c) throw new AppError(404, 'Critério ICP não encontrado', 'ICP_CRITERIA_NOT_FOUND');
    return c;
  }

  /** Salva (upsert) resposta de um SDR para um critério de um lead */
  async upsertAnswer(leadId: string, criteriaId: string, answerValue: string, sdrId: string) {
    // garante que o lead pertence ao SDR
    const lead = await prisma.lead.findFirst({ where: { id: leadId, sdr_id: sdrId } });
    if (!lead) throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');

    const criteria = await prisma.icpCriteria.findUnique({ where: { id: criteriaId } });
    if (!criteria) throw new AppError(404, 'Critério ICP não encontrado', 'ICP_CRITERIA_NOT_FOUND');

    // score: se a opção salva pointValue no futuro, usar; por ora 0 default
    return prisma.icpAnswer.upsert({
      where: { lead_id_criteria_id: { lead_id: leadId, criteria_id: criteriaId } },
      create: { lead_id: leadId, criteria_id: criteriaId, answer_value: answerValue, score_points: 0 },
      update: { answer_value: answerValue },
    });
  }

  /** Calcula e persiste o icp_score + icp_tier do lead */
  async recalcScore(leadId: string, sdrId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, sdr_id: sdrId } });
    if (!lead) throw new AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');

    const answers = await prisma.icpAnswer.findMany({ where: { lead_id: leadId } });
    const totalScore = answers.reduce((acc, a) => acc + a.score_points, 0);

    let icpTier: 'FORA' | 'PARCIAL' | 'QUENTE' | 'CONTRATO_CERTO' = 'FORA';
    if (totalScore >= 80) icpTier = 'CONTRATO_CERTO';
    else if (totalScore >= 60) icpTier = 'QUENTE';
    else if (totalScore >= 40) icpTier = 'PARCIAL';

    return prisma.lead.update({
      where: { id: leadId },
      data: { icp_score: totalScore, icp_tier: icpTier },
    });
  }
}

export const icpService = new IcpService();
