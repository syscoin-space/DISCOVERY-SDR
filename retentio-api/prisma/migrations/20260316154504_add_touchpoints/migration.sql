-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SDR', 'GESTOR', 'CLOSER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('CONTA_FRIA', 'EM_PROSPECCAO', 'REUNIAO_AGENDADA', 'OPORTUNIDADE_QUALIFICADA', 'NUTRICAO', 'SEM_PERFIL');

-- CreateEnum
CREATE TYPE "PrrTier" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "IcpTier" AS ENUM ('FORA', 'PARCIAL', 'QUENTE', 'CONTRATO_CERTO');

-- CreateEnum
CREATE TYPE "BloqueioStatus" AS ENUM ('LIMPO', 'ALERTA', 'CONFIRMADO', 'IGNORADO');

-- CreateEnum
CREATE TYPE "MomentoCompra" AS ENUM ('URGENTE', 'PESQUISANDO', 'FUTURO', 'SEM_TIMING');

-- CreateEnum
CREATE TYPE "CadenceType" AS ENUM ('STANDARD', 'REATIVACAO', 'FAST_TRACK');

-- CreateEnum
CREATE TYPE "StepChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'LIGACAO', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDENTE', 'EXECUTADO', 'PULADO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('EMAIL', 'WHATSAPP', 'LIGACAO', 'LINKEDIN', 'REUNIAO', 'NOTA');

