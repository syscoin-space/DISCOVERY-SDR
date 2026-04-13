import { z } from 'zod';
import { LeadStatus, InteractionType } from '@prisma/client';

export const createLeadSchema = z.object({
  company_name: z.string().min(1).max(255),
  domain: z.string().max(255).optional().nullable(),
  cnpj: z.string().max(18).optional().nullable(),
  segment: z.string().max(100).optional().nullable(),
  company_size: z.string().max(50).optional().nullable(),
  contact_name: z.string().max(150).optional().nullable(),
  contact_role: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
  instagram: z.string().max(50).optional().nullable(),
  linkedin: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  icp_score: z.number().int().min(0).max(100).optional().nullable(),
  dm_name: z.string().max(150).optional().nullable(),
  dm_role: z.string().max(100).optional().nullable(),
  direct_phone: z.string().max(20).optional().nullable(),
  direct_email: z.string().email().optional().nullable(),
  preferred_channel: z.enum(['EMAIL', 'WHATSAPP', 'PHONE', 'LINKEDIN']).optional().nullable(),
  discovery_notes: z.string().optional().nullable(),
  sdr_id: z.string().uuid().optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.nativeEnum(LeadStatus).optional(),
  sdr_id: z.string().uuid().optional().nullable(),
  best_channel: z.string().max(100).optional().nullable(),
  discovery_status: z.string().optional(), // DiscoveryStatus enum string
  prr_inputs: z.record(z.any()).optional().nullable(), // JSON livre para Diagnóstico Comercial
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

export const leadFiltersSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  search: z.string().max(100).optional(),
  sdr_id: z.string().uuid().optional(), // Para managers filtrarem por SDR
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export const createInteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  body: z.string().min(1),
  channel: z.string().optional(),
  subject: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

export const bulkAssignLeadSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  sdrId: z.string().uuid(),
});
export type BulkAssignLeadInput = z.infer<typeof bulkAssignLeadSchema>;
