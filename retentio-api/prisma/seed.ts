import { PrismaClient, Role, PrrTier } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Usuários ──
  const defaultHash = await hash('Padrao123#', 12);

  const gestor = await prisma.user.upsert({
    where: { email: 'hugo@syscoin.com.br' },
    update: {},
    create: {
      email: 'hugo@syscoin.com.br',
      password_hash: defaultHash,
      name: 'Hugo Cândido',
      role: Role.GESTOR,
    },
  });

  const sdr1 = await prisma.user.upsert({
    where: { email: 'vitoria@retentio.com.br' },
    update: {},
    create: {
      email: 'vitoria@retentio.com.br',
      password_hash: defaultHash,
      name: 'Vitória',
      role: Role.SDR,
    },
  });

  // ── PRR Weights ──
  const dimensions = [
    { dimension: 'base_size', weight: 0.25, min_value: 0, max_value: 500000 },
    { dimension: 'recompra_cycle', weight: 0.20, min_value: 7, max_value: 180 },
    { dimension: 'avg_ticket', weight: 0.20, min_value: 0, max_value: 5000 },
    { dimension: 'inactive_base', weight: 0.15, min_value: 0, max_value: 1 },
    { dimension: 'integrability', weight: 0.20, min_value: 1, max_value: 5 },
  ];
  for (const d of dimensions) {
    await prisma.prrWeight.upsert({
      where: { dimension: d.dimension },
      update: d,
      create: d,
    });
  }

  // ── ICP Criteria ──
  const criteria = [
    { order: 1, label: 'Tem plataforma de e-commerce?', type: 'boolean' },
    { order: 2, label: 'Plataforma tem API aberta?', type: 'boolean' },
    { order: 3, label: 'Base de clientes > 5.000?', type: 'boolean' },
    { order: 4, label: 'Ticket médio > R$ 100?', type: 'boolean' },
    { order: 5, label: 'Ciclo de recompra < 90 dias?', type: 'boolean' },
    { order: 6, label: 'Tem programa de fidelidade?', type: 'boolean' },
    { order: 7, label: 'Investe em marketing digital?', type: 'boolean' },
    { order: 8, label: 'Tem equipe de CRM/Retenção?', type: 'select', options: ['Sim', 'Não', 'Parcialmente'] },
    { order: 9, label: 'Volume de transações mensais', type: 'scale' },
    { order: 10, label: 'Dor de retenção identificada?', type: 'boolean' },
    { order: 11, label: 'Budget disponível este quarter?', type: 'select', options: ['Sim', 'Não', 'Indefinido'] },
    { order: 12, label: 'Decision maker acessível?', type: 'boolean' },
    { order: 13, label: 'Operação multi-canal (loja física + online)?', type: 'boolean' },
    { order: 14, label: 'Timing de compra favorável?', type: 'select', options: ['Urgente', 'Próximo quarter', 'Indefinido'] },
  ];
  for (const c of criteria) {
    const existing = await prisma.icpCriteria.findFirst({ where: { order: c.order } });
    if (existing) {
      await prisma.icpCriteria.update({ where: { id: existing.id }, data: c as any });
    } else {
      await prisma.icpCriteria.create({ data: c as any });
    }
  }

  // ── Leads Data ──
  const leadsData = [
    {
      company_name: 'TechShop Brasil',
      niche: 'E-commerce Eletrônicos',
      email: 'contato@techshop.com.br',
      state: 'SP',
      city: 'São Paulo',
      ecommerce_platform: 'Shopify',
      estimated_base_size: 45000,
      avg_ticket_estimated: 189.90,
      status: 'EM_PROSPECCAO' as const,
      prr_score: 38,
      prr_tier: PrrTier.C,
      icp_score: 5,
      prr_inputs: {
         base_size_estimated: 45000,
         recompra_cycle_days: 90,
         avg_ticket_estimated: 189.90,
         inactive_base_pct: 0.3,
         integrability_score: 4
      }
    },
    {
      company_name: 'Moda Carioca',
      niche: 'Fashion',
      email: 'vendas@modacarioca.com.br',
      state: 'RJ',
      city: 'Rio de Janeiro',
      ecommerce_platform: 'VTEX',
      estimated_base_size: 120000,
      avg_ticket_estimated: 250.00,
      status: 'CONTA_FRIA' as const,
      prr_score: 55,
      prr_tier: PrrTier.B,
      icp_score: 7,
      prr_inputs: {
         base_size_estimated: 120000,
         recompra_cycle_days: 120,
         avg_ticket_estimated: 250.00,
         inactive_base_pct: 0.5,
         integrability_score: 5
      }
    },
    {
      company_name: 'Pet Natural',
      niche: 'Pet Shop',
      email: 'hello@petnatural.com.br',
      state: 'MG',
      city: 'Belo Horizonte',
      ecommerce_platform: 'WooCommerce',
      estimated_base_size: 8000,
      avg_ticket_estimated: 75.00,
      status: 'CONTA_FRIA' as const,
      prr_score: 72,
      prr_tier: PrrTier.A,
      icp_score: 10,
      prr_inputs: {
         base_size_estimated: 8000,
         recompra_cycle_days: 30,
         avg_ticket_estimated: 75.00,
         inactive_base_pct: 0.1,
         integrability_score: 3
      }
    },
  ];

  for (const ld of leadsData) {
    const { prr_inputs, ...leadData } = ld;
    const lead = await prisma.lead.upsert({
      where: { email_sdr_id: { email: leadData.email, sdr_id: sdr1.id } },
      update: { ...leadData, sdr_id: sdr1.id },
      create: { ...leadData, sdr_id: sdr1.id },
    });

    await prisma.prrInputs.upsert({
      where: { lead_id: lead.id },
      update: prr_inputs,
      create: { lead_id: lead.id, ...prr_inputs },
    });
  }

  // ── Templates ──
  const templates = [
    {
      name: 'Primeiro Contato — E-commerce',
      channel: 'EMAIL' as const,
      subject: '{{empresa}} — oportunidade que eu precisava te mostrar',
      body: 'Oi, tudo bem?\n\nVi que a {{empresa}} usa {{plataforma}} e trabalha com {{nicho}} em {{cidade}}.\n\nAqui na Retentio a gente ajuda lojas como a sua a reativar a base de clientes inativos e aumentar a recompra.\n\nPosso te mostrar em 15 min como funciona?\n\nAbraço,\n{{sdr_nome}}',
    },
    {
      name: 'Follow-up D3',
      channel: 'EMAIL' as const,
      subject: 'Re: {{empresa}} — conseguiu ver?',
      body: 'Oi! Passando rapidinho pra saber se conseguiu ver minha mensagem anterior.\n\nSei que a rotina é corrida, mas acho que vale a pena trocarmos uma ideia sobre o potencial da base da {{empresa}}.\n\nQual o melhor horário pra você essa semana?\n\n{{sdr_nome}}',
    },
    {
      name: 'WhatsApp Abertura',
      channel: 'WHATSAPP' as const,
      subject: null,
      body: 'Oi! Sou {{sdr_nome}} da Retentio 👋\n\nVi que a {{empresa}} tem uma base de clientes interessante no segmento de {{nicho}}.\n\nA gente ajuda e-commerces a reativar clientes inativos e aumentar recompra. Posso te mandar um material rápido?',
    },
    {
      name: 'Reativação Base Fria',
      channel: 'EMAIL' as const,
      subject: '{{empresa}} — sua base está dormindo (e perdendo dinheiro)',
      body: 'Oi!\n\nFaz um tempo que não conversamos, mas continuo acompanhando o mercado de {{nicho}} e sei que a {{empresa}} tem potencial enorme.\n\nVocê sabia que em média 60% da base de um e-commerce está inativa? A Retentio consegue reativar esses clientes de forma automatizada.\n\nVale agendar 15 min essa semana?\n\n{{sdr_nome}}',
    },
    {
      name: 'Proposta PRR Tier A',
      channel: 'EMAIL' as const,
      subject: '{{empresa}} — calculei o potencial da sua base',
      body: 'Oi!\n\nFiz uma análise rápida do perfil da {{empresa}} e o resultado foi impressionante: vocês estão no Tier {{prr_tier}} do nosso score de potencial de recompra.\n\nIsso significa que a sua base tem um potencial de receita recorrente acima da média do mercado de {{nicho}}.\n\nQuero te mostrar os números. Tem 15 min essa semana?\n\n{{sdr_nome}}',
    },
  ];

  for (const tpl of templates) {
    const existing = await prisma.template.findFirst({ where: { name: tpl.name } });
    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: { body: tpl.body, subject: tpl.subject },
      });
    } else {
      await prisma.template.create({ data: tpl });
    }
  }
  console.log(`📝 ${templates.length} templates seeded`);

  // ── Brand Config ──
  const existingBrand = await prisma.brandConfig.findFirst();
  if (!existingBrand) {
    await prisma.brandConfig.create({ data: {} });
    console.log('🎨 Brand config padrão criado');
  }

  console.log('✅ Seed concluído com sucesso');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
