import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'hugo@retente.com.br';

  console.log(`🚀 Elevando usuário ${email} para ADMIN em todas as suas memberships...`);

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.error('❌ Usuário não encontrado.');
    return;
  }

  const result = await prisma.membership.updateMany({
    where: {
      user_id: user.id
    },
    data: {
      role: 'ADMIN' as any
    }
  });

  console.log(`✅ ${result.count} memberships elevadas para ADMIN!`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
