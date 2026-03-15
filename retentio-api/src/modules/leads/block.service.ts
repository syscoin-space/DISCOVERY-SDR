import { prisma } from '../../config/prisma';
import { BloqueioStatus, LeadStatus } from '@prisma/client';

export async function checkAndApplyBlocks(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      interactions: {
        where: { type: 'LIGACAO' },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!lead) return;

  const motivos: string[] = [];

  // 1. estimated_base_size < 3000 → motivo: "base_pequena"
  if (lead.estimated_base_size !== null && lead.estimated_base_size < 3000) {
    motivos.push('base_pequena');
  }

  // 2. recompra_cycle === "SEM_RECOMPRA" → motivo: "sem_recompra"
  if (lead.recompra_cycle === 'SEM_RECOMPRA') {
    motivos.push('sem_recompra');
  }

  // 3. integrability_level === "nao_integravel" → motivo: "erp_inviavel"
  if (lead.integrability_level === 'nao_integravel') {
    motivos.push('erp_inviavel');
  }

  // 4. prr_score < 20 (e prr_score não é null) → motivo: "prr_insuficiente"
  if (lead.prr_score !== null && lead.prr_score < 20) {
    motivos.push('prr_insuficiente');
  }

  // 5. company_type === "institucional" → motivo: "fora_do_icp"
  if (lead.company_type === 'institucional') {
    motivos.push('fora_do_icp');
  }

  // 6. interactions do tipo LIGACAO sem resposta >= 3 → motivo: "sem_decisor"
  // Aqui assumimos que status 'sem_resposta' ou similar indica ausência de resposta.
  // Como não foi especificado o campo exato de 'sem resposta', vamos assumir metadata ou status.
  // Na dúvida, vamos contar ligações nos últimos 3 dias ou os últimos 3 registros se tiverem status específico.
  // O usuário diz "sem resposta >= 3". Vamos olhar o campo status da Interaction.
  const unansweredCalls = lead.interactions.filter(i => i.status === 'no_answer' || i.status === 'missed').length;
  if (unansweredCalls >= 3) {
    motivos.push('sem_decisor');
  }

  if (motivos.length > 0) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        bloqueio_status: BloqueioStatus.ALERTA,
        bloqueio_motivos: motivos,
      },
    });

    await prisma.blockEvent.create({
      data: {
        lead_id: leadId,
        motivos: motivos,
        detectado_at: new Date(),
      },
    });
  } else {
    // Se estava em alerta e agora está limpo
    if (lead.bloqueio_status === BloqueioStatus.ALERTA) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          bloqueio_status: BloqueioStatus.LIMPO,
          bloqueio_motivos: [],
        },
      });
    }
  }
}
