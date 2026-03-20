import { Router } from "express";
import { asyncHandler } from "../../middlewares";
import { subscriptionService } from "./subscription.service";

export const billingWebhookRouter = Router();

/**
 * POST /api/webhooks/asaas
 * Recebe notificações de eventos do Asaas de forma assíncrona
 */
billingWebhookRouter.post(
  "/asaas",
  asyncHandler(async (req, res) => {
    // No ambiente real, validaríamos o cabeçalho 'asaas-access-token' aqui
    // const token = req.headers['asaas-access-token'];
    
    await subscriptionService.handleWebhook(req.body);
    
    res.status(200).json({ received: true });
  })
);
