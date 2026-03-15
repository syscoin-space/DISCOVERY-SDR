import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, authGuard, roleGuard } from '../../middlewares';
import { prrService } from './prr.service';

export const prrRouter = Router();
prrRouter.use(authGuard);

const inputsSchema = z.object({
  base_size_estimated: z.number().int().nonnegative().optional(),
  recompra_cycle_days: z.number().int().positive().optional(),
  avg_ticket_estimated: z.number().nonnegative().optional(),
  inactive_base_pct: z.number().min(0).max(1).optional(),
  integrability_score: z.number().int().min(1).max(5).optional(),
});

const weightSchema = z.object({
  weight: z.number().min(0).max(1),
});

// PUT /prr/:leadId/inputs
prrRouter.put(
  '/:leadId/inputs',
  validate(inputsSchema),
  asyncHandler(async (req, res) => {
    const inputs = await prrService.upsertInputs(req.params.leadId as string, req.body);
    res.json(inputs);
  }),
);

// POST /prr/:leadId/calculate
prrRouter.post(
  '/:leadId/calculate',
  asyncHandler(async (req, res) => {
    const result = await prrService.calculate(req.params.leadId as string);
    res.json(result);
  }),
);

// GET /prr/weights
prrRouter.get(
  '/weights',
  asyncHandler(async (_req, res) => {
    const weights = await prrService.getWeights();
    res.json(weights);
  }),
);

// PATCH /prr/weights/:dimension  (GESTOR only)
prrRouter.patch(
  '/weights/:dimension',
  roleGuard('GESTOR'),
  validate(weightSchema),
  asyncHandler(async (req, res) => {
    const weight = await prrService.updateWeight(req.params.dimension as string, req.body.weight);
    res.json(weight);
  }),
);
