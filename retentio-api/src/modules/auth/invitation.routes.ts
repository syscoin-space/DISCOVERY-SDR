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

