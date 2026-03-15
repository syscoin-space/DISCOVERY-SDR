/**
 * Rotas de configuração Resend por SDR.
 * Cada SDR gerencia sua própria chave API — multi-tenant.
 */

import { Router } from 'express';
import { z } from 'zod';
import { resendService } from './resend.service';
import { asyncHandler, validate, authGuard } from '../../middlewares';

export const resendRouter = Router();
resendRouter.use(authGuard);

const configSchema = z.object({
  from_email: z.string().email(),
  from_name: z.string().max(80).optional(),
  api_key: z.string().min(20, 'API key parece inválida'),
  daily_limit: z.number().int().min(1).max(500).optional(),
});

const testSchema = z.object({
  to: z.string().email(),
});

// GET /resend/config
resendRouter.get(
  '/config',
  asyncHandler(async (req, res) => {
    const config = await resendService.getConfig(req.user!.sub);
    if (!config) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }
    res.json(config);
  }),
);

// PUT /resend/config
resendRouter.put(
  '/config',
  validate(configSchema),
  asyncHandler(async (req, res) => {
    const config = await resendService.upsertConfig(req.user!.sub, req.body);
    res.json(config);
  }),
);

// POST /resend/test
resendRouter.post(
  '/test',
  validate(testSchema),
  asyncHandler(async (req, res) => {
    const result = await resendService.testConnection(req.user!.sub, req.body.to);
    res.json(result);
  }),
);
