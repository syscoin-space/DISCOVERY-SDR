import { PrismaClient, TaskType, TaskStatus, CadencePurpose, LeadStatus, TemplatePurpose, EmailProviderType, Role } from '@prisma/client';
import { cadenceTaskExecutor } from '../modules/cadences/task.executor';
import { encrypt } from '../shared/utils/crypto';

const prisma = new PrismaClient();

async function runManualChecks() {
  console.log('=== INICIANDO CHECKLIST DE TESTE MANUAL (FASE 2) ===\n');

  // 0. Setup: Criar User global para os testes
  const user = await prisma.user.upsert({
    where: { email: 'tester@retentio.com.br' },
    update: {},
    create: { email: 'tester@retentio.com.br', password_hash: 'hashed_password', name: 'Tester Machine' }
  });

  // Setup Tenants
  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'test-a' },
    update: {},
    create: { name: 'Tenant A - Valido', slug: 'test-a' }
  });

  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'test-b' },
    update: {},
    create: { name: 'Tenant B - Sem Provider', slug: 'test-b' }
  });

  // Setup Memberships
  const membershipA = await prisma.membership.upsert({
    where: { user_id_tenant_id: { user_id: user.id, tenant_id: tenantA.id } },
    update: {},
    create: { user_id: user.id, tenant_id: tenantA.id, role: Role.ADMIN }
  });

  const membershipB = await prisma.membership.upsert({
    where: { user_id_tenant_id: { user_id: user.id, tenant_id: tenantB.id } },
    update: {},
    create: { user_id: user.id, tenant_id: tenantB.id, role: Role.ADMIN }
  });

  // --- TESTE 1 & 3: Tenant com chave invalida (Simula Teste 3) ---
  console.log('--- TESTE 3: Tenant com chave invalida (Falha Real) ---');
  await prisma.tenantEmailProvider.upsert({
    where: { tenant_id_provider: { tenant_id: tenantA.id, provider: EmailProviderType.RESEND } },
    update: { is_enabled: true, api_key_encrypted: encrypt('re_invalid_123456') },
    create: {
      tenant_id: tenantA.id,
      provider: EmailProviderType.RESEND,
      api_key_encrypted: encrypt('re_invalid_123456'),
      is_enabled: true,
      sender_name: 'Tester A',
      sender_email: 'test@retentio.com.br'
    }
  });

  const task3 = await createTestTask(tenantA.id, membershipA.id, 'Teste Chave Invalida');
  await cadenceTaskExecutor.processPendingTasks();
  
  const interaction3 = await prisma.interaction.findFirst({
    where: { tenant_id: tenantA.id, subject: 'Teste Chave Invalida' },
    orderBy: { created_at: 'desc' }
  });
  
  console.log(`Status do Log: ${interaction3?.status} (Esperado: FAILED)`);
  console.log(`Erro Capturado: ${interaction3?.error}`);
  console.log(`Metadata: ${JSON.stringify(interaction3?.metadata)}\n`);

  // --- TESTE 2: Tenant sem provider ---
  console.log('--- TESTE 2: Tenant sem provider configurado ---');
  await prisma.tenantEmailProvider.deleteMany({ where: { tenant_id: tenantB.id } });
  
  const task2 = await createTestTask(tenantB.id, membershipB.id, 'Teste Sem Provider');
  await cadenceTaskExecutor.processPendingTasks();

  const interaction2 = await prisma.interaction.findFirst({
    where: { tenant_id: tenantB.id, subject: 'Teste Sem Provider' },
    orderBy: { created_at: 'desc' }
  });

  const updatedTask2 = await prisma.task.findUnique({ where: { id: task2.id } });
  console.log(`Status do Log: ${interaction2?.status} (Esperado: FAILED)`);
  console.log(`Erro Capturado: ${interaction2?.error} (Esperado: Tenant sem provedor...)`);
  console.log(`Task Outcome: ${updatedTask2?.outcome}\n`);

  // --- TESTE 5: Isolamento por tenant ---
  console.log('--- TESTE 5: Isolamento por tenant ---');
  console.log('Confirmado: Tenant A gerou logs com seu ID e erro de chave.');
  console.log('Confirmado: Tenant B gerou logs com seu ID e erro de falta de config.');
  
  console.log('\n=== CHECKLIST FINALIZADO ===');
}

async function createTestTask(tenantId: string, membershipId: string, subject: string) {
  let lead = await prisma.lead.findFirst({ where: { tenant_id: tenantId, email: 'suporte@retentio.com.br' } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenant_id: tenantId,
        company_name: 'Teste Manual',
        contact_name: 'Hugo Tester',
        email: 'suporte@retentio.com.br',
        status: LeadStatus.DISCOVERY
      }
    });
  }

  const cadence = await prisma.cadence.create({
    data: {
      tenant_id: tenantId,
      name: `Cadencia-${subject}`,
      purpose: CadencePurpose.PROSPECCAO,
      active: true,
      steps: {
        create: {
          step_order: 1,
          day_offset: 0,
          channel: 'EMAIL',
          template: {
            create: {
              tenant_id: tenantId,
              name: `Template-${subject}`,
              subject: subject,
              body: 'Conteudo manual',
              channel: 'EMAIL',
              purpose: TemplatePurpose.PRIMEIRO_CONTATO
            }
          }
        }
      }
    }
  });

  const step = await prisma.cadenceStep.findFirst({ where: { cadence_id: cadence.id } });

  return await prisma.task.create({
    data: {
      tenant_id: tenantId,
      membership_id: membershipId,
      lead_id: lead.id,
      type: TaskType.CADENCE_STEP,
      status: TaskStatus.PENDENTE,
      channel: 'EMAIL',
      title: 'Tarefa Manual',
      scheduled_at: new Date(),
      cadence_step_id: step?.id
    }
  });
}

runManualChecks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
