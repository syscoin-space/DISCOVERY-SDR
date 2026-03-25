import { Router } from "express";
import { asyncHandler, getTenantId } from "../../middlewares";
import { emailHealthService } from "./email-health.service";

export const emailHealthRouter = Router();

// GET /api/tenant/email-health
emailHealthRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const health = await emailHealthService.getTenantHealth(tenantId);
    res.json(health);
  })
);
