import { Router } from 'express';
import { asyncHandler, authGuard, getTenantId, roleGuard } from '../../middlewares';
import { discoveryService } from './discovery.service';
import { prisma } from '../../config/prisma';

export const discoveryRouter = Router();
discoveryRouter.use(authGuard);

/**
 * GET /discovery/metrics
 * Retorna métricas agregadas de discovery para o tenant
 */
discoveryRouter.get(
  '/metrics',
  roleGuard(['MANAGER', 'OWNER'] as any),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const metrics = await discoveryService.getDiscoveryMetrics(tenantId);
    res.json(metrics);
  })
);

/**
 * GET /discovery/leads/:id/nba
 * Retorna a Next Best Action para um lead específico (para debug ou UI isolada)
 */
discoveryRouter.get(
  '/leads/:id/nba',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id: id as string, tenant_id: tenantId }
    });

    if (!lead) return res.status(404).json({ message: 'Lead não encontrado' });

    const nba = await discoveryService.getNextBestAction(lead);
    res.json({ next_best_action: nba });
  })
);
