--
-- PostgreSQL database dump
--

\restrict jlBx0mo87MVeWTG8Oo3lMa010KXbT8baj4uUUhA4M4qHhBAWYRLQL2TIfmXbeRV

-- Dumped from database version 18.3 (Postgres.app)
-- Dumped by pg_dump version 18.3 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: hugocandido
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO hugocandido;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: hugocandido
--

COMMENT ON SCHEMA public IS '';


--
-- Name: BloqueioStatus; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."BloqueioStatus" AS ENUM (
    'LIMPO',
    'ALERTA',
    'CONFIRMADO',
    'IGNORADO'
);


ALTER TYPE public."BloqueioStatus" OWNER TO hugocandido;

--
-- Name: CadenceType; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."CadenceType" AS ENUM (
    'STANDARD',
    'REATIVACAO',
    'FAST_TRACK'
);


ALTER TYPE public."CadenceType" OWNER TO hugocandido;

--
-- Name: Channel; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."Channel" AS ENUM (
    'call',
    'whatsapp',
    'email',
    'sms',
    'instagram',
    'meeting',
    'other'
);


ALTER TYPE public."Channel" OWNER TO hugocandido;

--
-- Name: Direction; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."Direction" AS ENUM (
    'outbound',
    'inbound'
);


ALTER TYPE public."Direction" OWNER TO hugocandido;

--
-- Name: HandoffStatus; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."HandoffStatus" AS ENUM (
    'PENDENTE',
    'ACEITO',
    'DEVOLVIDO'
);


ALTER TYPE public."HandoffStatus" OWNER TO hugocandido;

--
-- Name: IcpTier; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."IcpTier" AS ENUM (
    'FORA',
    'PARCIAL',
    'QUENTE',
    'CONTRATO_CERTO'
);


ALTER TYPE public."IcpTier" OWNER TO hugocandido;

--
-- Name: IntegrabilityScore; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."IntegrabilityScore" AS ENUM (
    'ALTA',
    'MEDIA',
    'DIFICIL'
);


ALTER TYPE public."IntegrabilityScore" OWNER TO hugocandido;

--
-- Name: InteractionSource; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."InteractionSource" AS ENUM (
    'CADENCIA',
    'MANUAL',
    'WEBHOOK'
);


ALTER TYPE public."InteractionSource" OWNER TO hugocandido;

--
-- Name: InteractionType; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."InteractionType" AS ENUM (
    'EMAIL',
    'WHATSAPP',
    'LIGACAO',
    'LINKEDIN',
    'REUNIAO',
    'NOTA'
);


ALTER TYPE public."InteractionType" OWNER TO hugocandido;

--
-- Name: LeadFinalStatus; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."LeadFinalStatus" AS ENUM (
    'in_progress',
    'booked',
    'lost'
);


ALTER TYPE public."LeadFinalStatus" OWNER TO hugocandido;

--
-- Name: LeadStatus; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."LeadStatus" AS ENUM (
    'CONTA_FRIA',
    'EM_PROSPECCAO',
    'REUNIAO_AGENDADA',
    'OPORTUNIDADE_QUALIFICADA',
    'NUTRICAO',
    'SEM_PERFIL'
);


ALTER TYPE public."LeadStatus" OWNER TO hugocandido;

--
-- Name: MomentoCompra; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."MomentoCompra" AS ENUM (
    'URGENTE',
    'PESQUISANDO',
    'FUTURO',
    'SEM_TIMING'
);


ALTER TYPE public."MomentoCompra" OWNER TO hugocandido;

--
-- Name: Outcome; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."Outcome" AS ENUM (
    'no_answer',
    'voicemail',
    'invalid_number',
    'seen_no_reply',
    'responded',
    'spoke_to_gatekeeper',
    'spoke_to_decision_maker',
    'asked_to_follow_up',
    'not_interested',
    'booked',
    'lost'
);


ALTER TYPE public."Outcome" OWNER TO hugocandido;

--
-- Name: PrrTier; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."PrrTier" AS ENUM (
    'A',
    'B',
    'C'
);


ALTER TYPE public."PrrTier" OWNER TO hugocandido;

--
-- Name: RecompraSignal; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."RecompraSignal" AS ENUM (
    'ALTA',
    'MEDIA',
    'BAIXA'
);


