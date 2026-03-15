/**
 * Cadence Step Worker — BullMQ
 *
 * Consome jobs da fila `cadence-steps` e executa o step correspondente.
 * Job payload: { leadCadenceStepId: string }
 *
 * Fluxo:
 *   1. Carrega o step + cadence_step + template + lead
 *   2. Se canal = EMAIL → envia via Resend
 *   3. Registra Interaction na timeline
 *   4. Marca step como EXECUTADO
 *   5. Agenda próximo step da cadência (se houver)
 */

import { Worker, Job, Queue } from 'bullmq';
import Handlebars from 'handlebars';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { resendService } from './resend.service';

// ─── Queue name (shared with scheduler) ──────────────────────────────

export const CADENCE_STEP_QUEUE = 'cadence-steps';

// ─── Scheduler helper (agenda um step no momento correto) ─────────────

export const cadenceStepQueue = new Queue(CADENCE_STEP_QUEUE, {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export async function scheduleStep(leadCadenceStepId: string, scheduledAt: Date) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await cadenceStepQueue.add(
    'execute-step',
    { leadCadenceStepId },
    { delay, jobId: `lcs-${leadCadenceStepId}` },
  );
  logger.info(`Cadence step scheduled: ${leadCadenceStepId} in ${delay}ms`);
}

// ─── Worker ───────────────────────────────────────────────────────────

export function startCadenceStepWorker() {
  const worker = new Worker<{ leadCadenceStepId: string }>(
    CADENCE_STEP_QUEUE,
    async (job: Job<{ leadCadenceStepId: string }>) => {
      const { leadCadenceStepId } = job.data;
      logger.info(`Processing cadence step: ${leadCadenceStepId}`);

      // ── 1. Carrega dados necessários ──
      const lcs = await prisma.leadCadenceStep.findUnique({
        where: { id: leadCadenceStepId },
        include: {
          lead_cadence: {
            include: {
              lead: {
                include: { sdr: { include: { resend_config: true } } },
              },
            },
          },
          cadence_step: {
            include: { template: true },
          },
        },
      });

      if (!lcs) {
        logger.warn(`LeadCadenceStep ${leadCadenceStepId} not found — skipping`);
        return;
      }

      // ── 2. Verifica se step ainda é válido ──
      if (lcs.status !== 'PENDENTE' && lcs.status !== 'ATRASADO') {
        logger.info(`Step ${leadCadenceStepId} already in status ${lcs.status} — skipping`);
        return;
      }

      const { lead } = lcs.lead_cadence;
      const { cadence_step } = lcs;
      const channel = cadence_step.channel;
      let interactionStatus = 'sent';

      // ── 3. Executa por canal ──
      try {
        if (channel === 'EMAIL' && cadence_step.template) {
          const template = cadence_step.template;
          const resendConfig = lead.sdr.resend_config;

          if (!resendConfig || !resendConfig.active) {
            throw new Error('SDR sem configuração Resend ativa');
          }

          if (!lead.email) {
            throw new Error(`Lead ${lead.id} não tem email cadastrado`);
          }

          // Renderiza template Handlebars
          const context = buildTemplateContext(lead);
          const bodyFn = Handlebars.compile(template.body);
          const subjectFn = template.subject ? Handlebars.compile(template.subject) : null;

          const renderedBody = bodyFn(context);
          const renderedSubject = subjectFn ? subjectFn(context) : `${cadence_step.cadence_id} — Step ${cadence_step.step_order}`;

          await resendService.sendEmail(resendConfig, {
            to: lead.email,
            subject: renderedSubject,
            html: renderedBody,
            leadId: lead.id,
            stepId: lcs.id,
          });

          // Controle de limite diário
          await prisma.resendConfig.update({
            where: { id: resendConfig.id },
            data: { sent_today: { increment: 1 } },
          });

        } else if (channel !== 'EMAIL') {
          // Para canais manuais (WhatsApp, LinkedIn, Ligacao):
          // Registra instrução mas não envia — SDR deve executar
          interactionStatus = 'pending_manual';
          logger.info(`Step ${leadCadenceStepId} is manual channel: ${channel}`);
        }

      } catch (err: unknown) {
        interactionStatus = 'failed';
        logger.error(`Step ${leadCadenceStepId} execution failed`, err);
        // Re-throw para ativar retry policy do BullMQ
        throw err;
      }

      // ── 4. Registra interação na timeline ──
      await prisma.$transaction([
        prisma.interaction.create({
          data: {
            lead_id: lead.id,
            type: channel as 'EMAIL' | 'WHATSAPP' | 'LIGACAO' | 'LINKEDIN',
            source: 'CADENCIA',
            subject: cadence_step.template?.subject ?? undefined,
            body: cadence_step.instructions ?? cadence_step.template?.body ?? undefined,
            status: interactionStatus,
            metadata: { lead_cadence_step_id: lcs.id, cadence_step_id: cadence_step.id },
          },
        }),
        prisma.leadCadenceStep.update({
          where: { id: leadCadenceStepId },
          data: {
            status: 'EXECUTADO',
            executed_at: new Date(),
          },
        }),
      ]);

      // ── 5. Agenda próximo step (se cadência ainda ativa) ──
      const nextStep = await prisma.leadCadenceStep.findFirst({
        where: {
          lead_cadence_id: lcs.lead_cadence_id,
          status: 'PENDENTE',
          scheduled_at: { gt: new Date() },
        },
        orderBy: { scheduled_at: 'asc' },
      });

      if (nextStep) {
        await scheduleStep(nextStep.id, nextStep.scheduled_at);
        logger.info(`Next step scheduled: ${nextStep.id} at ${nextStep.scheduled_at.toISOString()}`);
      } else {
        // Sem mais steps — marca cadência como completa
        await prisma.leadCadence.update({
          where: { id: lcs.lead_cadence_id },
          data: { status: 'completed', completed_at: new Date() },
        });
        logger.info(`LeadCadence ${lcs.lead_cadence_id} completed`);
      }
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1_000, // máx 10 emails/s
      },
    },
  );

  worker.on('completed', (job) => {
    logger.info(`Cadence step job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Cadence step job failed: ${job?.id}`, err);
  });

  worker.on('error', (err) => {
    logger.error('Cadence step worker error', err);
  });

  return worker;
}

// ─── Helper: contexto para Handlebars ────────────────────────────────

function buildTemplateContext(lead: {
  id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  niche?: string | null;
  estado?: string | null;
  city?: string | null;
}) {
  return {
    empresa: lead.company_name,
    contato: lead.contact_name ?? '',
    email: lead.email ?? '',
    nicho: lead.niche ?? '',
    cidade: lead.city ?? '',
    lead_id: lead.id,
  };
}
