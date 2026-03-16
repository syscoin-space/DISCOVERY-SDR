import { Worker, Queue } from 'bullmq';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { sendPushToUser, sendPushToRole } from './push.service';

const redisUrl = new URL(env.REDIS_URL);
const connection: any = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
};

if (redisUrl.password) connection.password = redisUrl.password;
else if (env.REDIS_PASSWORD) connection.password = env.REDIS_PASSWORD;

if (redisUrl.username) connection.username = redisUrl.username;
else if (env.REDIS_USERNAME) connection.username = env.REDIS_USERNAME;

const notificationQueue = new Queue('notifications', { connection });

// ── Job handlers ──

async function handleProximoContato() {
  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  const tasks = await prisma.dailyTask.findMany({
    where: {
      proximo_contato: { gte: now, lte: in30min },
      status: 'LIGAR_DEPOIS',
    },
    include: { lead: { select: { company_name: true } }, sdr: { select: { id: true } } },
  });

  for (const task of tasks) {
    const horario = task.proximo_contato
      ? task.proximo_contato.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';

    // Check if already notified for this task today
    const existing = await prisma.notification.findFirst({
      where: {
        user_id: task.sdr_id,
        tipo: 'proximo_contato',
        lead_id: task.lead_id,
        enviada_at: { gte: new Date(now.toISOString().split('T')[0]) },
      },
    });
    if (existing) continue;

    await sendPushToUser(task.sdr_id, {
      tipo: 'proximo_contato',
      titulo: 'Ligue em 30min',
      corpo: `${task.lead.company_name} — contato agendado para ${horario}`,
      url: '/hoje',
    });
  }

  logger.info(`proximo_contato: checked ${tasks.length} tasks`);
}

async function handleStepsAtrasados() {
  const now = new Date();

  const atrasados = await prisma.leadCadenceStep.findMany({
    where: {
      scheduled_at: { lt: now },
      status: 'PENDENTE',
    },
    include: {
      lead_cadence: {
        include: {
          lead: { select: { company_name: true, sdr_id: true } },
        },
      },
      cadence_step: { select: { channel: true, day_offset: true } },
    },
    take: 50,
  });

  // Group by SDR to avoid flooding
  const bySdr = new Map<string, typeof atrasados>();
  for (const step of atrasados) {
    const sdrId = step.lead_cadence.lead.sdr_id;
    if (!bySdr.has(sdrId)) bySdr.set(sdrId, []);
    bySdr.get(sdrId)!.push(step);
  }

  for (const [sdrId, steps] of bySdr) {
    if (steps.length === 1) {
      const s = steps[0];
      await sendPushToUser(sdrId, {
        tipo: 'step_atrasado',
        titulo: 'Step atrasado',
        corpo: `${s.lead_cadence.lead.company_name} — ${s.cadence_step.channel} do dia ${s.cadence_step.day_offset} está pendente`,
        url: '/pipeline',
      });
    } else {
      await sendPushToUser(sdrId, {
        tipo: 'step_atrasado',
        titulo: `${steps.length} steps atrasados`,
        corpo: `Você tem ${steps.length} steps de cadência pendentes. Confira o pipeline.`,
        url: '/pipeline',
      });
    }
  }

  logger.info(`steps_atrasados: found ${atrasados.length} overdue steps`);
}

async function handleTierAParado() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leads = await prisma.lead.findMany({
    where: {
      prr_tier: 'A',
      updated_at: { lt: threeDaysAgo },
      status: { notIn: ['SEM_PERFIL', 'OPORTUNIDADE_QUALIFICADA'] },
    },
    select: {
      id: true,
      company_name: true,
      sdr_id: true,
      updated_at: true,
    },
  });

  // Group by SDR, max 3 per day
  const bySdr = new Map<string, typeof leads>();
  for (const lead of leads) {
    if (!bySdr.has(lead.sdr_id)) bySdr.set(lead.sdr_id, []);
    bySdr.get(lead.sdr_id)!.push(lead);
  }

  for (const [sdrId, sdrLeads] of bySdr) {
    // Check how many tier_a notifications already sent today
    const sentToday = await prisma.notification.count({
      where: {
        user_id: sdrId,
        tipo: 'tier_a_parado',
        enviada_at: { gte: today },
      },
    });

    const remaining = Math.max(0, 3 - sentToday);
    const toNotify = sdrLeads.slice(0, remaining);

    for (const lead of toNotify) {
      const daysSince = Math.floor(
        (Date.now() - lead.updated_at.getTime()) / (1000 * 60 * 60 * 24),
      );
      await sendPushToUser(sdrId, {
        tipo: 'tier_a_parado',
        titulo: 'Lead Tier A parado',
        corpo: `${lead.company_name} — sem atividade há ${daysSince} dias. Priorize hoje.`,
        url: '/pipeline?tier=A',
      });
    }
  }

  logger.info(`tier_a_parado: found ${leads.length} stale Tier A leads`);
}

