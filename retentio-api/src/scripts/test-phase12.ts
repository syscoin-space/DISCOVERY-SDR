import { prisma } from '../config/prisma';

async function seedAIPendingLead() {
  console.log('🤖 Seeding a Lead with a PENDING AI Suggestion for Phase 12 HIL Test');
  
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'discovery-demo' } });
  if (!tenant) {
    console.error('❌ Tenant not found');
    return;
  }

  const membership = await prisma.membership.findFirst({ where: { tenant_id: tenant.id } });

  const lead = await prisma.lead.create({
    data: {
      tenant_id: tenant.id,
      company_name: 'Stark Industries (HIL Test)',
      discovery_status: 'SEARCHING_DM',
      icp_score: 8,
      notes: 'Falei com o assistente, o CEO Tony (tony@stark.com) pediu pra retornar.',
      ai_metadata: {
        last_suggestion: {
          status: 'PENDING',
          suggested_status: 'DM_IDENTIFIED',
          intent_classification: 'Decisor mapeado com interesse futuro',
          confidence: 0.92,
          enrichment_data: {
            dm_name: 'Tony Stark',
            dm_role: 'CEO',
            direct_email: 'tony@stark.com'
          },
          summary: 'A IA identificou o CEO da empresa a partir da última nota do assistente.'
        }
      } as any
    }
  });



  console.log(`✅ Lead Criado: ${lead.company_name} (ID: ${lead.id})`);
  console.log(`➡️  Abra o Frontend no Kanban e clique em "Stark Industries (HIL Test)" para testar a revisão!`);
  process.exit(0);
}

seedAIPendingLead().catch(console.error);
