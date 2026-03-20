import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verificando Dados Migrados...');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'retentio' },
    include: {
      memberships: {
        include: { user: true }
      },
      leads: true
    }
  });

  if (!tenant) {
    console.error('❌ Tenant "Retente" não encontrado!');
    return;
  }

  console.log(`✅ Tenant: ${tenant.name}`);
  console.log(`👥 Membros (${tenant.memberships.length}):`);
  tenant.memberships.forEach(m => {
    console.log(`   - ${m.user.name} (${m.role}) - ${m.user.email}`);
  });

  console.log(`📦 Leads (${tenant.leads.length}):`);
  const sdrMap = new Map();
  tenant.memberships.forEach(m => sdrMap.set(m.id, m.user.name));

  tenant.leads.forEach(l => {
    const ownerName = l.sdr_id ? sdrMap.get(l.sdr_id) : 'POOL';
    console.log(`   - [${l.status}] ${l.company_name} (SDR: ${ownerName})`);
  });

  const hugo = tenant.memberships.find(m => m.user.name === 'Hugo');
  if (hugo && hugo.role === 'OWNER') {
    console.log('✅ Hugo validado como OWNER.');
  } else {
    console.error('❌ Problema com Hugo!');
  }

  const vitoria = tenant.memberships.find(m => m.user.name === 'Vitória');
  if (vitoria && vitoria.role === 'SDR') {
    console.log('✅ Vitória validada como SDR.');
  } else {
    console.error('❌ Problema com Vitória!');
  }
}

verify()
  .finally(async () => {
    await prisma.$disconnect();
  });
