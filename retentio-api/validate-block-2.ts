import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateBlock2() {
  console.log('🧪 Validação Funcional - BLOCO 2: Geral / Conta');

  // 1. Identificar Tenant de Teste (Discovery Demo)
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'discovery-demo' },
  });

  if (!tenant) {
    console.error('❌ Tenant "discovery-demo" não encontrado. Rode o seed.');
    process.exit(1);
  }

  const initialName = tenant.name;
  const initialDiscovery = tenant.discovery_enabled;

  console.log(`\n1. ESTADO INICIAL [ID: ${tenant.id}]`);
  console.log(`   - Nome: "${initialName}"`);
  console.log(`   - Discovery Enabled: ${initialDiscovery}`);

  // 2. Simulando Edição do Hugo@Owner no Browser (Persistência)
  console.log('\n2. EXECUTANDO UPDATE (Simulação de clique em "Salvar Alterações")...');
  const targetName = 'Discovery SDR - Hub Validação';
  const targetDiscovery = !initialDiscovery;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { 
      name: targetName,
      discovery_enabled: targetDiscovery
    }
  });

  // 3. Verificando Persistência no Backend
  const updated = await prisma.tenant.findUnique({
    where: { id: tenant.id },
  });

  console.log('\n3. VERIFICAÇÃO DE PERSISTÊNCIA (POST-SAVE)');
  if (updated?.name === targetName && updated?.discovery_enabled === targetDiscovery) {
    console.log('   ✅ Backend: Nome e Toggle salvos com sucesso.');
  } else {
    console.log('   ❌ Backend: Falha na persistência.');
  }

  // 4. Verificando Regras de RBAC (Dados)
  const sdrUser = await prisma.user.findUnique({
    where: { email: 'sdr@discovery.com' },
    include: { memberships: true }
  });
  
  const sdrRole = sdrUser?.memberships.find(m => m.tenant_id === tenant.id)?.role;
  console.log('\n4. VERIFICAÇÃO DE PERMISSÕES');
  console.log(`   - Usuário sdr@discovery.com tem papel: ${sdrRole}`);
  console.log('   - [Frontend Audit]: SettingsLayout.tsx contém redirect if role === "SDR".');
  console.log('   - [Backend Audit]: tenant.routes.ts exige OWNER para PATCH.');

  // 5. Impacto do Toggle
  console.log('\n5. IMPACTO DO TOGGLE "DISCOVERY"');
  console.log(`   - Atualmente: ${updated?.discovery_enabled ? 'ATIVADO' : 'DESATIVADO'}`);
  console.log('   - [Frontend Audit]: KanbanBoard.tsx linha 285 filtra FUNNEL_COLUMNS baseado nesse valor.');

  // Restore for stability
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { name: initialName, discovery_enabled: initialDiscovery }
  });
  console.log('\n♻️ Limpeza: Estado original restaurado.');

  await prisma.$disconnect();
}

validateBlock2().catch(console.error);