ALTER TYPE public."RecompraSignal" OWNER TO hugocandido;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."Role" AS ENUM (
    'SDR',
    'GESTOR',
    'CLOSER'
);


ALTER TYPE public."Role" OWNER TO hugocandido;

--
-- Name: StepChannel; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."StepChannel" AS ENUM (
    'EMAIL',
    'WHATSAPP',
    'LIGACAO',
    'LINKEDIN'
);


ALTER TYPE public."StepChannel" OWNER TO hugocandido;

--
-- Name: StepStatus; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."StepStatus" AS ENUM (
    'PENDENTE',
    'EXECUTADO',
    'PULADO',
    'ATRASADO',
    'CANCELADO'
);


ALTER TYPE public."StepStatus" OWNER TO hugocandido;

--
-- Name: TouchpointType; Type: TYPE; Schema: public; Owner: hugocandido
--

CREATE TYPE public."TouchpointType" AS ENUM (
    'attempt',
    'effective_contact',
    'follow_up',
    'response',
    'reschedule',
    'booking',
    'other'
);


ALTER TYPE public."TouchpointType" OWNER TO hugocandido;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO hugocandido;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text,
    lead_id text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO hugocandido;

--
-- Name: block_events; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.block_events (
    id text NOT NULL,
    lead_id text NOT NULL,
    rule_id text,
    detectado_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmado boolean DEFAULT false NOT NULL,
    confirmado_at timestamp(3) without time zone,
    confirmado_by text,
    ignorado boolean DEFAULT false NOT NULL,
    ignorado_at timestamp(3) without time zone,
    ignorado_by text,
    justificativa text,
    motivos jsonb
);


ALTER TABLE public.block_events OWNER TO hugocandido;

