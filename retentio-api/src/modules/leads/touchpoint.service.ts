import { prisma } from '../../config/prisma';
import { Outcome } from '@prisma/client';

type CreateTouchpointInput = {
  lead_id: string;
  owner_id: string;
  channel: string;
  touchpoint_type: string;
  outcome: string;
  direction?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
};

export async function createTouchpoint(input: CreateTouchpointInput) {
  // Compute next sequence number
  const last = await prisma.touchpoint.findFirst({
    where: { lead_id: input.lead_id },
    orderBy: { sequence_number: 'desc' },
    select: { sequence_number: true },
  });
  const nextSeq = (last?.sequence_number ?? 0) + 1;

  const tp = await prisma.touchpoint.create({
    data: {
      lead_id: input.lead_id,
      owner_id: input.owner_id,
      sequence_number: nextSeq,
      channel: input.channel as any,
      touchpoint_type: input.touchpoint_type as any,
      outcome: input.outcome as any,
      direction: input.direction as any,
      duration_seconds: input.duration_seconds,
      notes: input.notes,
    },
  });

  // Recalculate journey summary synchronously
  await recalcJourneySummary(input.lead_id);

  return tp;
}

export async function recalcJourneySummary(leadId: string) {
  const touchpoints = await prisma.touchpoint.findMany({ where: { lead_id: leadId }, orderBy: { sequence_number: 'asc' } });

  const total_touchpoints = touchpoints.length;
  const effective_outcomes = new Set<Outcome>(['responded', 'spoke_to_decision_maker', 'booked']);
  const no_response_outcomes = new Set<Outcome>(['no_answer', 'voicemail', 'seen_no_reply']);

  let total_effective_contacts = 0;
  let total_no_response_attempts = 0;
  let first_touch_at: Date | null = null;
  let last_touch_at: Date | null = null;
  let first_response_at: Date | null = null;
  let booked_at: Date | null = null;
  let touchpoints_to_book: number | null = null;
  let first_contact_channel: string | null = null;
  let second_contact_channel: string | null = null;
  let last_contact_channel: string | null = null;

  for (let i = 0; i < touchpoints.length; i++) {
    const t = touchpoints[i];
    if (!first_touch_at) first_touch_at = t.created_at;
    last_touch_at = t.created_at;
    if (i === 0) first_contact_channel = t.channel;
    if (i === 1) second_contact_channel = t.channel;
    last_contact_channel = t.channel;

    if (effective_outcomes.has(t.outcome as Outcome)) {
      if (!first_response_at) first_response_at = t.created_at;
      total_effective_contacts += 1;
    }
    if (no_response_outcomes.has(t.outcome as Outcome)) {
      total_no_response_attempts += 1;
    }
    if (t.outcome === 'booked' && !booked_at) {
      booked_at = t.created_at;
      touchpoints_to_book = t.sequence_number;
    }
  }

  const days_to_first_contact = first_touch_at ? (first_touch_at.getTime() - (await getLeadCreatedAt(leadId)).getTime()) / (1000 * 60 * 60 * 24) : null;
  const days_to_book = booked_at ? (booked_at.getTime() - (await getLeadCreatedAt(leadId)).getTime()) / (1000 * 60 * 60 * 24) : null;

  const final_status = booked_at ? 'booked' : (touchpoints.length > 0 && touchpoints[touchpoints.length - 1].outcome === 'lost' ? 'lost' : 'in_progress');

  // upsert summary
  await prisma.leadJourneySummary.upsert({
    where: { lead_id: leadId },
    create: {
      lead_id: leadId,
      total_touchpoints,
      total_effective_contacts,
      total_no_response_attempts,
      first_contact_channel,
      second_contact_channel,
      last_contact_channel,
      first_touch_at,
      last_touch_at,
      first_response_at,
      booked_at,
      days_to_first_contact: days_to_first_contact ?? undefined,
      days_to_book: days_to_book ?? undefined,
      touchpoints_to_book: touchpoints_to_book ?? undefined,
      final_status: final_status as any,
      cadence_signature: touchpoints.map(t => t.channel).join(' > '),
    },
    update: {
      total_touchpoints,
      total_effective_contacts,
      total_no_response_attempts,
      first_contact_channel,
      second_contact_channel,
      last_contact_channel,
      first_touch_at,
      last_touch_at,
      first_response_at,
      booked_at,
      days_to_first_contact: days_to_first_contact ?? undefined,
      days_to_book: days_to_book ?? undefined,
      touchpoints_to_book: touchpoints_to_book ?? undefined,
      final_status: final_status as any,
      cadence_signature: touchpoints.map(t => t.channel).join(' > '),
    },
  });
}

async function getLeadCreatedAt(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { created_at: true } });
  return lead?.created_at ?? new Date();
}
