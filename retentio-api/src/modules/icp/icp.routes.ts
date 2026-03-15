import { Router } from 'express';
import { asyncHandler, authGuard } from '../../middlewares';
import { icpService } from './icp.service';

export const icpRouter = Router();
icpRouter.use(authGuard);

// GET /icp-criteria — lista todos critérios ativos (14 no seed)
icpRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const criteria = await icpService.listCriteria();
    res.json(criteria);
  }),
);

// GET /icp-criteria/:id
icpRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const criteria = await icpService.getCriteriaById(req.params.id as string);
    res.json(criteria);
  }),
);

// POST /icp-criteria/:id/answers — salva resposta de um lead
icpRouter.post(
  '/:criteriaId/answers',
  asyncHandler(async (req, res) => {
    const { leadId, answerValue } = req.body as { leadId: string; answerValue: string };
    const answer = await icpService.upsertAnswer(
      leadId,
      req.params.criteriaId as string,
      answerValue,
      req.user!.sub,
    );
    res.status(201).json(answer);
  }),
);

// POST /icp-criteria/recalc/:leadId — recalcula icp_score + icp_tier
icpRouter.post(
  '/recalc/:leadId',
  asyncHandler(async (req, res) => {
    const lead = await icpService.recalcScore(req.params.leadId as string, req.user!.sub);
    res.json({ icp_score: lead.icp_score, icp_tier: lead.icp_tier });
  }),
);
