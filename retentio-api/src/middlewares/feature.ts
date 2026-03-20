import { Request, Response, NextFunction } from "express";
import { planService } from "../modules/billing/plan.service";
import { AppError } from "../shared/types";
import { getTenantId } from "./auth";

/**
 * Middleware para verificar se o tenant tem acesso a uma funcionalidade específica
 */
export const featureGuard = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { features } = await planService.getTenantPlan(tenantId);

      if (!features || !features[featureKey]) {
        throw new AppError(
          403, 
          `Seu plano não inclui acesso a: ${featureKey}. Faça upgrade para liberar.`, 
          "FEATURE_LOCKED"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
