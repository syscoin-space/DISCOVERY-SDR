import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding V2 database...');

  // ─── Tenant ────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'discovery-demo' },
    update: {},
    create: {
      name: 'Discovery Demo',
      slug: 'discovery-demo',
      plan: 'standard',
      discovery_enabled: true,
      branding: {
        app_name: 'Discovery SDR',
        color_accent: '#2E86AB',
      },
    },
  });
  console.log(`  ✅ Tenant: ${tenant.name} (${tenant.id})`);

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