-- CreateEnum
CREATE TYPE "InteractionSource" AS ENUM ('CADENCIA', 'MANUAL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('PENDENTE', 'ACEITO', 'DEVOLVIDO');

-- CreateEnum
CREATE TYPE "IntegrabilityScore" AS ENUM ('ALTA', 'MEDIA', 'DIFICIL');

-- CreateEnum
CREATE TYPE "RecompraSignal" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('call', 'whatsapp', 'email', 'sms', 'instagram', 'meeting', 'other');

-- CreateEnum
CREATE TYPE "TouchpointType" AS ENUM ('attempt', 'effective_contact', 'follow_up', 'response', 'reschedule', 'booking', 'other');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('no_answer', 'voicemail', 'invalid_number', 'seen_no_reply', 'responded', 'spoke_to_gatekeeper', 'spoke_to_decision_maker', 'asked_to_follow_up', 'not_interested', 'booked', 'lost');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('outbound', 'inbound');

-- CreateEnum
CREATE TYPE "LeadFinalStatus" AS ENUM ('in_progress', 'booked', 'lost');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "avatar_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "sdr_id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'CONTA_FRIA',
    "domain" TEXT,
    "company_name" TEXT NOT NULL,
    "niche" TEXT,
    "company_size" TEXT,
    "cnpj" TEXT,
    "contact_name" TEXT,
    "contact_role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "instagram_handle" TEXT,
    "linkedin_url" TEXT,
    "website_url" TEXT,
    "state" TEXT,
    "city" TEXT,
    "ecommerce_platform" TEXT,
    "estimated_base_size" INTEGER,
    "avg_ticket_estimated" DOUBLE PRECISION,
    "lead_status_origin" TEXT,
    "notes_import" TEXT,
    "source" TEXT,
    "processed_at" TIMESTAMP(3),
    "imported_at" TIMESTAMP(3),
    "prr_score" DOUBLE PRECISION,
    "prr_tier" "PrrTier",
    "icp_score" INTEGER,
    "icp_tier" "IcpTier",
    "bloqueio_status" "BloqueioStatus" NOT NULL DEFAULT 'LIMPO',
    "bloqueio_motivos" JSONB,
    "momento_compra" "MomentoCompra",
    "recompra_signal" "RecompraSignal",
    "recompra_cycle" TEXT,
    "company_type" TEXT,
    "integrability_level" TEXT,
    "integrability" "IntegrabilityScore",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prr_inputs" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "base_size_estimated" INTEGER,
    "recompra_cycle_days" INTEGER,
    "avg_ticket_estimated" DOUBLE PRECISION,
    "inactive_base_pct" DOUBLE PRECISION,
    "integrability_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prr_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prr_weights" (
    "id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prr_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icp_criteria" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icp_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icp_answers" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "criteria_id" TEXT NOT NULL,
    "answer_value" TEXT NOT NULL,
    "score_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icp_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_stacks" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovered_stacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CadenceType" NOT NULL DEFAULT 'STANDARD',
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadence_steps" (
    "id" TEXT NOT NULL,
    "cadence_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "day_offset" INTEGER NOT NULL,
    "channel" "StepChannel" NOT NULL,
    "template_id" TEXT,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_cadences" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "cadence_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "lead_cadences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_cadence_steps" (
    "id" TEXT NOT NULL,
    "lead_cadence_id" TEXT NOT NULL,
    "cadence_step_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "status" "StepStatus" NOT NULL DEFAULT 'PENDENTE',
    "skip_reason" TEXT,

    CONSTRAINT "lead_cadence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "channel" "StepChannel" NOT NULL DEFAULT 'EMAIL',
    "variables" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "source" "InteractionSource" NOT NULL DEFAULT 'MANUAL',
    "channel" TEXT,
    "external_id" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_briefings" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "sdr_id" TEXT NOT NULL,
    "closer_id" TEXT,
    "status" "HandoffStatus" NOT NULL DEFAULT 'PENDENTE',
    "briefing_data" JSONB NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "return_reason" TEXT,
    "return_reentry_status" "LeadStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoff_briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" JSONB NOT NULL,
    "justificativa" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_events" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "detectado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "confirmado_at" TIMESTAMP(3),
    "confirmado_by" TEXT,
    "ignorado" BOOLEAN NOT NULL DEFAULT false,
    "ignorado_at" TIMESTAMP(3),
    "ignorado_by" TEXT,
    "justificativa" TEXT,
    "motivos" JSONB,

    CONSTRAINT "block_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resend_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "encrypted_api_key" TEXT NOT NULL,
    "daily_limit" INTEGER NOT NULL DEFAULT 50,
    "sent_today" INTEGER NOT NULL DEFAULT 0,
    "last_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resend_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "interaction_id" TEXT,
    "resend_email_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "url" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "enviada_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_configs" (
    "id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL DEFAULT 'Retentio',
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "icon_192_url" TEXT,
    "icon_512_url" TEXT,
    "color_accent" TEXT NOT NULL DEFAULT '#2E86AB',
    "color_navy" TEXT NOT NULL DEFAULT '#1E3A5F',
    "color_green" TEXT NOT NULL DEFAULT '#1A7A5E',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "lead_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_tasks" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "sdr_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "resultado" TEXT,
    "proximo_contato" TIMESTAMP(3),
    "canal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "sdr_id" TEXT,
    "tipo" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_integrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_email" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "calendar_id" TEXT NOT NULL DEFAULT 'primary',
    "escopos" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "closer_user_id" TEXT NOT NULL,
    "sdr_user_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "meet_link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "convidados" TEXT[],
    "sincronizado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "touchpoints" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "channel" "Channel" NOT NULL,
    "touchpoint_type" "TouchpointType" NOT NULL,
    "outcome" "Outcome" NOT NULL,
    "direction" "Direction",
    "answered" BOOLEAN,
    "booked" BOOLEAN,
    "lost" BOOLEAN,
    "duration_seconds" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hours_since_previous_touch" DOUBLE PRECISION,
    "days_since_lead_created" DOUBLE PRECISION,
    "generated_next_step" BOOLEAN DEFAULT false,

    CONSTRAINT "touchpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_journey_summaries" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "total_touchpoints" INTEGER NOT NULL DEFAULT 0,
    "total_effective_contacts" INTEGER NOT NULL DEFAULT 0,
    "total_no_response_attempts" INTEGER NOT NULL DEFAULT 0,
    "first_contact_channel" TEXT,
    "second_contact_channel" TEXT,
    "last_contact_channel" TEXT,
    "first_touch_at" TIMESTAMP(3),
    "last_touch_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "booked_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "days_to_first_contact" DOUBLE PRECISION,
    "days_to_book" DOUBLE PRECISION,
    "touchpoints_to_book" INTEGER,
    "final_status" "LeadFinalStatus" NOT NULL DEFAULT 'in_progress',
    "cadence_signature" TEXT,

    CONSTRAINT "lead_journey_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadence_insights" (
    "id" TEXT NOT NULL,
    "cadence_signature" TEXT NOT NULL,
    "leads_count" INTEGER NOT NULL,
    "touchpoints_count" INTEGER NOT NULL,
    "response_rate" DOUBLE PRECISION NOT NULL,
    "booking_rate" DOUBLE PRECISION NOT NULL,
    "avg_days_to_book" DOUBLE PRECISION,
    "median_touchpoints_to_book" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadence_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "leads_cnpj_key" ON "leads"("cnpj");

-- CreateIndex
CREATE INDEX "leads_sdr_id_idx" ON "leads"("sdr_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_prr_tier_idx" ON "leads"("prr_tier");

-- CreateIndex
CREATE INDEX "leads_icp_tier_idx" ON "leads"("icp_tier");

-- CreateIndex
CREATE INDEX "leads_sdr_id_status_idx" ON "leads"("sdr_id", "status");

-- CreateIndex
CREATE INDEX "leads_sdr_id_prr_score_idx" ON "leads"("sdr_id", "prr_score" DESC);

-- CreateIndex
CREATE INDEX "leads_company_name_idx" ON "leads"("company_name");

-- CreateIndex
CREATE INDEX "leads_bloqueio_status_idx" ON "leads"("bloqueio_status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_domain_sdr_id_key" ON "leads"("domain", "sdr_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_sdr_id_key" ON "leads"("email", "sdr_id");

-- CreateIndex
CREATE UNIQUE INDEX "prr_inputs_lead_id_key" ON "prr_inputs"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "prr_weights_dimension_key" ON "prr_weights"("dimension");

-- CreateIndex
CREATE INDEX "icp_criteria_active_order_idx" ON "icp_criteria"("active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "icp_answers_lead_id_criteria_id_key" ON "icp_answers"("lead_id", "criteria_id");

-- CreateIndex
CREATE INDEX "discovered_stacks_lead_id_idx" ON "discovered_stacks"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_stacks_lead_id_category_tool_name_key" ON "discovered_stacks"("lead_id", "category", "tool_name");

-- CreateIndex
CREATE UNIQUE INDEX "cadence_steps_cadence_id_step_order_key" ON "cadence_steps"("cadence_id", "step_order");

-- CreateIndex
CREATE INDEX "lead_cadences_status_idx" ON "lead_cadences"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lead_cadences_lead_id_cadence_id_key" ON "lead_cadences"("lead_id", "cadence_id");

-- CreateIndex
CREATE INDEX "lead_cadence_steps_status_scheduled_at_idx" ON "lead_cadence_steps"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_cadence_steps_lead_cadence_id_cadence_step_id_key" ON "lead_cadence_steps"("lead_cadence_id", "cadence_step_id");

-- CreateIndex
CREATE INDEX "templates_channel_active_idx" ON "templates"("channel", "active");

-- CreateIndex
CREATE INDEX "interactions_lead_id_created_at_idx" ON "interactions"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "interactions_type_idx" ON "interactions"("type");

-- CreateIndex
CREATE INDEX "interactions_external_id_idx" ON "interactions"("external_id");

-- CreateIndex
CREATE INDEX "handoff_briefings_sdr_id_idx" ON "handoff_briefings"("sdr_id");

-- CreateIndex
CREATE INDEX "handoff_briefings_closer_id_idx" ON "handoff_briefings"("closer_id");

-- CreateIndex
CREATE INDEX "handoff_briefings_status_idx" ON "handoff_briefings"("status");

-- CreateIndex
CREATE INDEX "block_events_lead_id_idx" ON "block_events"("lead_id");

-- CreateIndex
CREATE INDEX "block_events_confirmado_ignorado_idx" ON "block_events"("confirmado", "ignorado");

-- CreateIndex
CREATE UNIQUE INDEX "resend_configs_user_id_key" ON "resend_configs"("user_id");

-- CreateIndex
CREATE INDEX "email_events_resend_email_id_idx" ON "email_events"("resend_email_id");

-- CreateIndex
CREATE INDEX "email_events_interaction_id_idx" ON "email_events"("interaction_id");

-- CreateIndex
CREATE INDEX "email_events_type_idx" ON "email_events"("type");

-- CreateIndex
CREATE INDEX "email_events_created_at_idx" ON "email_events"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_lida_idx" ON "notifications"("user_id", "lida");

-- CreateIndex
CREATE INDEX "notifications_user_id_enviada_at_idx" ON "notifications"("user_id", "enviada_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "daily_tasks_sdr_id_date_idx" ON "daily_tasks"("sdr_id", "date");

-- CreateIndex
CREATE INDEX "daily_tasks_status_idx" ON "daily_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tasks_lead_id_sdr_id_date_key" ON "daily_tasks"("lead_id", "sdr_id", "date");

-- CreateIndex
CREATE INDEX "metas_sdr_id_idx" ON "metas"("sdr_id");

-- CreateIndex
CREATE INDEX "metas_tipo_idx" ON "metas"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "google_integrations_user_id_key" ON "google_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_google_event_id_key" ON "calendar_events"("google_event_id");

-- CreateIndex
CREATE INDEX "calendar_events_lead_id_idx" ON "calendar_events"("lead_id");

-- CreateIndex
CREATE INDEX "calendar_events_closer_user_id_idx" ON "calendar_events"("closer_user_id");

-- CreateIndex
CREATE INDEX "calendar_events_sdr_user_id_idx" ON "calendar_events"("sdr_user_id");

-- CreateIndex
CREATE INDEX "calendar_events_inicio_idx" ON "calendar_events"("inicio");

-- CreateIndex
CREATE INDEX "touchpoints_lead_id_created_at_idx" ON "touchpoints"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "lead_journey_summaries_lead_id_key" ON "lead_journey_summaries"("lead_id");

-- CreateIndex
CREATE INDEX "cadence_insights_cadence_signature_idx" ON "cadence_insights"("cadence_signature");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_sdr_id_fkey" FOREIGN KEY ("sdr_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prr_inputs" ADD CONSTRAINT "prr_inputs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icp_answers" ADD CONSTRAINT "icp_answers_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icp_answers" ADD CONSTRAINT "icp_answers_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "icp_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_stacks" ADD CONSTRAINT "discovered_stacks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_cadence_id_fkey" FOREIGN KEY ("cadence_id") REFERENCES "cadences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_cadences" ADD CONSTRAINT "lead_cadences_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_cadences" ADD CONSTRAINT "lead_cadences_cadence_id_fkey" FOREIGN KEY ("cadence_id") REFERENCES "cadences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_cadence_steps" ADD CONSTRAINT "lead_cadence_steps_lead_cadence_id_fkey" FOREIGN KEY ("lead_cadence_id") REFERENCES "lead_cadences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_cadence_steps" ADD CONSTRAINT "lead_cadence_steps_cadence_step_id_fkey" FOREIGN KEY ("cadence_step_id") REFERENCES "cadence_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_briefings" ADD CONSTRAINT "handoff_briefings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_briefings" ADD CONSTRAINT "handoff_briefings_sdr_id_fkey" FOREIGN KEY ("sdr_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_briefings" ADD CONSTRAINT "handoff_briefings_closer_id_fkey" FOREIGN KEY ("closer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_events" ADD CONSTRAINT "block_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_events" ADD CONSTRAINT "block_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "block_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resend_configs" ADD CONSTRAINT "resend_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_sdr_id_fkey" FOREIGN KEY ("sdr_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_sdr_id_fkey" FOREIGN KEY ("sdr_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_integrations" ADD CONSTRAINT "google_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoints" ADD CONSTRAINT "touchpoints_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoints" ADD CONSTRAINT "touchpoints_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_journey_summaries" ADD CONSTRAINT "lead_journey_summaries_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
