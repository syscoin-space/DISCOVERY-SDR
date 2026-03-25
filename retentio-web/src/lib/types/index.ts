// ─── ENUMS (espelham Prisma backend) ─────────────

export type Role = "OWNER" | "MANAGER" | "SDR" | "CLOSER";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  branding: unknown;
  discovery_enabled: boolean;
  onboarding_status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  onboarding_step?: number;
  created_at: string;
};

export type LeadStatus =
  | "BANCO"
  | "CONTA_FRIA"
  | "DISCOVERY"
  | "EM_PROSPECCAO"
  | "FOLLOW_UP"
  | "NUTRICAO"
  | "REUNIAO_MARCADA"
  | "PERDIDO";

export type FitTier = "A" | "B" | "C";

export type IcpTier = "FORA" | "PARCIAL" | "QUENTE" | "CONTRATO_CERTO";

export type BloqueioStatus = "LIMPO" | "ALERTA";

export type MomentoCompra = "URGENTE" | "PESQUISANDO" | "FUTURO" | "SEM_TIMING";

export type CadencePurpose = "DISCOVERY" | "PROSPECCAO" | "NUTRICAO" | "CONFIRMACAO";

export type StepChannel = "EMAIL" | "WHATSAPP" | "LIGACAO" | "LINKEDIN";

export type StepStatus = "PENDENTE" | "EXECUTADO" | "PULADO" | "ATRASADO" | "CANCELADO";

export type InteractionType = "EMAIL" | "WHATSAPP" | "LIGACAO" | "LINKEDIN" | "REUNIAO" | "NOTA";

export type InteractionSource = "CADENCIA" | "MANUAL" | "WEBHOOK";

export type HandoffStatus = "PENDENTE" | "ACEITO" | "DEVOLVIDO";

export type IntegrabilityScore = "ALTA" | "MEDIA" | "DIFICIL";

export type TaskStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" | "ATRASADA";

export type TaskType = "CADENCE_STEP" | "DISCOVERY_STEP" | "MANUAL" | "AUTO" | "MEETING";

export type RecompraSignal = "ALTA" | "MEDIA" | "BAIXA";

// ─── ENTITIES ─────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role?: Role; // Contextual role (membership)
  membership_id?: string;
  tenant_id?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    onboarding_status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    onboarding_step?: number;
    discovery_enabled: boolean;
  };
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  sdr_id: string;
  status: LeadStatus;
  company_name: string;
  niche: string | null;
  cnpj: string | null;
  contact_name: string | null;
  contact_role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram_handle: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  state: string | null;
  city: string | null;
  ecommerce_platform: string | null;
  estimated_base_size: number | null;
  avg_ticket_estimated: number | null;
  notes_import: string | null;
  source: string | null;
  imported_at: string | null;
  operational_score: number | null;
  fit_tier: string | null;
  icp_score: number | null;
  icp_tier: IcpTier | null;
  bloqueio_status: BloqueioStatus;
  bloqueio_motivo: string | null;
  momento_compra: MomentoCompra | null;
  recompra_signal: RecompraSignal | null;
  integrability: IntegrabilityScore | null;
  created_at: string;
  updated_at: string;
  // Relations (populated when included)
  sdr?: User;
  prr_inputs?: any;
  icp_answers?: IcpAnswer[];
  discovered_stack?: DiscoveredStack[];
  cadence_enrollments?: CadenceEnrollment[];
  interactions?: Interaction[];
  handoffs?: HandoffBriefing[];
  tasks?: Task[];
}


export interface IcpAnswer {
  id: string;
  lead_id: string;
  criteria_id: string;
  answer_value: string;
  score_points: number;
  created_at: string;
  updated_at: string;
  criteria?: IcpCriteria;
}

export interface IcpCriteria {
  id: string;
  order: number;
  label: string;
  type: string;
  options: unknown;
  weight: number;
  active: boolean;
}

export interface DiscoveredStack {
  id: string;
  lead_id: string;
  category: string;
  tool_name: string;
  created_at: string;
}

export interface Cadence {
  id: string;
  tenant_id: string;
  name: string;
  purpose: CadencePurpose;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  steps?: CadenceStep[];
}

export interface CadenceStep {
  id: string;
  cadence_id: string;
  step_order: number;
  day_offset: number;
  channel: StepChannel;
  template_id: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  template?: Template;
}

export interface CadenceEnrollment {
  id: string;
  lead_id: string;
  cadence_id: string;
  current_step: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED_SUCCESS" | "COMPLETED_FAIL" | "CANCELLED";
  started_at: string;
  completed_at: string | null;
  cadence?: Cadence;
  tasks?: Task[];
}