async function handleMetaBatida() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metas = await prisma.meta.findMany({
    where: { ativo: true },
    include: { sdr: { select: { id: true, name: true } } },
  });

  for (const meta of metas) {
    if (!meta.sdr) continue;

    // Check if already notified today
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        tipo: 'meta_batida',
        corpo: { contains: meta.sdr.name },
        enviada_at: { gte: today },
      },
    });
    if (alreadyNotified) continue;

    // Calculate current value based on meta type
    let currentValue = 0;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    if (meta.tipo === 'reunioes_semana') {
      currentValue = await prisma.interaction.count({
        where: {
          lead: { sdr_id: meta.sdr.id },
          type: 'REUNIAO',
          created_at: { gte: weekStart },
        },
      });
    } else if (meta.tipo === 'atividades_dia') {
      currentValue = await prisma.dailyTask.count({
        where: {
          sdr_id: meta.sdr.id,
          date: today,
          status: { not: 'PENDENTE' },
        },
      });
    }

    if (currentValue >= meta.valor) {
      await sendPushToRole('GESTOR', {
        tipo: 'meta_batida',
        titulo: 'Meta batida!',
        corpo: `${meta.sdr.name} atingiu a meta de ${meta.valor} ${meta.tipo.replace(/_/g, ' ')}!`,
        url: '/gestor',
      });
    }
  }

  logger.info('meta_batida: check completed');
}

async function handleRitmoRuim() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sdrs = await prisma.user.findMany({
    where: { role: 'SDR', active: true },
    select: { id: true, name: true },
  });

  for (const sdr of sdrs) {
    const total = await prisma.dailyTask.count({
      where: { sdr_id: sdr.id, date: today },
    });

    if (total === 0) continue;

    const done = await prisma.dailyTask.count({
      where: { sdr_id: sdr.id, date: today, status: { not: 'PENDENTE' } },
    });

    const pct = Math.round((done / total) * 100);

    if (pct < 30) {
      // Check if already notified today
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          tipo: 'ritmo_ruim',
          corpo: { contains: sdr.name },
          enviada_at: { gte: today },
        },
      });
      if (alreadyNotified) continue;

      await sendPushToRole('GESTOR', {
        tipo: 'ritmo_ruim',
        titulo: 'Ritmo abaixo do esperado',
        corpo: `${sdr.name} concluiu apenas ${pct}% das atividades de hoje`,
        url: '/gestor/sdrs',
      });
    }
  }

  logger.info('ritmo_ruim: check completed');
}

async function handleSdrDestaque() {
  const today = new Date();
  const lastMonday = new Date(today);
  lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6); // Previous Monday
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const sdrs = await prisma.user.findMany({
    where: { role: 'SDR', active: true },
    select: { id: true, name: true },
  });

  let topSdr = { name: '', count: 0 };

  for (const sdr of sdrs) {
    const reunioes = await prisma.interaction.count({
      where: {
        lead: { sdr_id: sdr.id },
        type: 'REUNIAO',
        created_at: { gte: lastMonday, lte: lastSunday },
      },
    });

    if (reunioes > topSdr.count) {
      topSdr = { name: sdr.name, count: reunioes };
    }
  }

  if (topSdr.count > 0) {
    await sendPushToRole('GESTOR', {
      tipo: 'sdr_destaque',
      titulo: 'SDR destaque da semana',
      corpo: `${topSdr.name} liderou com ${topSdr.count} reuniões na semana passada`,
      url: '/gestor/sdrs',
    });
  }

  logger.info(`sdr_destaque: ${topSdr.name} with ${topSdr.count} meetings`);
}

// ── Worker ──

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    switch (job.name) {
      case 'proximo_contato':
        await handleProximoContato();
        break;
      case 'steps_atrasados':
        await handleStepsAtrasados();
        break;
      case 'tier_a_parado':
        await handleTierAParado();
        break;
      case 'meta_batida':
        await handleMetaBatida();
        break;
      case 'ritmo_ruim':
        await handleRitmoRuim();
        break;
      case 'sdr_destaque':
        await handleSdrDestaque();
        break;
    }
  },
  { connection },
);

notificationWorker.on('error', (err) => {
  logger.error('Notification worker error:', err);
});

// ── Schedule repeatable jobs ──

export async function startNotificationWorker() {
  // Every 5 minutes: proximo_contato + steps_atrasados
  await notificationQueue.add('proximo_contato', {}, {
    repeat: { every: 5 * 60 * 1000 },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  await notificationQueue.add('steps_atrasados', {}, {
    repeat: { every: 5 * 60 * 1000 },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  // Daily at 9:00 — tier_a_parado
  await notificationQueue.add('tier_a_parado', {}, {
    repeat: { pattern: '0 9 * * *' },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  // Every hour — meta_batida
  await notificationQueue.add('meta_batida', {}, {
    repeat: { every: 60 * 60 * 1000 },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  // Daily at 14:00 on weekdays — ritmo_ruim
  await notificationQueue.add('ritmo_ruim', {}, {
    repeat: { pattern: '0 14 * * 1-5' },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  // Every Monday at 9:00 — sdr_destaque
  await notificationQueue.add('sdr_destaque', {}, {
    repeat: { pattern: '0 9 * * 1' },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  logger.info('Notification worker and scheduler started');

  return notificationWorker;
}