--
-- Name: block_rules; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.block_rules (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    condition jsonb NOT NULL,
    justificativa text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.block_rules OWNER TO hugocandido;

--
-- Name: brand_configs; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.brand_configs (
    id text NOT NULL,
    app_name text DEFAULT 'Retentio'::text NOT NULL,
    logo_url text,
    favicon_url text,
    icon_192_url text,
    icon_512_url text,
    color_accent text DEFAULT '#2E86AB'::text NOT NULL,
    color_navy text DEFAULT '#1E3A5F'::text NOT NULL,
    color_green text DEFAULT '#1A7A5E'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.brand_configs OWNER TO hugocandido;

--
-- Name: cadence_insights; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.cadence_insights (
    id text NOT NULL,
    cadence_signature text NOT NULL,
    leads_count integer NOT NULL,
    touchpoints_count integer NOT NULL,
    response_rate double precision NOT NULL,
    booking_rate double precision NOT NULL,
    avg_days_to_book double precision,
    median_touchpoints_to_book double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.cadence_insights OWNER TO hugocandido;

--
-- Name: cadence_steps; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.cadence_steps (
    id text NOT NULL,
    cadence_id text NOT NULL,
    step_order integer NOT NULL,
    day_offset integer NOT NULL,
    channel public."StepChannel" NOT NULL,
    template_id text,
    instructions text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.cadence_steps OWNER TO hugocandido;

--
-- Name: cadences; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.cadences (
    id text NOT NULL,
    name text NOT NULL,
    type public."CadenceType" DEFAULT 'STANDARD'::public."CadenceType" NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.cadences OWNER TO hugocandido;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.calendar_events (
    id text NOT NULL,
    google_event_id text NOT NULL,
    lead_id text NOT NULL,
    closer_user_id text NOT NULL,
    sdr_user_id text NOT NULL,
    titulo text NOT NULL,
    descricao text,
    inicio timestamp(3) without time zone NOT NULL,
    fim timestamp(3) without time zone NOT NULL,
    meet_link text,
    status text DEFAULT 'confirmed'::text NOT NULL,
    convidados text[],
    sincronizado_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.calendar_events OWNER TO hugocandido;

--
-- Name: daily_tasks; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.daily_tasks (
    id text NOT NULL,
    lead_id text NOT NULL,
    sdr_id text NOT NULL,
    date date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'PENDENTE'::text NOT NULL,
    resultado text,
    proximo_contato timestamp(3) without time zone,
    canal text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.daily_tasks OWNER TO hugocandido;

--
-- Name: discovered_stacks; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.discovered_stacks (
    id text NOT NULL,
    lead_id text NOT NULL,
    category text NOT NULL,
    tool_name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.discovered_stacks OWNER TO hugocandido;

--
-- Name: email_events; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.email_events (
    id text NOT NULL,
    interaction_id text,
    resend_email_id text NOT NULL,
    type text NOT NULL,
    data jsonb,
    link text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.email_events OWNER TO hugocandido;

--
-- Name: google_integrations; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.google_integrations (
    id text NOT NULL,
    user_id text NOT NULL,
    google_email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expiry timestamp(3) without time zone NOT NULL,
    calendar_id text DEFAULT 'primary'::text NOT NULL,
    escopos text[],
    ativo boolean DEFAULT true NOT NULL,
    connected_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.google_integrations OWNER TO hugocandido;

--
-- Name: handoff_briefings; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.handoff_briefings (
    id text NOT NULL,
    lead_id text NOT NULL,
    sdr_id text NOT NULL,
    closer_id text,
    status public."HandoffStatus" DEFAULT 'PENDENTE'::public."HandoffStatus" NOT NULL,
    briefing_data jsonb NOT NULL,
    accepted_at timestamp(3) without time zone,
    returned_at timestamp(3) without time zone,
    return_reason text,
    return_reentry_status public."LeadStatus",
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.handoff_briefings OWNER TO hugocandido;

--
-- Name: icp_answers; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.icp_answers (
    id text NOT NULL,
    lead_id text NOT NULL,
    criteria_id text NOT NULL,
    answer_value text NOT NULL,
    score_points integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.icp_answers OWNER TO hugocandido;

--
-- Name: icp_criteria; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.icp_criteria (
    id text NOT NULL,
    "order" integer NOT NULL,
    label text NOT NULL,
    type text NOT NULL,
    options jsonb,
    weight integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.icp_criteria OWNER TO hugocandido;

--
-- Name: interactions; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.interactions (
    id text NOT NULL,
    lead_id text NOT NULL,
    type public."InteractionType" NOT NULL,
    source public."InteractionSource" DEFAULT 'MANUAL'::public."InteractionSource" NOT NULL,
    channel text,
    external_id text,
    subject text,
    body text,
    status text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.interactions OWNER TO hugocandido;

--
-- Name: lead_cadence_steps; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.lead_cadence_steps (
    id text NOT NULL,
    lead_cadence_id text NOT NULL,
    cadence_step_id text NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    executed_at timestamp(3) without time zone,
    status public."StepStatus" DEFAULT 'PENDENTE'::public."StepStatus" NOT NULL,
    skip_reason text
);


ALTER TABLE public.lead_cadence_steps OWNER TO hugocandido;

--
-- Name: lead_cadences; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.lead_cadences (
    id text NOT NULL,
    lead_id text NOT NULL,
    cadence_id text NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    paused_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone
);


ALTER TABLE public.lead_cadences OWNER TO hugocandido;

--
-- Name: lead_journey_summaries; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.lead_journey_summaries (
    id text NOT NULL,
    lead_id text NOT NULL,
    total_touchpoints integer DEFAULT 0 NOT NULL,
    total_effective_contacts integer DEFAULT 0 NOT NULL,
    total_no_response_attempts integer DEFAULT 0 NOT NULL,
    first_contact_channel text,
    second_contact_channel text,
    last_contact_channel text,
    first_touch_at timestamp(3) without time zone,
    last_touch_at timestamp(3) without time zone,
    first_response_at timestamp(3) without time zone,
    booked_at timestamp(3) without time zone,
    lost_at timestamp(3) without time zone,
    days_to_first_contact double precision,
    days_to_book double precision,
    touchpoints_to_book integer,
    final_status public."LeadFinalStatus" DEFAULT 'in_progress'::public."LeadFinalStatus" NOT NULL,
    cadence_signature text
);


ALTER TABLE public.lead_journey_summaries OWNER TO hugocandido;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.leads (
    id text NOT NULL,
    sdr_id text NOT NULL,
    status public."LeadStatus" DEFAULT 'CONTA_FRIA'::public."LeadStatus" NOT NULL,
    domain text,
    company_name text NOT NULL,
    niche text,
    company_size text,
    cnpj text,
    contact_name text,
    contact_role text,
    email text,
    phone text,
    whatsapp text,
    instagram_handle text,
    linkedin_url text,
    website_url text,
    state text,
    city text,
    ecommerce_platform text,
    estimated_base_size integer,
    avg_ticket_estimated double precision,
    lead_status_origin text,
    notes_import text,
    source text,
    processed_at timestamp(3) without time zone,
    imported_at timestamp(3) without time zone,
    prr_score double precision,
    prr_tier public."PrrTier",
    icp_score integer,
    icp_tier public."IcpTier",
    bloqueio_status public."BloqueioStatus" DEFAULT 'LIMPO'::public."BloqueioStatus" NOT NULL,
    bloqueio_motivos jsonb,
    momento_compra public."MomentoCompra",
    recompra_signal public."RecompraSignal",
    recompra_cycle text,
    company_type text,
    integrability_level text,
    integrability public."IntegrabilityScore",
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.leads OWNER TO hugocandido;

--
-- Name: metas; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.metas (
    id text NOT NULL,
    sdr_id text,
    tipo text NOT NULL,
    valor integer NOT NULL,
    periodo text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.metas OWNER TO hugocandido;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    tipo text NOT NULL,
    titulo text NOT NULL,
    corpo text NOT NULL,
    url text,
    lida boolean DEFAULT false NOT NULL,
    enviada_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lead_id text
);


ALTER TABLE public.notifications OWNER TO hugocandido;

--
-- Name: prr_inputs; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.prr_inputs (
    id text NOT NULL,
    lead_id text NOT NULL,
    base_size_estimated integer,
    recompra_cycle_days integer,
    avg_ticket_estimated double precision,
    inactive_base_pct double precision,
    integrability_score integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.prr_inputs OWNER TO hugocandido;

--
-- Name: prr_weights; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.prr_weights (
    id text NOT NULL,
    dimension text NOT NULL,
    weight double precision NOT NULL,
    min_value double precision,
    max_value double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.prr_weights OWNER TO hugocandido;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.push_subscriptions (
    id text NOT NULL,
    user_id text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO hugocandido;

--
-- Name: resend_configs; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.resend_configs (
    id text NOT NULL,
    user_id text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    encrypted_api_key text NOT NULL,
    daily_limit integer DEFAULT 50 NOT NULL,
    sent_today integer DEFAULT 0 NOT NULL,
    last_reset_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.resend_configs OWNER TO hugocandido;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.templates (
    id text NOT NULL,
    name text NOT NULL,
    subject text,
    body text NOT NULL,
    channel public."StepChannel" DEFAULT 'EMAIL'::public."StepChannel" NOT NULL,
    variables jsonb,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.templates OWNER TO hugocandido;

--
-- Name: touchpoints; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.touchpoints (
    id text NOT NULL,
    lead_id text NOT NULL,
    owner_id text NOT NULL,
    sequence_number integer NOT NULL,
    channel public."Channel" NOT NULL,
    touchpoint_type public."TouchpointType" NOT NULL,
    outcome public."Outcome" NOT NULL,
    direction public."Direction",
    answered boolean,
    booked boolean,
    lost boolean,
    duration_seconds integer,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hours_since_previous_touch double precision,
    days_since_lead_created double precision,
    generated_next_step boolean DEFAULT false
);


ALTER TABLE public.touchpoints OWNER TO hugocandido;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hugocandido
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role public."Role" NOT NULL,
    avatar_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO hugocandido;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
61b1d73e-6ffb-4477-abd9-999195c06b83	aa2d5a244cafcaf282d69c2a85660ae61a0cb0ce30c19c008e691aee739eef07	2026-03-16 12:45:04.253462-03	20260316154504_add_touchpoints	\N	\N	2026-03-16 12:45:04.199389-03	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.audit_logs (id, user_id, lead_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: block_events; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.block_events (id, lead_id, rule_id, detectado_at, confirmado, confirmado_at, confirmado_by, ignorado, ignorado_at, ignorado_by, justificativa, motivos) FROM stdin;
\.


--
-- Data for Name: block_rules; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.block_rules (id, name, description, condition, justificativa, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: brand_configs; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.brand_configs (id, app_name, logo_url, favicon_url, icon_192_url, icon_512_url, color_accent, color_navy, color_green, updated_at) FROM stdin;
\.


--
-- Data for Name: cadence_insights; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.cadence_insights (id, cadence_signature, leads_count, touchpoints_count, response_rate, booking_rate, avg_days_to_book, median_touchpoints_to_book, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cadence_steps; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.cadence_steps (id, cadence_id, step_order, day_offset, channel, template_id, instructions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cadences; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.cadences (id, name, type, description, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.calendar_events (id, google_event_id, lead_id, closer_user_id, sdr_user_id, titulo, descricao, inicio, fim, meet_link, status, convidados, sincronizado_at, created_at) FROM stdin;
\.


--
-- Data for Name: daily_tasks; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.daily_tasks (id, lead_id, sdr_id, date, status, resultado, proximo_contato, canal, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: discovered_stacks; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.discovered_stacks (id, lead_id, category, tool_name, created_at) FROM stdin;
\.


--
-- Data for Name: email_events; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.email_events (id, interaction_id, resend_email_id, type, data, link, created_at) FROM stdin;
\.


--
-- Data for Name: google_integrations; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.google_integrations (id, user_id, google_email, access_token, refresh_token, token_expiry, calendar_id, escopos, ativo, connected_at, updated_at) FROM stdin;
\.


--
-- Data for Name: handoff_briefings; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.handoff_briefings (id, lead_id, sdr_id, closer_id, status, briefing_data, accepted_at, returned_at, return_reason, return_reentry_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: icp_answers; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.icp_answers (id, lead_id, criteria_id, answer_value, score_points, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: icp_criteria; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.icp_criteria (id, "order", label, type, options, weight, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactions; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.interactions (id, lead_id, type, source, channel, external_id, subject, body, status, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: lead_cadence_steps; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.lead_cadence_steps (id, lead_cadence_id, cadence_step_id, scheduled_at, executed_at, status, skip_reason) FROM stdin;
\.


--
-- Data for Name: lead_cadences; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.lead_cadences (id, lead_id, cadence_id, started_at, status, paused_at, completed_at) FROM stdin;
\.


--
-- Data for Name: lead_journey_summaries; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.lead_journey_summaries (id, lead_id, total_touchpoints, total_effective_contacts, total_no_response_attempts, first_contact_channel, second_contact_channel, last_contact_channel, first_touch_at, last_touch_at, first_response_at, booked_at, lost_at, days_to_first_contact, days_to_book, touchpoints_to_book, final_status, cadence_signature) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.leads (id, sdr_id, status, domain, company_name, niche, company_size, cnpj, contact_name, contact_role, email, phone, whatsapp, instagram_handle, linkedin_url, website_url, state, city, ecommerce_platform, estimated_base_size, avg_ticket_estimated, lead_status_origin, notes_import, source, processed_at, imported_at, prr_score, prr_tier, icp_score, icp_tier, bloqueio_status, bloqueio_motivos, momento_compra, recompra_signal, recompra_cycle, company_type, integrability_level, integrability, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: metas; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.metas (id, sdr_id, tipo, valor, periodo, ativo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.notifications (id, user_id, tipo, titulo, corpo, url, lida, enviada_at, lead_id) FROM stdin;
\.


--
-- Data for Name: prr_inputs; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.prr_inputs (id, lead_id, base_size_estimated, recompra_cycle_days, avg_ticket_estimated, inactive_base_pct, integrability_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: prr_weights; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.prr_weights (id, dimension, weight, min_value, max_value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: resend_configs; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.resend_configs (id, user_id, from_email, from_name, encrypted_api_key, daily_limit, sent_today, last_reset_at, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.templates (id, name, subject, body, channel, variables, version, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: touchpoints; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.touchpoints (id, lead_id, owner_id, sequence_number, channel, touchpoint_type, outcome, direction, answered, booked, lost, duration_seconds, notes, created_at, hours_since_previous_touch, days_since_lead_created, generated_next_step) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hugocandido
--

COPY public.users (id, email, password_hash, name, role, avatar_url, active, created_at, updated_at) FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: block_events block_events_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.block_events
    ADD CONSTRAINT block_events_pkey PRIMARY KEY (id);


--
-- Name: block_rules block_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.block_rules
    ADD CONSTRAINT block_rules_pkey PRIMARY KEY (id);


--
-- Name: brand_configs brand_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.brand_configs
    ADD CONSTRAINT brand_configs_pkey PRIMARY KEY (id);


--
-- Name: cadence_insights cadence_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.cadence_insights
    ADD CONSTRAINT cadence_insights_pkey PRIMARY KEY (id);


--
-- Name: cadence_steps cadence_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.cadence_steps
    ADD CONSTRAINT cadence_steps_pkey PRIMARY KEY (id);


--
-- Name: cadences cadences_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.cadences
    ADD CONSTRAINT cadences_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: daily_tasks daily_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_pkey PRIMARY KEY (id);


--
-- Name: discovered_stacks discovered_stacks_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.discovered_stacks
    ADD CONSTRAINT discovered_stacks_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: google_integrations google_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.google_integrations
    ADD CONSTRAINT google_integrations_pkey PRIMARY KEY (id);


--
-- Name: handoff_briefings handoff_briefings_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.handoff_briefings
    ADD CONSTRAINT handoff_briefings_pkey PRIMARY KEY (id);


--
-- Name: icp_answers icp_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.icp_answers
    ADD CONSTRAINT icp_answers_pkey PRIMARY KEY (id);


--
-- Name: icp_criteria icp_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.icp_criteria
    ADD CONSTRAINT icp_criteria_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);


--
-- Name: lead_cadence_steps lead_cadence_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_cadence_steps
    ADD CONSTRAINT lead_cadence_steps_pkey PRIMARY KEY (id);


--
-- Name: lead_cadences lead_cadences_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_cadences
    ADD CONSTRAINT lead_cadences_pkey PRIMARY KEY (id);


--
-- Name: lead_journey_summaries lead_journey_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_journey_summaries
    ADD CONSTRAINT lead_journey_summaries_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: metas metas_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: prr_inputs prr_inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.prr_inputs
    ADD CONSTRAINT prr_inputs_pkey PRIMARY KEY (id);


--
-- Name: prr_weights prr_weights_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.prr_weights
    ADD CONSTRAINT prr_weights_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: resend_configs resend_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.resend_configs
    ADD CONSTRAINT resend_configs_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: touchpoints touchpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.touchpoints
    ADD CONSTRAINT touchpoints_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC);


--
-- Name: audit_logs_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX audit_logs_entity_type_entity_id_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: block_events_confirmado_ignorado_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX block_events_confirmado_ignorado_idx ON public.block_events USING btree (confirmado, ignorado);


--
-- Name: block_events_lead_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX block_events_lead_id_idx ON public.block_events USING btree (lead_id);


--
-- Name: cadence_insights_cadence_signature_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX cadence_insights_cadence_signature_idx ON public.cadence_insights USING btree (cadence_signature);


--
-- Name: cadence_steps_cadence_id_step_order_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX cadence_steps_cadence_id_step_order_key ON public.cadence_steps USING btree (cadence_id, step_order);


--
-- Name: calendar_events_closer_user_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX calendar_events_closer_user_id_idx ON public.calendar_events USING btree (closer_user_id);


--
-- Name: calendar_events_google_event_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX calendar_events_google_event_id_key ON public.calendar_events USING btree (google_event_id);


--
-- Name: calendar_events_inicio_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX calendar_events_inicio_idx ON public.calendar_events USING btree (inicio);


--
-- Name: calendar_events_lead_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX calendar_events_lead_id_idx ON public.calendar_events USING btree (lead_id);


--
-- Name: calendar_events_sdr_user_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX calendar_events_sdr_user_id_idx ON public.calendar_events USING btree (sdr_user_id);


--
-- Name: daily_tasks_lead_id_sdr_id_date_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX daily_tasks_lead_id_sdr_id_date_key ON public.daily_tasks USING btree (lead_id, sdr_id, date);


--
-- Name: daily_tasks_sdr_id_date_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX daily_tasks_sdr_id_date_idx ON public.daily_tasks USING btree (sdr_id, date);


--
-- Name: daily_tasks_status_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX daily_tasks_status_idx ON public.daily_tasks USING btree (status);


--
-- Name: discovered_stacks_lead_id_category_tool_name_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX discovered_stacks_lead_id_category_tool_name_key ON public.discovered_stacks USING btree (lead_id, category, tool_name);


--
-- Name: discovered_stacks_lead_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX discovered_stacks_lead_id_idx ON public.discovered_stacks USING btree (lead_id);


--
-- Name: email_events_created_at_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX email_events_created_at_idx ON public.email_events USING btree (created_at DESC);


--
-- Name: email_events_interaction_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX email_events_interaction_id_idx ON public.email_events USING btree (interaction_id);


--
-- Name: email_events_resend_email_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX email_events_resend_email_id_idx ON public.email_events USING btree (resend_email_id);


--
-- Name: email_events_type_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX email_events_type_idx ON public.email_events USING btree (type);


--
-- Name: google_integrations_user_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX google_integrations_user_id_key ON public.google_integrations USING btree (user_id);


--
-- Name: handoff_briefings_closer_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX handoff_briefings_closer_id_idx ON public.handoff_briefings USING btree (closer_id);


--
-- Name: handoff_briefings_sdr_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX handoff_briefings_sdr_id_idx ON public.handoff_briefings USING btree (sdr_id);


--
-- Name: handoff_briefings_status_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX handoff_briefings_status_idx ON public.handoff_briefings USING btree (status);


--
-- Name: icp_answers_lead_id_criteria_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX icp_answers_lead_id_criteria_id_key ON public.icp_answers USING btree (lead_id, criteria_id);


--
-- Name: icp_criteria_active_order_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX icp_criteria_active_order_idx ON public.icp_criteria USING btree (active, "order");


--
-- Name: interactions_external_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX interactions_external_id_idx ON public.interactions USING btree (external_id);


--
-- Name: interactions_lead_id_created_at_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX interactions_lead_id_created_at_idx ON public.interactions USING btree (lead_id, created_at DESC);


--
-- Name: interactions_type_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX interactions_type_idx ON public.interactions USING btree (type);


--
-- Name: lead_cadence_steps_lead_cadence_id_cadence_step_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX lead_cadence_steps_lead_cadence_id_cadence_step_id_key ON public.lead_cadence_steps USING btree (lead_cadence_id, cadence_step_id);


--
-- Name: lead_cadence_steps_status_scheduled_at_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX lead_cadence_steps_status_scheduled_at_idx ON public.lead_cadence_steps USING btree (status, scheduled_at);


--
-- Name: lead_cadences_lead_id_cadence_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX lead_cadences_lead_id_cadence_id_key ON public.lead_cadences USING btree (lead_id, cadence_id);


--
-- Name: lead_cadences_status_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX lead_cadences_status_idx ON public.lead_cadences USING btree (status);


--
-- Name: lead_journey_summaries_lead_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX lead_journey_summaries_lead_id_key ON public.lead_journey_summaries USING btree (lead_id);


--
-- Name: leads_bloqueio_status_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_bloqueio_status_idx ON public.leads USING btree (bloqueio_status);


--
-- Name: leads_cnpj_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX leads_cnpj_key ON public.leads USING btree (cnpj);


--
-- Name: leads_company_name_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_company_name_idx ON public.leads USING btree (company_name);


--
-- Name: leads_domain_sdr_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX leads_domain_sdr_id_key ON public.leads USING btree (domain, sdr_id);


--
-- Name: leads_email_sdr_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX leads_email_sdr_id_key ON public.leads USING btree (email, sdr_id);


--
-- Name: leads_icp_tier_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_icp_tier_idx ON public.leads USING btree (icp_tier);


--
-- Name: leads_prr_tier_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_prr_tier_idx ON public.leads USING btree (prr_tier);


--
-- Name: leads_sdr_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_sdr_id_idx ON public.leads USING btree (sdr_id);


--
-- Name: leads_sdr_id_prr_score_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_sdr_id_prr_score_idx ON public.leads USING btree (sdr_id, prr_score DESC);


--
-- Name: leads_sdr_id_status_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_sdr_id_status_idx ON public.leads USING btree (sdr_id, status);


--
-- Name: leads_status_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX leads_status_idx ON public.leads USING btree (status);


--
-- Name: metas_sdr_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX metas_sdr_id_idx ON public.metas USING btree (sdr_id);


--
-- Name: metas_tipo_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX metas_tipo_idx ON public.metas USING btree (tipo);


--
-- Name: notifications_user_id_enviada_at_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX notifications_user_id_enviada_at_idx ON public.notifications USING btree (user_id, enviada_at DESC);


--
-- Name: notifications_user_id_lida_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX notifications_user_id_lida_idx ON public.notifications USING btree (user_id, lida);


--
-- Name: prr_inputs_lead_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX prr_inputs_lead_id_key ON public.prr_inputs USING btree (lead_id);


--
-- Name: prr_weights_dimension_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX prr_weights_dimension_key ON public.prr_weights USING btree (dimension);


--
-- Name: push_subscriptions_endpoint_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);


--
-- Name: push_subscriptions_user_id_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);


--
-- Name: resend_configs_user_id_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX resend_configs_user_id_key ON public.resend_configs USING btree (user_id);


--
-- Name: templates_channel_active_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX templates_channel_active_idx ON public.templates USING btree (channel, active);


--
-- Name: touchpoints_lead_id_created_at_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX touchpoints_lead_id_created_at_idx ON public.touchpoints USING btree (lead_id, created_at DESC);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: hugocandido
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: audit_logs audit_logs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: block_events block_events_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.block_events
    ADD CONSTRAINT block_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: block_events block_events_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.block_events
    ADD CONSTRAINT block_events_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.block_rules(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cadence_steps cadence_steps_cadence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.cadence_steps
    ADD CONSTRAINT cadence_steps_cadence_id_fkey FOREIGN KEY (cadence_id) REFERENCES public.cadences(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cadence_steps cadence_steps_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.cadence_steps
    ADD CONSTRAINT cadence_steps_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: daily_tasks daily_tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: daily_tasks daily_tasks_sdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: discovered_stacks discovered_stacks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.discovered_stacks
    ADD CONSTRAINT discovered_stacks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: email_events email_events_interaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.interactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: google_integrations google_integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.google_integrations
    ADD CONSTRAINT google_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: handoff_briefings handoff_briefings_closer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.handoff_briefings
    ADD CONSTRAINT handoff_briefings_closer_id_fkey FOREIGN KEY (closer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: handoff_briefings handoff_briefings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.handoff_briefings
    ADD CONSTRAINT handoff_briefings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: handoff_briefings handoff_briefings_sdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.handoff_briefings
    ADD CONSTRAINT handoff_briefings_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: icp_answers icp_answers_criteria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.icp_answers
    ADD CONSTRAINT icp_answers_criteria_id_fkey FOREIGN KEY (criteria_id) REFERENCES public.icp_criteria(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: icp_answers icp_answers_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.icp_answers
    ADD CONSTRAINT icp_answers_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: interactions interactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lead_cadence_steps lead_cadence_steps_cadence_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_cadence_steps
    ADD CONSTRAINT lead_cadence_steps_cadence_step_id_fkey FOREIGN KEY (cadence_step_id) REFERENCES public.cadence_steps(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_cadence_steps lead_cadence_steps_lead_cadence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_cadence_steps
    ADD CONSTRAINT lead_cadence_steps_lead_cadence_id_fkey FOREIGN KEY (lead_cadence_id) REFERENCES public.lead_cadences(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lead_cadences lead_cadences_cadence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_cadences
    ADD CONSTRAINT lead_cadences_cadence_id_fkey FOREIGN KEY (cadence_id) REFERENCES public.cadences(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_cadences lead_cadences_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_cadences
    ADD CONSTRAINT lead_cadences_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lead_journey_summaries lead_journey_summaries_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.lead_journey_summaries
    ADD CONSTRAINT lead_journey_summaries_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leads leads_sdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: metas metas_sdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: prr_inputs prr_inputs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.prr_inputs
    ADD CONSTRAINT prr_inputs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resend_configs resend_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.resend_configs
    ADD CONSTRAINT resend_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: touchpoints touchpoints_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.touchpoints
    ADD CONSTRAINT touchpoints_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: touchpoints touchpoints_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hugocandido
--

ALTER TABLE ONLY public.touchpoints
    ADD CONSTRAINT touchpoints_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: hugocandido
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict jlBx0mo87MVeWTG8Oo3lMa010KXbT8baj4uUUhA4M4qHhBAWYRLQL2TIfmXbeRV

