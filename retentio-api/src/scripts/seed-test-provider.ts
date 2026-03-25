import { PrismaClient, EmailProviderType } from '@prisma/client';
import { encrypt } from '../shared/utils/crypto';

const prisma = new PrismaClient();

async function seedTestProvider() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'retentio' } });
  if (!tenant) {
    console.error('Tenant "retentio" not found');
    return;
  }

  const encryptedKey = encrypt('re_test_123456789');
  
  await prisma.tenantEmailProvider.upsert({
    where: { 
      tenant_id_provider: {
        tenant_id: tenant.id,
        provider: EmailProviderType.RESEND
      }
    },
    create: {
      tenant_id: tenant.id,
      provider: EmailProviderType.RESEND,
      api_key_encrypted: encryptedKey,
      is_enabled: true,
      sender_name: 'Retentio System',
      sender_email: 'no-reply@retentio.com.br'
    },
    update: {
      api_key_encrypted: encryptedKey,
      is_enabled: true
    }
  });

  console.log('✅ Test provider seeded for "retentio" tenant.');
}

seedTestProvider()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
