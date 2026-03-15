import type { PrrTier, IcpTier, IntegrabilityScore, MomentoCompra } from "@/lib/types";

// ─── PRR ─────────────

export function getPRRColor(tier: PrrTier | null): string {
  switch (tier) {
    case "A":
      return "bg-green-500";
    case "B":
      return "bg-yellow-400";
    case "C":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

export function getPRRTextColor(tier: PrrTier | null): string {
  switch (tier) {
    case "A":
      return "text-green-700";
    case "B":
      return "text-yellow-700";
    case "C":
      return "text-red-700";
    default:
      return "text-gray-500";
  }
}

export function getPRRLabel(tier: PrrTier | null): string {
  switch (tier) {
    case "A":
      return "A — Alto Potencial";
    case "B":
      return "B — Moderado";
    case "C":
      return "C — Baixo Potencial";
    default:
      return "Não avaliado";
  }
}

// ─── ICP ─────────────

export function getICPClassification(score: number, total: number): string {
  if (total === 0) return "Sem dados";
  const pct = (score / total) * 100;

  if (pct >= 85) return "Contrato Certo";
  if (pct >= 65) return "Quente";
  if (pct >= 40) return "Parcial";
  return "Fora do ICP";
}

export function getICPColor(tier: IcpTier | null): string {
  switch (tier) {
    case "CONTRATO_CERTO":
      return "bg-emerald-600";
    case "QUENTE":
      return "bg-orange-500";
    case "PARCIAL":
      return "bg-yellow-400";
    case "FORA":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

export function getICPLabel(tier: IcpTier | null): string {
  switch (tier) {
    case "CONTRATO_CERTO":
      return "Contrato Certo";
    case "QUENTE":
      return "Quente";
    case "PARCIAL":
      return "Parcial";
    case "FORA":
      return "Fora do ICP";
    default:
      return "Não avaliado";
  }
}

// ─── INTEGRABILITY ─────────────

export function getIntegrabilityColor(level: IntegrabilityScore | null): string {
  switch (level) {
    case "ALTA":
      return "bg-green-500";
    case "MEDIA":
      return "bg-yellow-400";
    case "DIFICIL":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

export function getIntegrabilityLabel(level: IntegrabilityScore | null): string {
  switch (level) {
    case "ALTA":
      return "Alta — Plug & Play";
    case "MEDIA":
      return "Média — Requer ajustes";
    case "DIFICIL":
      return "Difícil — Integração complexa";
    default:
      return "Não avaliado";
  }
}

// ─── MOMENTO DE COMPRA ─────────────

export function formatMomentoCompra(value: MomentoCompra | null): string {
  switch (value) {
    case "URGENTE":
      return "Agora";
    case "PESQUISANDO":
      return "30 dias";
    case "FUTURO":
      return "90+ dias";
    case "SEM_TIMING":
      return "Sem timing";
    default:
      return "Não informado";
  }
}

export function getMomentoCompraColor(value: MomentoCompra | null): string {
  switch (value) {
    case "URGENTE":
      return "bg-red-600";
    case "PESQUISANDO":
      return "bg-yellow-500";
    case "FUTURO":
      return "bg-blue-400";
    case "SEM_TIMING":
      return "bg-gray-400";
    default:
      return "bg-gray-300";
  }
}
