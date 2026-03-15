import { z } from 'zod';
import { LeadStatus, PrrTier, IcpTier, BloqueioStatus, MomentoCompra, RecompraSignal, IntegrabilityScore, InteractionType } from '@prisma/client';

export const createLeadSchema = z.object({
  company_name: z.string().min(1).max(255),
  niche: z.string().max(100).optional(),
  cnpj: z.string().max(18).optional(),
  contact_name: z.string().max(150).optional(),
  contact_role: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  instagram_handle: z.string().max(50).optional(),
  linkedin_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  state: z.string().max(2).optional(),
  city: z.string().max(100).optional(),
  ecommerce_platform: z.string().max(50).optional(),
  estimated_base_size: z.number().int().nonnegative().optional(),
  avg_ticket_estimated: z.number().nonnegative().optional(),
  notes_import: z.string().optional(),
  source: z.string().max(50).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.nativeEnum(LeadStatus).optional(),
  momento_compra: z.nativeEnum(MomentoCompra).optional(),
  recompra_signal: z.nativeEnum(RecompraSignal).optional(),
  integrability: z.nativeEnum(IntegrabilityScore).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

export const leadFiltersSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  prr_tier: z.nativeEnum(PrrTier).optional(),
  icp_tier: z.nativeEnum(IcpTier).optional(),
  bloqueio_status: z.nativeEnum(BloqueioStatus).optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export const blockDecisionSchema = z.object({
  action: z.enum(['confirm', 'ignore']),
  justificativa: z.string().min(20).optional(),
}).refine(data => {
  if (data.action === 'ignore' && (!data.justificativa || data.justificativa.length < 20)) {
    return false;
  }
  return true;
}, {
  message: 'Justificativa é obrigatória (mínimo 20 caracteres) para ignorar o bloqueio',
  path: ['justificativa'],
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
