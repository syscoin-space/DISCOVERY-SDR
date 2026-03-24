import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenants() {
  const count = await prisma.tenant.count();
  const tenants = await prisma.tenant.findMany({ select: { name: true, slug: true } });
  
  console.log(`TOTAL TENANTS IN DB: ${count}`);
  console.log('TENANTS:', JSON.stringify(tenants, null, 2));
}

checkTenants()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
