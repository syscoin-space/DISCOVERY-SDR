import type { Interaction } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface Insight {
  titulo: string;
  texto: string;
  acao?: string;
  cor: "blue" | "orange" | "green" | "red" | "purple";
  copiavel?: string; // texto para copiar ao clicar na ação
}

export type InsightTipo =
  | "nao_atendeu"
  | "multiplas_tentativas"
  | "reuniao_agendada"
  | "atendeu"
  | "tier_a_parado"
  | "mensagem_enviada"
  | "sem_interesse";

// ─── Insights database ─────────────────────────────────────────────

const INSIGHTS: Record<string, Insight> = {
  nao_atendeu_ligacao: {
    titulo: "Que tal tentar por outro canal?",
    texto: 'Ligação sem resposta é comum. Tente um WhatsApp curto agora: "Oi [nome], tentei ligar. Tem 5min amanhã?"',
    acao: "Copiar mensagem WhatsApp",
    cor: "blue",
    copiavel: "Oi [nome], tentei te ligar agora. Tem 5min amanhã para conversarmos rapidamente?",
  },
  nao_atendeu_whatsapp: {
    titulo: "WhatsApp sem resposta?",
    texto: "Tente um email curto e direto. WhatsApp pode ter sido ignorado — email fica na caixa e será lido depois.",
    acao: "Abrir templates de email",
    cor: "blue",
  },
  tres_tentativas: {
    titulo: "3 tentativas sem resposta",
    texto: "Recomendação Aaron Ross: pause por 7 dias e volte com um ângulo diferente. Insistência queima o lead.",
    acao: "Agendar retorno em 7 dias",
    cor: "orange",
  },
  reuniao_agendada: {
    titulo: "Reunião agendada!",
    texto: "Boa prática: confirme por WhatsApp 1h antes. Taxa de no-show cai de 40% para 10% com confirmação.",
    acao: "Copiar mensagem de confirmação",
    cor: "green",
    copiavel: "Oi [nome]! Tudo bem? Só confirmando nossa conversa de hoje. Estou disponível no horário combinado. Até já!",
  },
  atendeu: {
    titulo: "Próximo passo recomendado:",
    texto: "Após uma ligação bem-sucedida, envie um email de resumo em até 2h. Isso aumenta em 3x a chance de avanço.",
    acao: "Abrir template de follow-up",
    cor: "green",
  },
  tier_a_parado: {
    titulo: "Lead Tier A parado há muito tempo",
    texto: "Esse lead tem alto potencial (PRR A). Cada dia sem contato é receita perdida. Priorize agora.",
    acao: "Adicionar à fila de hoje",
    cor: "red",
  },
  mensagem_enviada: {
    titulo: "Mensagem enviada!",
    texto: "Dê 24-48h para resposta antes do próximo follow-up. Resista à tentação de mandar outra mensagem hoje.",
    cor: "blue",
  },
  sem_interesse: {
    titulo: "Lead sem interesse agora",
    texto: "Mova para Nutrição e programe retorno em 30-60 dias. Timing muda — quem disse não hoje pode dizer sim em 2 meses.",
    acao: "Mover para Nutrição",
    cor: "orange",
  },
};

// ─── Get insight by status change ───────────────────────────────────

export function getInsightForStatus(
  status: string,
  dados?: {
    tentativas?: number;
    ultimo_canal?: string;
    contact_name?: string;
  }
): Insight | null {
  switch (status) {
    case "NAO_ATENDEU": {
      // Check if 3+ attempts
      if (dados?.tentativas && dados.tentativas >= 3) {
        return INSIGHTS.tres_tentativas;
      }
      if (dados?.ultimo_canal === "WHATSAPP") {
        return INSIGHTS.nao_atendeu_whatsapp;
      }
      return INSIGHTS.nao_atendeu_ligacao;
    }
    case "REUNIAO_AGENDADA":
      return applyName(INSIGHTS.reuniao_agendada, dados?.contact_name);
    case "ATENDEU":
      return INSIGHTS.atendeu;
    case "MENSAGEM_ENVIADA":
      return INSIGHTS.mensagem_enviada;
    case "SEM_INTERESSE":
      return INSIGHTS.sem_interesse;
    default:
      return null;
  }
}

// ─── Get insight for stale Tier A lead ──────────────────────────────

export function getTierAInsight(
  prr_tier: string | null | undefined,
  updated_at: string
): Insight | null {
  if (prr_tier !== "A") return null;
  const daysSince = Math.floor(
    (Date.now() - new Date(updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince < 3) return null;
  return {
    ...INSIGHTS.tier_a_parado,
    texto: `Esse lead tem alto potencial (PRR A) e está parado há ${daysSince} dias. Cada dia sem contato é receita perdida. Priorize agora.`,
  };
}

// ─── Channel suggestion based on interaction history ────────────────

export function getNextChannelSuggestion(
  interactions: Interaction[]
): string | null {
  if (!interactions?.length) return "Email";

  // Get last 3 interactions (most recent first)
  const recent = interactions
    .filter((i) => ["EMAIL", "WHATSAPP", "LIGACAO", "LINKEDIN"].includes(i.type))
    .slice(0, 3);

  if (recent.length === 0) return "Email";

  const noResponse = (i: Interaction) =>
    !i.status || i.status === "sent" || i.status === "delivered" || i.status === "pending_manual";

  // Last 2 were LIGACAO without response → suggest WHATSAPP
  if (
    recent.length >= 2 &&
    recent[0].type === "LIGACAO" &&
    recent[1].type === "LIGACAO" &&
    noResponse(recent[0]) &&
    noResponse(recent[1])
  ) {
    return "WhatsApp";
  }

  // Last 2 were EMAIL without open → suggest LIGACAO
  if (
    recent.length >= 2 &&
    recent[0].type === "EMAIL" &&
    recent[1].type === "EMAIL" &&
    noResponse(recent[0]) &&
    noResponse(recent[1])
  ) {
    return "Ligação";
  }

  // Last was WHATSAPP without response → suggest EMAIL
  if (recent[0].type === "WHATSAPP" && noResponse(recent[0])) {
    return "Email";
  }

  // Last was EMAIL without response → suggest WhatsApp
  if (recent[0].type === "EMAIL" && noResponse(recent[0])) {
    return "WhatsApp";
  }

  // Used all 3 channels without response → suggest pause
  const channels = new Set(recent.filter(noResponse).map((i) => i.type));
  if (channels.size >= 3) {
    return "Pausar 7 dias";
  }

  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function applyName(insight: Insight, name?: string): Insight {
  if (!name || !insight.copiavel) return insight;
  return {
    ...insight,
    copiavel: insight.copiavel.replace(/\[nome\]/g, name),
  };
}
