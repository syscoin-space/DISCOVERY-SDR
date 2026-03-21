import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  const email = 'hugo@syscoin.com.br';
  const rawPassword = 'Padrao123#';

  console.log(`🔍 Testando autenticação interna para: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true }
  });

  if (!user) {
    console.error('❌ Usuário não encontrado no banco!');
    return;
  }

  console.log(`✅ Usuário encontrado. Active: ${user.active}`);
  console.log(`📊 Memberships: ${user.memberships.length}`);

  const isValid = await compare(rawPassword, user.password_hash);
  
  if (isValid) {
    console.log('✅ SENHA CORRETA! O hashing está funcionando perfeitamente.');
    
    const membership = user.memberships.find(m => m.active);
    if (membership) {
        console.log(`✅ Membership Ativo encontrado: Role=${membership.role}, TenantID=${membership.tenant_id}`);
    } else {
        console.error('❌ Nenhum Membership ATIVO encontrado!');
    }
  } else {
    console.error('❌ SENHA INCORRETA! O hash no banco não condiz com "Padrao123#".');
    console.log(`Hash no banco: ${user.password_hash}`);
  }
}

testAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
