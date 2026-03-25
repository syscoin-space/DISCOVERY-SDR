import { PrismaClient, InteractionType, InteractionSource, EmailProviderType } from '@prisma/client';
import axios from 'axios';
import { logger } from '../config/logger';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3002/api/webhooks/email/resend';

async function runPhase3Tests() {
  console.log('=== INICIANDO VALIDAÇÃO FUNCIONAL (FASE 3) ===\n');

  // 1. Setup: Criar Tenant, Lead e Interação
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'test-phase3' },
    update: {},
    create: { name: 'Tenant Phase 3', slug: 'test-phase3' }
  });

  const lead = await prisma.lead.upsert({
    where: { email_tenant_id: { email: 'prospect@example.com', tenant_id: tenant.id } },
    update: {},
    create: {
      tenant_id: tenant.id,
      company_name: 'Lead Phase 3',
      contact_name: 'Prospect Ph3',
      email: 'prospect@example.com',
      status: 'DISCOVERY'
    }
  });

  const externalId = `re_test_${Date.now()}`;
  const interaction = await prisma.interaction.create({
    data: {
      tenant_id: tenant.id,
      lead_id: lead.id,
      type: InteractionType.EMAIL,
      source: InteractionSource.CADENCIA,
      channel: 'EMAIL',
      external_id: externalId,
      subject: 'Teste Phase 3',
      status: 'SENT'
    }
  });

  console.log(`Setup concluído. Interaction ID: ${interaction.id}, External ID: ${externalId}`);

  // 2. Simular Evento de Entrega (Delivered)
  console.log('\n--- TESTE 1: Evento de Entrega (Delivered) ---');
  await simulateWebhook({
    id: `evt_del_${Date.now()}`,
    type: 'email.delivered',
    data: { id: externalId, to: ['prospect@example.com'], created_at: new Date().toISOString() }
  });

  const eventDel = await prisma.emailEvent.findFirst({ where: { external_message_id: externalId, type: 'email.delivered' } });
  const updatedIntDel = await prisma.interaction.findUnique({ where: { id: interaction.id } });
  
  console.log(`Evento persistido: ${!!eventDel}`);
  console.log(`Status da Interação: ${updatedIntDel?.status} (Esperado: DELIVERED)`);

  // 3. Simular Evento de Abertura (Opened)
  console.log('\n--- TESTE 2: Evento de Abertura (Opened) ---');
  await simulateWebhook({
    id: `evt_open_${Date.now()}`,
    type: 'email.opened',
    data: { id: externalId, to: ['prospect@example.com'], created_at: new Date().toISOString() }
  });

  const eventOpen = await prisma.emailEvent.findFirst({ where: { external_message_id: externalId, type: 'email.opened' } });
  const updatedIntOpen = await prisma.interaction.findUnique({ where: { id: interaction.id } });
  
  console.log(`Evento persistido: ${!!eventOpen}`);
  console.log(`Status da Interação: ${updatedIntOpen?.status} (Esperado: OPENED)`);

  // 4. Testar Idempotência (Mesmo evento de abertura novamente)
  console.log('\n--- TESTE 3: Idempotência (Evento Duplicado) ---');
  const duplicateId = `evt_dup_${Date.now()}`;
  await simulateWebhook({ id: duplicateId, type: 'email.opened', data: { id: externalId } });
  await simulateWebhook({ id: duplicateId, type: 'email.opened', data: { id: externalId } });

  const eventCount = await prisma.emailEvent.count({ where: { provider_event_id: duplicateId } });
  console.log(`Contagem de eventos com o mesmo ID: ${eventCount} (Esperado: 1)`);

  // 5. Testar Isolamento por Tenant (Evento para ID inexistente)
  console.log('\n--- TESTE 4: Evento Sem Correspondência ---');
  const unknownId = 're_unknown_999';
  await simulateWebhook({ id: `evt_unk_${Date.now()}`, type: 'email.opened', data: { id: unknownId } });
  
  const unknownEvent = await prisma.emailEvent.findFirst({ where: { external_message_id: unknownId } });
  console.log(`Evento persistido para ID desconhecido: ${!!unknownEvent} (Esperado: false)`);

  console.log('\n=== VALIDAÇÃO FINALIZADA ===');
}

async function simulateWebhook(payload: any) {
  try {
    const response = await axios.post(API_URL, payload);
    console.log(`Webhook enviado. Status: ${response.status}`);
  } catch (error: any) {
    console.error(`Erro ao enviar webhook: ${error.message}`);
  }
}

runPhase3Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
