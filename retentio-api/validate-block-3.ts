import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateBlock3() {
  console.log('🧪 Validação Funcional - BLOCO 3: Marca');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'discovery-demo' },
  });

  if (!tenant) {
    console.error('❌ Tenant não encontrado.');
    process.exit(1);
  }

  const initialBranding = (tenant.branding as any) || {};

  console.log('\n1. ESTADO INICIAL');
  console.log(`   - App Name: "${initialBranding.app_name || 'N/A'}"`);
  console.log(`   - Accent Color: ${initialBranding.color_accent || 'N/A'}`);

  // 2. Simulando Edição de Marca
  console.log('\n2. EXECUTANDO UPDATE (Simulação de clique em "Salvar Marca")...');
  const targetName = 'Discovery SDR - Validação Branding';
  const targetColor = '#FF5733';

  const newBranding = {
    ...initialBranding,
    app_name: targetName,
    color_accent: targetColor
  };

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { branding: newBranding }
  });

  // 3. Verificando Persistência
  const updated = await prisma.tenant.findUnique({
    where: { id: tenant.id },
  });
  const updatedBranding = (updated?.branding as any) || {};

  console.log('\n3. VERIFICAÇÃO DE PERSISTÊNCIA');
  if (updatedBranding.app_name === targetName && updatedBranding.color_accent === targetColor) {
    console.log('   ✅ Backend: Branding salvo com sucesso.');
  } else {
    console.log('   ❌ Backend: Falha na persistência.');
  }

  // Restore
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { branding: initialBranding }
  });
  console.log('\n♻️ Limpeza: Branding original restaurado.');

  await prisma.$disconnect();
}

validateBlock3().catch(console.error);
