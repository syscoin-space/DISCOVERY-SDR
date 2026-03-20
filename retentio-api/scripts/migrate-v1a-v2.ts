import { PrismaClient, Role, LeadStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
// @ts-ignore
import * as fs from 'fs';
// @ts-ignore
import * as path from 'path';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Iniciando Migração Seletiva V1A -> V2...');

  // 1. Garantir Tenant Retentio
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'retentio' },
    update: {
      name: 'Retentio',
    },
    create: {
      name: 'Retentio',
      slug: 'retentio',
      discovery_enabled: true,
      // @ts-ignore
      onboarding_status: 'PENDING',
      onboarding_step: 0,
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Garantir Usuários Hugo e Vitória (Preservando e-mails reais conforme solicitado)
  const passwordHash = await hash('Retentio@2026', 10);

  const userData = [
    { email: 'hugo@retente.com.br', name: 'Hugo', role: Role.OWNER },
    { email: 'vitoria@retente.com.br', name: 'Vitória', role: Role.SDR },
  ];

  const memberships: any = {};

  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: {
        email: u.email,
        name: u.name,
        password_hash: passwordHash,
      },
    });

    const membership = await prisma.membership.upsert({
      where: { user_id_tenant_id: { user_id: user.id, tenant_id: tenant.id } },
      update: { role: u.role },
      create: {
        user_id: user.id,
        tenant_id: tenant.id,
        role: u.role,
      },
    });

    memberships[u.name.toLowerCase()] = membership.id;
    console.log(`✅ Usuário/Membership: ${u.name} (${u.email}) as ${u.role}`);
  }

  // 3. Migrar Leads (se houver arquivo de input)
  const leadsPath = '/Users/hugocandido/Discovery-SDR/retentio-api/scripts/v1a_leads.json';
  if (fs.existsSync(leadsPath)) {
    const leadsRaw = fs.readFileSync(leadsPath, 'utf-8');
    const leads = JSON.parse(leadsRaw);

    console.log(`📦 Processando ${leads.length} leads...`);

    let imported = 0;
    let skipped = 0;

    const statusMapping: Record<string, LeadStatus> = {
      'CONTA_FRIA': LeadStatus.CONTA_FRIA,
      'EM_PROSPECCAO': LeadStatus.EM_PROSPECCAO,
      'REUNIAO_AGENDADA': LeadStatus.REUNIAO_MARCADA,
      'OPORTUNIDADE_QUALIFICADA': LeadStatus.FOLLOW_UP,
      'NUTRICAO': LeadStatus.BANCO,
      'SEM_PERFIL': LeadStatus.PERDIDO,
    };

    for (const l of leads) {
      try {
        const targetStatus = statusMapping[l.status] || LeadStatus.BANCO;
        const ownerName = l.owner_name?.toLowerCase();
        const sdrId = memberships[ownerName] || memberships['vitoria'] || memberships['hugo'];

        await prisma.lead.upsert({
          where: { 
            email_tenant_id: { 
              email: l.email, 
              tenant_id: tenant.id 
            } 
          },
          update: {
            status: targetStatus,
            company_name: l.company || l.company_name,
            domain: l.domain,
            phone: l.phone,
            whatsapp: l.whatsapp,
            contact_name: l.name || l.contact_name,
            contact_role: l.contact_role,
            notes: l.notes || l.notes_import,
            sdr_id: sdrId,
          },
          create: {
            tenant_id: tenant.id,
            email: l.email,
            domain: l.domain,
            company_name: l.company || l.company_name,
            status: targetStatus,
            phone: l.phone,
            whatsapp: l.whatsapp,
            contact_name: l.name || l.contact_name,
            contact_role: l.contact_role,
            notes: l.notes || l.notes_import,
            sdr_id: sdrId,
          },
        });
        imported++;
      } catch (err) {
        console.error(`❌ Erro ao migrar lead ${l.email}:`, err);
        skipped++;
      }
    }
    console.log(`✨ Resumo Leads: ${imported} migrados, ${skipped} falhas.`);
  } else {
    console.log('⚠️ Arquivo v1a_leads.json não encontrado. Pulando migração de leads.');
  }

  console.log('\n🏁 Migração concluída!');
}

migrate()
  .catch((e) => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
