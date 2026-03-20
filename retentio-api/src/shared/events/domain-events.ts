export enum DomainEvent {
  // Lead Events
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_STATUS_CHANGED = 'lead.status_changed',
  LEAD_ASSIGNED = 'lead.assigned',

  // Task Events
  TASK_CREATED = 'task.created',
  TASK_COMPLETED = 'task.completed',
  TASK_CANCELLED = 'task.cancelled',

  // Cadence Events
  CADENCE_ENROLLED = 'cadence.enrolled',
  CADENCE_STEP_COMPLETED = 'cadence.step_completed',
  CADENCE_ADVANCED = 'cadence.advanced',
  CADENCE_UNENROLLED = 'cadence.unenrolled',

  // Handoff Events
  HANDOFF_CREATED = 'handoff.created',
  HANDOFF_ACCEPTED = 'handoff.accepted',
  HANDOFF_RETURNED = 'handoff.returned',

  // Meeting/Agenda
  MEETING_SCHEDULED = 'meeting.scheduled',

  // Interaction / Touchpoint
  INTERACTION_CREATED = 'interaction.created',
  TOUCHPOINT_CREATED = 'touchpoint.created',
}

export interface DomainEventPayload {
  tenant_id: string;
  membership_id: string; // Quero que seja obrigatório para auditoria
  timestamp: string;      // ISO format string
}

export interface LeadStatusChangedPayload extends DomainEventPayload {
  data: {
    lead_id: string;
    old_status: string;
    new_status: string;
  };
}

export interface LeadAssignedPayload extends DomainEventPayload {
  data: {
    lead_id: string;
    lead_name: string;
    sdr_id: string;
  };
}

export interface TaskCompletedPayload extends DomainEventPayload {
  data: {
    task_id: string;
    lead_id: string;
    type: string;
    cadence_enrollment_id?: string;
  };
}
export interface TouchpointCreatedPayload extends DomainEventPayload {
  data: {
    lead_id: string;
    touchpoint_id: string;
    outcome: string; // TouchpointOutcome string
    notes?: string;
  };
}

export interface HandoffCreatedPayload extends DomainEventPayload {
  data: {
    handoff_id: string;
    lead_id: string;
    lead_name: string;
    sdr_id: string;
    sdr_name: string;
    closer_id: string;
  };
}
