import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'hugo@retente.com.br';
  const tenantId = '5c7c3e4a-6d8a-44c4-84dc-6e669a689a45';

  console.log(`🚀 Elevando usuário ${email} para ADMIN no Tenant Retentio...`);

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.error('❌ Usuário não encontrado.');
    return;
  }

  const membership = await prisma.membership.update({
    where: {
      user_id_tenant_id: {
        user_id: user.id,
        tenant_id: tenantId
      }
    },
    data: {
      role: 'ADMIN' as any
    }
  });

  console.log('✅ Usuário agora é ADMIN!');
  console.log('Membership atualizada:', membership.id);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
