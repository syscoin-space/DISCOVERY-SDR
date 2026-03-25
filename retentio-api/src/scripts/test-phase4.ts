import { PrismaClient, InteractionType, InteractionSource } from '@prisma/client';
import { emailMetricsService } from '../modules/email/email-metrics.service';
import { leadService } from '../modules/leads/lead.service';

const prisma = new PrismaClient();

async function runPhase4Tests() {
  console.log('=== INICIANDO VALIDAÇÃO FUNCIONAL (FASE 4 - BACKEND) ===\n');

  // 1. Setup: Pegar um tenant e lead existentes (ou criar)
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'test-phase3' } });
  if (!tenant) throw new Error('Tenant test-phase3 não encontrado. Execute o teste da Fase 3 primeiro.');

  const lead = await prisma.lead.findFirst({ where: { tenant_id: tenant.id } });
  if (!lead) throw new Error('Lead de teste não encontrado.');

  // 2. Testar Lead Enrichment (Timeline)
  console.log('--- TESTE 1: Enriquecimento da Timeline ---');
  const enrichedLead = await leadService.getById(lead.id, tenant.id);
  const interaction = enrichedLead.interactions.find(i => i.type === InteractionType.EMAIL);
  
  if (interaction) {
    console.log(`Interação EMAIL encontrada: ${interaction.id}`);
    console.log(`Eventos vinculados: ${interaction.email_events?.length || 0}`);
    if (interaction.email_events?.length) {
      console.log(`Primeiro evento: ${interaction.email_events[0].type}`);
    }
  } else {
    console.warn('Nenhuma interação de e-mail encontrada para o lead.');
  }

  // 3. Testar Métricas Globais
  console.log('\n--- TESTE 2: Métricas Globais do Tenant ---');
  const metrics = await emailMetricsService.getTenantMetrics(tenant.id);
  console.log('Métricas do Tenant:', JSON.stringify(metrics, null, 2));

  // 4. Testar Métricas por Cadência
  console.log('\n--- TESTE 3: Performance por Cadência ---');
  const performance = await emailMetricsService.listCadencePerformance(tenant.id);
  console.log(`Cadências avaliadas: ${performance.length}`);
  performance.forEach(c => {
    console.log(`- ${c.name}: Sent=${c.metrics.totalSent}, OpenRate=${c.metrics.openRate.toFixed(2)}%`);
  });

  console.log('\n=== VALIDAÇÃO BACKEND FINALIZADA ===');
}

runPhase4Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
