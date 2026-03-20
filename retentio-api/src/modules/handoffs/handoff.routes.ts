import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard, roleGuard, getTenantId, getMembershipId } from '../../middlewares';
import { AppError } from '../../shared/types';
import { HandoffStatus, LeadStatus } from '@prisma/client';
import { eventBus } from '../../shared/events/event-bus';
import { DomainEvent } from '../../shared/events/domain-events';

export const handoffRouter = Router();
handoffRouter.use(authGuard);

const createHandoffSchema = z.object({
  lead_id: z.string().uuid(),
  closer_id: z.string().uuid().optional(), // membership_id
  briefing_custom_notes: z.string().optional(),
});

const returnHandoffSchema = z.object({
  reason: z.string().min(10).max(500),
  reentry_status: z.nativeEnum(LeadStatus),
});

// POST /handoffs — SDR cria handoff
handoffRouter.post(
  '/',
  validate(createHandoffSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.body.lead_id, 
        tenant_id: tenantId,
        sdr_id: membershipId 
      },
      include: { 
        interactions: { take: 10, orderBy: { created_at: 'desc' } } 
      },
    });
    
    if (!lead) throw new AppError(404, 'Lead não encontrado');

    // Auto-gera briefing data based on V2 fields
    const briefingData = {
      company: lead.company_name,
      contact: { 
        name: lead.contact_name, 
        role: lead.contact_role, 
        email: lead.email,
        phone: lead.phone,
        whatsapp: lead.whatsapp 
      },
      segment: lead.segment,
      size: lead.company_size,
      icp_score: lead.icp_score,
      custom_notes: req.body.briefing_custom_notes,
      last_interactions: lead.interactions.map(i => ({
        type: i.type,
        date: i.created_at,
        subject: i.subject,
      })),
    };

    const handoff = await prisma.handoffBriefing.create({
      data: {
        lead_id: lead.id,
        sdr_id: membershipId,
        closer_id: req.body.closer_id,
        briefing_data: briefingData as any,
        status: HandoffStatus.PENDENTE,
      },
      include: {
        sdr: { include: { user: { select: { name: true } } } }
      }
    });

    if (handoff.closer_id) {
      eventBus.publish(DomainEvent.HANDOFF_CREATED, {
        tenant_id: tenantId,
        membership_id: membershipId,
        timestamp: new Date().toISOString(),
        data: {
          handoff_id: handoff.id,
          lead_id: lead.id,
          lead_name: lead.contact_name || lead.company_name,
          sdr_id: membershipId,
          sdr_name: handoff.sdr.user.name,
          closer_id: handoff.closer_id,
        }
      });
    }

    res.status(201).json(handoff);
  }),
);

// GET /handoffs
handoffRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const where: any = {
      lead: { tenant_id: tenantId }
    };

    if (req.user?.role === 'CLOSER') {
      where.closer_id = membershipId;
    } else if (req.user?.role === 'SDR') {
      where.sdr_id = membershipId;
    }

    const handoffs = await prisma.handoffBriefing.findMany({
      where,
      include: {
        lead: { select: { id: true, company_name: true, status: true, icp_score: true } },
        sdr: { include: { user: { select: { name: true } } } },
        closer: { include: { user: { select: { name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    
    res.json(handoffs);
  }),
);

// PATCH or POST /handoffs/:id/accept
handoffRouter.post(
  '/:id/accept',
  roleGuard('CLOSER' as any),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const handoff = await prisma.handoffBriefing.findFirst({ 
      where: { 
        id: req.params.id as string,
        lead: { tenant_id: tenantId }
      } 
    });
    
    if (!handoff) throw new AppError(404, 'Handoff não encontrado');
    if (handoff.status !== HandoffStatus.PENDENTE) throw new AppError(422, 'Handoff já processado');

    const updated = await prisma.handoffBriefing.update({
      where: { id: req.params.id as string },
      data: { 
        status: HandoffStatus.ACEITO, 
        closer_id: membershipId, 
        accepted_at: new Date() 
      },
      include: { 
        lead: { select: { contact_name: true, company_name: true } }
      }
    });

    eventBus.publish(DomainEvent.HANDOFF_ACCEPTED as any, {
      tenant_id: tenantId,
      membership_id: membershipId,
      timestamp: new Date().toISOString(),
      data: {
        handoff_id: updated.id,
        lead_id: updated.lead_id,
        lead_name: updated.lead.contact_name || updated.lead.company_name,
        sdr_id: updated.sdr_id,
        closer_id: membershipId,
      }
    });
    
    res.json(updated);
  }),
);

handoffRouter.patch(
  '/:id/accept',
  roleGuard('CLOSER' as any),
  asyncHandler(async (req, res) => {
    // Just forward to the post handler logic or keep it as is
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);


    const handoff = await prisma.handoffBriefing.findFirst({ 
      where: { 
        id: req.params.id as string,
        lead: { tenant_id: tenantId }
      } 
    });
    
    if (!handoff) throw new AppError(404, 'Handoff não encontrado');
    if (handoff.status !== HandoffStatus.PENDENTE) throw new AppError(422, 'Handoff já processado');

    const updated = await prisma.handoffBriefing.update({
      where: { id: req.params.id as string },
      data: { 
        status: HandoffStatus.ACEITO, 
        closer_id: membershipId, 
        accepted_at: new Date() 
      },
      include: { 
        lead: { select: { contact_name: true, company_name: true } }
      }
    });

    eventBus.publish(DomainEvent.HANDOFF_ACCEPTED as any, {
      tenant_id: tenantId,
      membership_id: membershipId,
      timestamp: new Date().toISOString(),
      data: {
        handoff_id: updated.id,
        lead_id: updated.lead_id,
        lead_name: updated.lead.contact_name || updated.lead.company_name,
        sdr_id: updated.sdr_id,
        closer_id: membershipId,
      }
    });
    
    res.json(updated);
  }),
);

// PATCH /handoffs/:id/return
handoffRouter.patch(
  '/:id/return',
  roleGuard('CLOSER' as any),
  validate(returnHandoffSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    const handoff = await prisma.handoffBriefing.findFirst({ 
      where: { 
        id: req.params.id as string,
        lead: { tenant_id: tenantId }
      } 
    });
    
    if (!handoff) throw new AppError(404, 'Handoff não encontrado');
    if (handoff.status !== HandoffStatus.ACEITO) throw new AppError(422, 'Handoff não está aceito');

    const [updated] = await prisma.$transaction([
      prisma.handoffBriefing.update({
        where: { id: req.params.id as string },
        data: {
          status: HandoffStatus.DEVOLVIDO,
          returned_at: new Date(),
          return_reason: req.body.reason,
          return_reentry_status: req.body.reentry_status,
        },
        include: {
          lead: { select: { contact_name: true, company_name: true } }
        }
      }),
      prisma.lead.update({
        where: { id: handoff.lead_id },
        data: { status: req.body.reentry_status },
      }),
    ]);

    eventBus.publish(DomainEvent.HANDOFF_RETURNED as any, {
      tenant_id: tenantId,
      membership_id: membershipId,
      timestamp: new Date().toISOString(),
      data: {
        handoff_id: updated.id,
        lead_id: updated.lead_id,
        lead_name: updated.lead.contact_name || updated.lead.company_name,
        sdr_id: updated.sdr_id,
        reason: req.body.reason,
      }
    });

    res.json(updated);
  }),
);
