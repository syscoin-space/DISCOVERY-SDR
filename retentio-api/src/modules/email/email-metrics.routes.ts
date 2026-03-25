import { Router, Request, Response } from 'express';
import { emailMetricsService } from './email-metrics.service';
import { logger } from '../../config/logger';

export const emailMetricsRouter = Router();

/**
 * GET /api/tenant/email-config/metrics
 * Métricas globais do tenant
 */
emailMetricsRouter.get('/', async (req: Request, res: Response) => {
  const { tenant_id } = (req as any).user;

  try {
    const metrics = await emailMetricsService.getTenantMetrics(tenant_id);
    res.json(metrics);
  } catch (error: any) {
    logger.error('[EmailMetrics] Error fetching tenant metrics:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tenant/email-config/metrics/cadences
 * Performance de todas as cadências
 */
emailMetricsRouter.get('/cadences', async (req: Request, res: Response) => {
  const { tenant_id } = (req as any).user;

  try {
    const performance = await emailMetricsService.listCadencePerformance(tenant_id);
    res.json(performance);
  } catch (error: any) {
    logger.error('[EmailMetrics] Error listing cadence performance:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tenant/email-config/metrics/cadences/:cadenceId
 * Métricas de uma cadência específica
 */
emailMetricsRouter.get('/cadences/:cadenceId', async (req: Request, res: Response) => {
  const { tenant_id } = (req as any).user;
  const { cadenceId } = req.params;

  try {
    const metrics = await emailMetricsService.getCadenceMetrics(tenant_id, cadenceId as string);
    res.json(metrics);
  } catch (error: any) {
    logger.error(`[EmailMetrics] Error fetching metrics for cadence ${cadenceId}:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