export interface LeadCadenceStep {
  id: string;
  lead_cadence_id: string;
  cadence_step_id: string;
  scheduled_at: string;
  executed_at: string | null;
  status: StepStatus;
  skip_reason: string | null;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: InteractionType;
  source: InteractionSource;
  channel: string | null;
  external_id: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  metadata: unknown;
  created_at: string;
  email_events?: EmailEvent[];
}

export interface HandoffBriefing {
  id: string;
  lead_id: string;
  sdr_id: string;
  closer_id: string | null;
  status: HandoffStatus;
  briefing_data: {
    company: string;
    contact: {
      name: string | null;
      role: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
    };
    segment: string | null;
    size: string | null;
    icp_score: number | null;
    custom_notes?: string;
    last_interactions?: Array<{
      type: string;
      date: string;
      subject: string | null;
    }>;
  };
  accepted_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  return_reentry_status: LeadStatus | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  sdr?: { id: string; user: { name: string } };
  closer?: { id: string; user: { name: string } };
}

export interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  channel: StepChannel;
  variables: unknown;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  membership_id: string;
  lead_id: string;
  type: TaskType;
  title: string;
  description: string | null;
  channel: string | null;
  status: TaskStatus;
  outcome: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: Pick<Lead, "id" | "company_name" | "icp_score" | "whatsapp" | "email" | "phone" | "state" | "city" | "status" | "contact_name" | "niche" | "operational_score" | "fit_tier">;
}

export interface TodaySummary {
  total: number;
  pendente: number;
  concluidos: number;
  cancelados: number;
  detalhado: {
    pendente: number;
    em_andamento: number;
    concluida: number;
    cancelada: number;
  };
}

// ─── API RESPONSE SHAPES ─────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface DashboardPipeline {
  status: LeadStatus;
  label: string;
  count: number;
}

export interface SdrMetrics {
  total_leads: number;
  leads_by_tier: Record<FitTier, number>;
  handoffs_this_month: number;
  cadences_active: number;
  interactions_this_week: number;
}

// ─── GESTOR TYPES ─────────────

export interface GestorDashboard {
  today: {
    total_tasks: number;
    completed: number;
    pending: number;
    completion_pct: number;
  };
  week: {
    meetings: number;
    handoffs: number;
  };
  funnel: Record<string, number>;
  sdr_summaries: Array<{
    id: string;
    name: string;
    total: number;
    done: number;
    pending: number;
    completion_pct: number;
  }>;
  alerts: Array<{
    sdr_name: string;
    type: string;
    message: string;
  }>;
}

export interface GestorSdr {
  id: string;
  name: string;
  email: string;
  total_leads: number;
  today_tasks: number;
  today_done: number;
  today_completion_pct: number;
  week_meetings: number;
  month_handoffs: number;
  active_cadences: number;
}

export interface Meta {
  id: string;
  sdr_id: string | null;
  tipo: string;
  valor: number;
  periodo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  sdr: { id: string; name: string } | null;
}

// ─── RESEND / EMAIL TRACKING ─────────────

export interface ResendConfig {
  id: string;
  from_email: string;
  from_name: string | null;
  daily_limit: number;
  sent_today: number;
  active: boolean;
  last_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmailEvent {
  id: string;
  type: string;
  interaction_id: string | null;
  external_message_id: string | null;
  timestamp: string | null;
  link?: string;
  payload: any;
  created_at: string;
}

export interface EmailAuditItem {
  id: string;
  lead_id: string;
  type: InteractionType;
  source: InteractionSource;
  external_id: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  created_at: string;
  lead: {
    id: string;
    company_name: string;
    contact_name: string | null;
    email: string | null;
  };
  email_events: EmailEvent[];
}

export interface EmailStats {
  period_days: number;
  total_sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

// ─── FUNNEL CONFIG ─────────────

export const FUNNEL_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "BANCO", label: "Banco", color: "#94a3b8" },
  { status: "CONTA_FRIA", label: "Conta Fria", color: "#64748b" },
  { status: "DISCOVERY", label: "Discovery", color: "#0ea5e9" },
  { status: "EM_PROSPECCAO", label: "Em Prospecção", color: "#2E86AB" },
  { status: "FOLLOW_UP", label: "Follow-Up", color: "#EC4899" },
  { status: "REUNIAO_MARCADA", label: "Reunião Marcada", color: "#f59e0b" },
  { status: "PERDIDO", label: "Perdido", color: "#ef4444" },
];
