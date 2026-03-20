import { TouchpointOutcome } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { eventBus } from '../../shared/events/event-bus';
import { DomainEvent } from '../../shared/events/domain-events';

type CreateTouchpointInput = {
  lead_id: string;
  membership_id: string;
  channel: string;
  touchpoint_type: string;
  outcome: TouchpointOutcome;
  answered?: boolean;
  booked?: boolean;
  lost?: boolean;
  duration_seconds?: number | null;
  notes?: string | null;
};

export async function createTouchpoint(input: CreateTouchpointInput) {
  // Compute next sequence number for this lead
  const last = await prisma.touchpoint.findFirst({
    where: { lead_id: input.lead_id },
    orderBy: { sequence_number: 'desc' },
    select: { sequence_number: true },
  });
  const nextSeq = (last?.sequence_number ?? 0) + 1;

  const tp = await prisma.touchpoint.create({
    data: {
      lead_id: input.lead_id,
      membership_id: input.membership_id,
      sequence_number: nextSeq,
      channel: input.channel,
      touchpoint_type: input.touchpoint_type,
      outcome: input.outcome,
      answered: input.answered,
      booked: input.booked,
      lost: input.lost,
      duration_seconds: input.duration_seconds,
      notes: input.notes,
    },
  });

  const lead = await prisma.lead.findUnique({
    where: { id: input.lead_id },
    select: { tenant_id: true }
  });

  if (lead) {
    eventBus.publish(DomainEvent.TOUCHPOINT_CREATED, {
      tenant_id: lead.tenant_id,
      membership_id: input.membership_id,
      timestamp: new Date().toISOString(),
      data: {
        lead_id: input.lead_id,
        touchpoint_id: tp.id,
        outcome: input.outcome,
        notes: input.notes || undefined,
      }
    });
  }

  return tp;
}
