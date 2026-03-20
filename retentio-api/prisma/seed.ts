import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding V2 database...');

  // ─── Plans ──────────────────────────────────────────────────
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

  console.log('  ✅ Plans created (Standard, Pro)');

  // ─── Tenant ────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'discovery-demo' },
    update: {
      plan_id: standardPlan.id,
      onboarding_status: 'COMPLETED',
      onboarding_step: 3
    },
    create: {
      name: 'Discovery Demo',
      slug: 'discovery-demo',
      discovery_enabled: true,
      plan_id: standardPlan.id,
      onboarding_status: 'COMPLETED',
      onboarding_step: 3,
      branding: {
        app_name: 'Discovery SDR',
        color_accent: '#2E86AB',
      },
    },
  });

  // ─── Subscription ──────────────────────────────────────────
  await prisma.subscription.upsert({
    where: { tenant_id: tenant.id },
    update: {},
    create: {
      tenant_id: tenant.id,
      plan_id: standardPlan.id,
      status: 'ACTIVE',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  // ─── Onboarding State ──────────────────────────────────────
  await prisma.onboardingState.upsert({
    where: { tenant_id: tenant.id },
    update: {},
    create: {
      tenant_id: tenant.id,
      tasks_completed: { company_setup: true, team_added: true, ai_setup: true }
    }
  });

  console.log(`  ✅ Tenant & Subscription: ${tenant.name} (${tenant.id})`);

  // ─── Users ─────────────────────────────────────────────────
  const passwordHash = await hash('123456', 10);

  const users = [
    { email: 'owner@discovery.com', name: 'Hugo (Owner)', role: Role.OWNER, capacity: null },
    { email: 'manager@discovery.com', name: 'Manager Demo', role: Role.MANAGER, capacity: null },
    { email: 'sdr@discovery.com', name: 'SDR Demo', role: Role.SDR, capacity: 80 },
    { email: 'closer@discovery.com', name: 'Closer Demo', role: Role.CLOSER, capacity: null },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password_hash: passwordHash,
        name: u.name,
      },
    });

    const membership = await prisma.membership.upsert({
      where: { user_id_tenant_id: { user_id: user.id, tenant_id: tenant.id } },
      update: {},
      create: {
        user_id: user.id,
        tenant_id: tenant.id,
        role: u.role,
        capacity: u.capacity,
      },
    });

    console.log(`  ✅ ${u.role}: ${u.name} (${user.id}) → membership ${membership.id}`);
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
