import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, authGuard, getTenantId, getMembershipId } from '../../middlewares';
import { CadenceService } from './cadence.service';

export const cadenceRouter = Router();
const cadenceService = new CadenceService();

cadenceRouter.use(authGuard);

// ─── Schemas ─────────────────────────────────────────────────────────

const createCadenceSchema = z.object({
  name: z.string().min(3),
  purpose: z.enum(['DISCOVERY', 'PROSPECCAO', 'NUTRICAO', 'CONFIRMACAO']),
  description: z.string().optional(),
  steps: z.array(z.object({
    step_order: z.number().int().min(1),
    day_offset: z.number().int().min(0),
    channel: z.string(),
    template_id: z.string().uuid().optional().nullable(),
    instructions: z.string().optional().nullable(),
  })).min(1),
});

const enrollSchema = z.object({
  lead_id: z.string().uuid(),
});

// ─── Routes ──────────────────────────────────────────────────────────

// GET /cadences
cadenceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const cadences = await cadenceService.listCadences(tenantId);
    res.json(cadences);
  }),
);

// GET /cadences/:id
cadenceRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const cadence = await cadenceService.getCadence(req.params.id as string, tenantId);
    res.json(cadence);
  }),
);

// POST /cadences
cadenceRouter.post(
  '/',
  validate(createCadenceSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const cadence = await cadenceService.createCadence(tenantId, req.body);
    res.status(201).json(cadence);
  }),
);

// POST /cadences/:id/enroll
cadenceRouter.post(
  '/:id/enroll',
  validate(enrollSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const cadenceId = req.params.id as string;
    const { lead_id } = req.body;

    const enrollment = await cadenceService.enrollLead(tenantId, membershipId, lead_id, cadenceId);
    res.status(201).json(enrollment);
  }),
);

// DELETE /cadences/:id/enroll/:leadId
cadenceRouter.delete(
  '/:id/enroll/:leadId',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const cadenceId = req.params.id as string;
    const leadId = req.params.leadId as string;

    await cadenceService.unenrollLead(tenantId, leadId, cadenceId);
    res.status(204).send();
  }),
);
