import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOnboarding() {
  console.log('🏁 Iniciando Fix de OnboardingState para produção...');

  const retentio = await prisma.tenant.findUnique({
    where: { slug: 'retentio' }
  });

  if (!retentio) {
    console.error('❌ Tenant Retentio não encontrado!');
    return;
  }

  // Garante que o estado de onboarding existe
  await prisma.onboardingState.upsert({
    where: { tenant_id: retentio.id },
    update: {
      tasks_completed: { company_setup: true, team_added: true, ai_setup: true },
      completed_at: new Date()
    },
    create: {
      tenant_id: retentio.id,
      tasks_completed: { company_setup: true, team_added: true, ai_setup: true },
      completed_at: new Date()
    }
  });

  console.log('✅ OnboardingState configurado como COMPLETED para Retentio.');

  // Garante branding padrão
  await prisma.tenant.update({
    where: { id: retentio.id },
    data: {
      onboarding_status: 'COMPLETED',
      onboarding_step: 3,
      branding: {
         primaryColor: '#000000',
         logoUrl: null
      }
    }
  });

  console.log('✅ Status do Tenant atualizado.');
}

fixOnboarding()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
