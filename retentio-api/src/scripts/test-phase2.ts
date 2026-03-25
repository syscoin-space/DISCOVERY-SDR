import { PrismaClient, TaskType, TaskStatus, CadencePurpose, LeadStatus, TemplatePurpose } from '@prisma/client';
import { cadenceTaskExecutor } from '../modules/cadences/task.executor';

const prisma = new PrismaClient();

async function testPhase2() {
  console.log('--- Iniciando Teste Funcional Fase 2 ---');

  // 1. Busca um tenant com email configurado
  const tenant = await prisma.tenant.findFirst({
    where: { email_providers: { some: { is_enabled: true } } },
    include: { email_providers: true }
  });

  if (!tenant) {
    console.error('❌ Erro: Nenhum tenant com e-mail configurado encontrado. Configure um via UI primeiro.');
    return;
  }

  console.log(`Tenant selecionado: ${tenant.name} (${tenant.slug})`);

  // 2. Cria um lead de teste se não houver
  let lead = await prisma.lead.findFirst({ where: { tenant_id: tenant.id, email: 'suporte@retentio.com.br' } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenant_id: tenant.id,
        company_name: 'Teste Fase 2',
        contact_name: 'Hugo Testador',
        email: 'suporte@retentio.com.br',
        status: LeadStatus.DISCOVERY,
      }
    });
  }

  // 3. Cria uma cadence e um passo de e-mail se não houver
  let cadence = await prisma.cadence.findFirst({ where: { tenant_id: tenant.id, name: 'Teste Automatizado' } });
  if (!cadence) {
    cadence = await prisma.cadence.create({
      data: {
        tenant_id: tenant.id,
        name: 'Teste Automatizado',
        purpose: CadencePurpose.PROSPECCAO,
        active: true,
        steps: {
          create: {
            step_order: 1,
            day_offset: 0,
            channel: 'EMAIL',
            template: {
              create: {
                tenant_id: tenant.id,
                name: 'Template Teste 2',
                subject: 'Ola {{first_name}}! Teste de Fase 2',
                body: '<p>Este e um e-mail real enviado via automacao multi-tenant!</p>',
                channel: 'EMAIL',
                purpose: TemplatePurpose.PRIMEIRO_CONTATO
              }
            }
          }
        }
      }
    });
  }

  // 4. Cria uma tarefa pendente agendada para AGORA
  const task = await prisma.task.create({
    data: {
      tenant_id: tenant.id,
      membership_id: (await prisma.membership.findFirst({ where: { tenant_id: tenant.id } }))?.id || '',
      lead_id: lead.id,
      type: TaskType.CADENCE_STEP,
      status: TaskStatus.PENDENTE,
      title: 'Teste Envio Real',
      channel: 'EMAIL',
      scheduled_at: new Date(),
      cadence_step_id: (await prisma.cadenceStep.findFirst({ where: { cadence_id: cadence.id } }))?.id
    }
  });

  console.log(`Tarefa criada: ${task.id}. Executando TaskExecutor...`);

  // 5. Roda o Executor
  await cadenceTaskExecutor.processPendingTasks();

  // 6. Verifica resultados
  const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
  const log = await prisma.interaction.findFirst({
    where: { tenant_id: tenant.id, lead_id: lead.id },
    orderBy: { created_at: 'desc' }
  });

  console.log('--- Resultados ---');
  console.log(`Status da Task: ${updatedTask?.status} (Expected: CONCLUIDA se sucesso)`);
  console.log(`Resultado da Task: ${updatedTask?.outcome}`);
  console.log(`Log de Interação: ${log ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
  if (log) {
    console.log(`Status do Log: ${log.status}`);
    console.log(`External ID: ${log.external_id}`);
    console.log(`Erro: ${log.error || 'Nenhum'}`);
  }

  if (updatedTask?.status === TaskStatus.CONCLUIDA && log?.status === 'SENT') {
    console.log('✅ TESTE PASSOU!');
  } else {
    console.log('⚠️ TESTE FALHOU OU REQUIER CONFIGURAÇÃO.');
  }
}

testPhase2()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
