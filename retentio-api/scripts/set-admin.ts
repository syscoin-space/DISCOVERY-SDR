import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'hugo@syscoin.com.br';
  const tenantId = 'b16868db-7dc7-4589-9ae6-9ece6edb4842';

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
      role: Role.ADMIN
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
