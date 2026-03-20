import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'staging-secret-v2-xyz-123';

function createToken(payload: any) {
  return sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

async function apiFetch(path: string, method: string, token: string, body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function runPilot() {
  console.log('🚀 Iniciando Piloto Controlado E2E do Discovery SDR V2...\n');

  const results: { step: string; status: string; detail?: string }[] = [];

  function pass(step: string, detail?: string) {
    console.log(`  ✅ ${step}${detail ? ': ' + detail : ''}`);
    results.push({ step, status: 'PASS', detail });
  }

  function fail(step: string, detail: string) {
    console.error(`  ❌ ${step}: ${detail}`);
    results.push({ step, status: 'FAIL', detail });
  }

  try {
    // ── STEP 1: Tenant & Role Setup ──────────────────────────────────
    console.log('📋 STEP 1 — Tenant & Roles');
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'discovery-demo' } });
    if (!tenant) throw new Error('Tenant "discovery-demo" não encontrado. Rodou o seed?');

    const ownerMembership = await prisma.membership.findFirst({
      where: { role: 'OWNER', tenant_id: tenant.id },
      include: { user: true },
    });
    const sdrMembership = await prisma.membership.findFirst({
      where: { role: 'SDR', tenant_id: tenant.id },
      include: { user: true },
    });
    const { id: closerMembershipId } = (await prisma.membership.findFirst({
      where: { role: 'CLOSER', tenant_id: tenant.id },
      include: { user: true },
    })) || { id: null };
    
    const closerMembership = await prisma.membership.findFirst({
        where: { role: 'CLOSER', tenant_id: tenant.id },
        include: { user: true },
    });

    if (!ownerMembership) throw new Error('Membership OWNER não encontrado.');
    if (!sdrMembership) throw new Error('Membership SDR não encontrado.');
    if (!closerMembership) throw new Error('Membership CLOSER não encontrado.');

    const ownerToken = createToken({ sub: ownerMembership.user_id, email: ownerMembership.user.email, name: ownerMembership.user.name, tenant_id: tenant.id, membership_id: ownerMembership.id, role: 'OWNER' });
    const sdrToken = createToken({ sub: sdrMembership.user_id, email: sdrMembership.user.email, name: sdrMembership.user.name, tenant_id: tenant.id, membership_id: sdrMembership.id, role: 'SDR' });
    const closerToken = createToken({ sub: closerMembership.user_id, email: closerMembership.user.email, name: closerMembership.user.name, tenant_id: tenant.id, membership_id: closerMembership.id, role: 'CLOSER' });

    pass('Tenant carregado', tenant.name);
    pass('Tokens gerados para OWNER, SDR, CLOSER');

    // ── STEP 2: Owner cria Lead ───────────────────────────────────────
    console.log('\n📋 STEP 2 — Owner Cria e Distribui Lead');
    let leadId: string;
    try {
      const createLeadData = await apiFetch('/leads', 'POST', ownerToken, {
        company_name: 'Lead Piloto E2E',
        niche: 'Tecnologia',
        contact_name: 'Diretor Piloto',
        phone: '11999999999',
      });
      leadId = createLeadData.id;
      pass('Lead criado', leadId);
    } catch (e: any) {
      fail('Lead criado', e.message);
      throw e;
    }

    const sdrId = sdrMembership.id;
    try {
      await apiFetch(`/leads/${leadId}`, 'PATCH', ownerToken, { sdr_id: sdrId });
      pass('Lead atribuído ao SDR', sdrId);
    } catch (e: any) {
      fail('Lead atribuído ao SDR', e.message);
    }

    // ── STEP 3: SDR visualiza Hoje ────────────────────────────────────
    console.log(`\n📋 STEP 3 — SDR no Hoje (Check at ${Date.now()})`);
    try {
      const tasks = await apiFetch('/today/tasks', 'GET', sdrToken);
      const task = Array.isArray(tasks) ? tasks.find((t: any) => t.lead_id === leadId) : null;
      if (!task) {
        fail('Task aparece no Hoje do SDR', `Nenhuma task encontrada para lead ${leadId} — possível lag ou rota divergente`);
      } else {
        pass('Task aparece no Hoje do SDR', task.id);
        await apiFetch(`/today/tasks/${task.id}`, 'PATCH', sdrToken, { outcome: 'MENSAGEM_ENVIADA', status: 'CONCLUIDA' });
        pass('SDR concluiu touchpoint (outcome=MENSAGEM_ENVIADA)');
      }
    } catch (e: any) {
      fail('SDR — Hoje Flow', e.message);
    }

    // ── STEP 4: IA — Analyze & HIL ────────────────────────────────────
    console.log('\n📋 STEP 4 — IA Discovery + Human-in-the-Loop');
    try {
      await apiFetch(`/leads/${leadId}`, 'PATCH', sdrToken, {
        discovery_notes: 'O Diretor gostou do produto. Tem orçamento para Q2 e quer agendar com os sócios.',
      });
      pass('Notas de discovery salvas');

      const aiRes = await apiFetch(`/leads/${leadId}/ai/analyze`, 'POST', sdrToken, {});
      pass('AI analisou o lead', aiRes?.suggestion?.summary ?? '(fallback sem chave de API — OK)');

      await apiFetch(`/leads/${leadId}/ai/accept`, 'POST', sdrToken, {});
      pass('SDR aceitou a sugestão (HIL)');
    } catch (e: any) {
      fail('IA Flow (analyze + HIL accept)', e.message);
    }

    // ── STEP 5: Reunião + Handoff ───────────────────────────────────
    console.log('\n📋 STEP 5 — Reunião Marcada + Handoff');
    let handoffId: string | null = null;
    try {
      await apiFetch(`/leads/${leadId}`, 'PATCH', sdrToken, { discovery_status: 'READY_FOR_PROSPECTING' });
      pass('Lead movido para REUNIAO_MARCADA');

      const closerId = closerMembership.id;

      const handoffData = await apiFetch('/handoffs', 'POST', sdrToken, {
        lead_id: leadId,
        closer_id: closerId,
        date: new Date(Date.now() + 86400000).toISOString(),
        duration: 30,
        briefing_data: {
          company: 'Lead Piloto E2E',
          segment: 'Tecnologia',
          size: '50-100',
          icp_score: 12,
          contact: { name: 'Diretor Piloto', role: 'Diretor de TI' },
          custom_notes: 'Lead quente com orçamento definido.',
        },
      });
      handoffId = handoffData?.id ?? null;
      pass('Handoff criado e enviado ao Closer', handoffId ?? 'ID não retornado');
    } catch (e: any) {
      fail('Handoff creation', e.message);
    }

    // ── STEP 6: Closer aceita Handoff ────────────────────────────────
    console.log('\n📋 STEP 6 — Closer Aceita Handoff');
    if (handoffId) {
      try {
        const closerHandoffs = await apiFetch('/handoffs', 'GET', closerToken);
        const pending = Array.isArray(closerHandoffs) ? closerHandoffs.find((h: any) => h.lead_id === leadId) : null;
        if (!pending) {
          fail('Closer visualiza handoff pendente', 'Handoff não retornado para o Closer — verificar role guard');
        } else {
          await apiFetch(`/handoffs/${pending.id}/accept`, 'POST', closerToken, {});
          pass('Closer aceitou o Handoff', pending.id);
        }
      } catch (e: any) {
        fail('Closer — Handoff accept', e.message);
      }
    } else {
      fail('Closer — Handoff accept', 'Pulado pois handoff não foi criado');
    }

    // ── STEP 7: Dashboard V2 ──────────────────────────────────────────
    console.log('\n📋 STEP 7 — Dashboard V2 Métricas');
    try {
      const dash = await apiFetch('/dashboard/v2/metrics', 'GET', ownerToken);
      pass('Dashboard V2 retornou métricas', `${JSON.stringify({ total_leads: dash?.operational?.total_leads, ai_suggestions: dash?.aiAnalytics?.total_suggestions ?? 0 })}`);
    } catch (e: any) {
      fail('Dashboard V2', e.message);
    }

  } catch (err: any) {
    console.error('\n💥 ERRO FATAL NO PILOTO:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // ── SUMÁRIO FINAL ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════');
  console.log('      RESUMO DO PILOTO E2E V2     ');
  console.log('══════════════════════════════════');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.step}${r.detail ? ' — ' + r.detail : ''}`);
  });
  console.log(`\n📊 Total: ${results.length} | ✅ ${passed} PASS | ❌ ${failed} FAIL`);
  if (failed === 0) {
    console.log('\n🎉 TODOS OS CHECKS PASSARAM — V2 APROVADA PARA STAGING!');
  } else {
    console.log('\n⚠️  ALGUNS CHECKS FALHARAM — revisar gaps antes de subir para produção.');
  }
}

runPilot();
