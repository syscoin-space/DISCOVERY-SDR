import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function validateBlock4() {
  console.log('🧪 Validação Funcional - BLOCO 4: Equipe');

  // 1. Identificar Tenant e Membros
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'discovery-demo' },
    include: { memberships: { include: { user: true } } }
  });

  if (!tenant) {
    console.error('❌ Tenant não encontrado.');
    process.exit(1);
  }

  console.log(`\n1. MEMBROS ATIVOS [Tenant: ${tenant.name}]`);
  tenant.memberships.forEach(m => {
    console.log(`   - ${m.user.name} (${m.user.email}) -> Role: ${m.role}`);
  });

  // 2. Simulando Convite
  console.log('\n2. EXECUTANDO CONVITE (Simulação)...');
  const inviteEmail = 'novo-gestor@discovery.com';
  const inviteRole = Role.MANAGER;

  const invitation = await prisma.membershipInvitation.create({
    data: {
      tenant_id: tenant.id,
      email: inviteEmail,
      role: inviteRole,
      token: 'test-token-' + Date.now(),
      expires_at: new Date(Date.now() + 86400000),
    }
  });

  console.log(`   ✅ Convite criado para ${inviteEmail} como ${inviteRole}.`);

  // 3. Verificando Listagem de Convites
  const pending = await prisma.membershipInvitation.findMany({
    where: { tenant_id: tenant.id, status: 'PENDING' }
  });
  console.log(`   - Convites Pendentes no DB: ${pending.length}`);

  // 4. Simulando Cancelamento
  console.log('\n4. EXECUTANDO CANCELAMENTO DE CONVITE...');
  await prisma.membershipInvitation.delete({
    where: { id: invitation.id }
  });
  console.log('   ✅ Convite cancelado e removido do DB.');

  // 5. Simulando Mudança de Role
  const sdrMembership = tenant.memberships.find(m => m.role === Role.SDR);
  if (sdrMembership) {
    console.log(`\n5. ALTERANDO PAPEL DE ${sdrMembership.user.name} (SDR -> MANAGER)...`);
    await prisma.membership.update({
      where: { id: sdrMembership.id },
      data: { role: Role.MANAGER }
    });
    
    const updatedM = await prisma.membership.findUnique({ where: { id: sdrMembership.id } });
    console.log(`   ✅ Novo papel: ${updatedM?.role}`);

    // Cleanup: Restore SDR role
    await prisma.membership.update({
      where: { id: sdrMembership.id },
      data: { role: Role.SDR }
    });
  }

  await prisma.$disconnect();
}

validateBlock4().catch(console.error);
