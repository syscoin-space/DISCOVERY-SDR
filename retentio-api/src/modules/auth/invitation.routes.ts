import { Router } from "express";
import { z } from "zod";
import { asyncHandler, authGuard, roleGuard, validate } from "../../middlewares";
import { invitationService } from "./invitation.service";
import { getTenantId } from "../../middlewares/auth";
import { Role } from "@prisma/client";

export const invitationRouter = Router();

/**
 * POST /api/invitations
 * Envia um convite (Apenas OWNER/MANAGER)
 */
invitationRouter.post(
  "/",
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { email, role, teamId } = req.body;
    const invitation = await invitationService.createInvitation(tenantId, { email, role, teamId });
    res.status(201).json(invitation);
  })
);

/**
 * GET /api/invitations
 * Lista convites pendentes (Apenas OWNER/MANAGER)
 */
invitationRouter.get(
  "/",
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const invitations = await invitationService.listInvitations(tenantId);
    res.json(invitations);
  })
);

/**
 * DELETE /api/invitations/:id
 * Cancela um convite (Apenas OWNER/MANAGER)
 */
invitationRouter.delete(
  "/:id",
  authGuard,
  roleGuard(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    await invitationService.cancelInvitation(tenantId, req.params.id as string);
    res.status(204).send();
  })
);

// ==========================================
// ROTAS PÚBLICAS (NÃO REQUEREM AUTENTICAÇÃO)
// ==========================================

/**
 * GET /api/invitations/verify/:token
 * Resolve o token para exibir na UI
 */
invitationRouter.get(
  "/verify/:token",
  asyncHandler(async (req, res) => {
    const data = await invitationService.verifyToken(req.params.token as string);
    res.json(data);
  })
);

/**
 * POST /api/invitations/register-accept
 * Cria usuário anônimo + Vincula ao Tenant + Sign-In
 */
invitationRouter.post(
  "/register-accept",
  validate(z.object({
    token: z.string(),
    name: z.string().min(2),
    password: z.string().min(6)
  })),
  asyncHandler(async (req, res) => {
    const { token, name, password } = req.body;
    const result = await invitationService.registerAndAccept(token, name, password);
    res.json(result);
  })
);

/**
 * POST /api/invitations/login-accept
 * Valida senha de usuário existente + Vincula ao Tenant + Sign-In
 */
invitationRouter.post(
  "/login-accept",
  validate(z.object({
    token: z.string(),
    password: z.string().min(6)
  })),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await invitationService.loginAndAccept(token, password);
    res.json(result);
  })
);

/**
 * ROTA TEMPORÁRIA: GET /api/invitations/purge-vitoria
 * Hard delete dos emails para testes de qa
 */
import { prisma } from "../../config/prisma";
invitationRouter.get(
  "/purge-vitoria",
  asyncHandler(async (req, res) => {
    const emails = ['vitoria@retentio.com.br', 'vitoria@syscoin.com.br'];
    const report: any[] = [];
    
    for (const email of emails) {
      await prisma.membershipInvitation.deleteMany({ where: { email } });
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (user) {
        const memberships = await prisma.membership.findMany({ where: { user_id: user.id } });
        const ids = memberships.map(m => m.id);
        
        if (ids.length > 0) {
          await prisma.googleIntegration.deleteMany({ where: { membership_id: { in: ids } } });
          await prisma.pushSubscription.deleteMany({ where: { membership_id: { in: ids } } });
          await prisma.touchpoint.deleteMany({ where: { membership_id: { in: ids } } });
          await prisma.task.deleteMany({ where: { membership_id: { in: ids } } });
          await prisma.interaction.deleteMany({ where: { membership_id: { in: ids } } });
          await prisma.lead.updateMany({ where: { sdr_id: { in: ids } }, data: { sdr_id: null } });
          await prisma.membership.deleteMany({ where: { user_id: user.id } });
        }
        await prisma.user.delete({ where: { id: user.id } });
        report.push(`✅ Usuário ${email} completamente apagado de produção.`);
      } else {
        report.push(`ℹ️ Usuário ${email} não existia.`);
      }
    }
    
    res.json({ message: "Expurgo concluído com sucesso", report });
  })
);

