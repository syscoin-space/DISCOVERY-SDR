import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAuth() {
  console.log('🔑 Iniciando Reset de Acessos e Usuários (Retentio V2)...');

  // 1. Garantir Planos
  const standardPlan = await prisma.plan.upsert({
    where: { key: 'STANDARD' },
    update: {},
    create: {
      name: 'Standard',
      key: 'STANDARD',
      description: 'Plano ideal para times pequenos',
      price_monthly: 490,
      limits: { sdr: 3, closer: 1, leads_monthly: 500 },
      features: { ai_guidance: true, multi_provider_ai: false, advanced_dashboard: false }
    }
  });

  const proPlan = await prisma.plan.upsert({
    where: { key: 'PRO' },
    update: {},
    create: {
      name: 'Pro',
      key: 'PRO',
      description: 'Escala total para times de alta performance',
      price_monthly: 990,
      limits: { sdr: 10, closer: 5, leads_monthly: 5000 },
      features: { ai_guidance: true, multi_provider_ai: true, advanced_dashboard: true }
    }
  });

  // 2. Garantir Tenant Retentio
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'retentio' },
    update: {
      name: 'Retentio',
      plan_id: standardPlan.id,
    },
    create: {
      name: 'Retentio',
      slug: 'retentio',
      discovery_enabled: true,
      plan_id: standardPlan.id,
      onboarding_status: 'COMPLETED',
      onboarding_step: 3,
    },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  // 3. Garantir Assinatura Ativa (Standard)
  await prisma.subscription.upsert({
    where: { tenant_id: tenant.id },
    update: { status: SubscriptionStatus.TRIAL },
    create: {
      tenant_id: tenant.id,
      plan_id: standardPlan.id,
      status: SubscriptionStatus.TRIAL,
      gateway_customer_id: 'cus_manual_reset'
    }
  });
  console.log('✅ Assinatura Trial vinculada ao Tenant.');

  // 4. Configurar Usuários solicitados
  const passwordHash = await hash('Padrao123#', 10);
  
  const users = [
    { email: 'hugo@syscoin.com.br', name: 'Hugo', role: Role.OWNER },
    { email: 'atendimento@retentio.com.br', name: 'Atendimento', role: Role.MANAGER },
    { email: 'vitoria@syscoin.com.br', name: 'Vitória', role: Role.SDR },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { 
        name: u.name,
        password_hash: passwordHash,
        active: true
      },
      create: {
        email: u.email,
        name: u.name,
        password_hash: passwordHash,
      },
    });

    await prisma.membership.upsert({
      where: { user_id_tenant_id: { user_id: user.id, tenant_id: tenant.id } },
      update: { 
        role: u.role,
        active: true 
      },
      create: {
        user_id: user.id,
        tenant_id: tenant.id,
        role: u.role,
      },
    });
    console.log(`✅ Usuário configurado: ${u.email} como ${u.role}`);
  }

  console.log('\n🏁 Reset concluído com sucesso!');
}

resetAuth()
  .catch((e) => {
    console.error('❌ Erro no reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
