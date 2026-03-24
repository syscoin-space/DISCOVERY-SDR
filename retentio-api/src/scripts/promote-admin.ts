/**
 * promote-admin.ts
 *
 * Script idempotente para promover um usuário existente a ADMIN.
 *
 * Uso:
 *   npx tsx src/scripts/promote-admin.ts <email>
 *
 * Funciona assim:
 *   1. Recebe o e-mail como argumento
 *   2. Localiza o user no banco
 *   3. Localiza o membership mais recente do user
 *   4. Atualiza o role para ADMIN (se já não for)
 *   5. Se não tiver membership, cria um no primeiro tenant ativo
 *   6. Idempotente: rodar N vezes não duplica nada
 *
 * Requer: DATABASE_URL configurado no .env ou env vars
 */

import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Uso: npx tsx src/scripts/promote-admin.ts <email>');
    console.error('   Exemplo: npx tsx src/scripts/promote-admin.ts hugo@retentio.com.br');
    process.exit(1);
  }

  console.log(`\n🔍 Buscando usuário: ${email}\n`);

  // 1. Localizar o user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ Usuário não encontrado: ${email}`);

    // Listar users disponíveis para ajudar
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, id: true },
      take: 20,
    });
    console.log('\n📋 Usuários disponíveis:');
    allUsers.forEach((u) => console.log(`   - ${u.email} (${u.name})`));

    process.exit(1);
  }

  console.log(`✅ Usuário encontrado: ${user.name} (${user.id})`);

  // 2. Localizar memberships existentes
  const memberships = await prisma.membership.findMany({
    where: { user_id: user.id },
    include: { tenant: { select: { id: true, name: true, slug: true, active: true } } },
    orderBy: { created_at: 'desc' },
  });

  if (memberships.length === 0) {
    console.log('⚠️  Nenhum membership encontrado. Criando um...');

    // Pegar o primeiro tenant ativo
    const tenant = await prisma.tenant.findFirst({
      where: { active: true },
      orderBy: { created_at: 'asc' },
    });

    if (!tenant) {
      console.error('❌ Nenhum tenant ativo encontrado no banco.');
      process.exit(1);
    }

    const membership = await prisma.membership.create({
      data: {
        user_id: user.id,
        tenant_id: tenant.id,
        role: Role.ADMIN,
      },
    });

    console.log(`✅ Membership criado: ${membership.id}`);
    console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`   Role: ADMIN`);
  } else {
    // 3. Promover o membership mais recente
    const membership = memberships[0];

    if (membership.role === Role.ADMIN) {
      console.log(`ℹ️  Já é ADMIN no tenant "${membership.tenant.name}" — nada a fazer.`);
    } else {
      console.log(`   Role atual: ${membership.role}`);
      console.log(`   Tenant: ${membership.tenant.name} (${membership.tenant.slug})`);

      await prisma.membership.update({
        where: { id: membership.id },
        data: { role: Role.ADMIN },
      });

      console.log(`✅ Promovido para ADMIN`);
    }

    // Listar todos os memberships do user
    if (memberships.length > 1) {
      console.log(`\n📋 Outros memberships deste user:`);
      memberships.slice(1).forEach((m) => {
        console.log(`   - ${m.tenant.name} (${m.role})`);
      });
    }
  }

  // 4. Confirmar estado final
  const finalMembership = await prisma.membership.findFirst({
    where: { user_id: user.id, role: Role.ADMIN },
    include: { tenant: { select: { name: true, slug: true } } },
  });

  if (finalMembership) {
    console.log(`\n🎉 Resultado final:`);
    console.log(`   Email: ${email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ADMIN`);
    console.log(`   Tenant: ${finalMembership.tenant.name}`);
    console.log(`   Membership ID: ${finalMembership.id}`);
    console.log(`\n   Use este email + senha para logar como admin.\n`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
