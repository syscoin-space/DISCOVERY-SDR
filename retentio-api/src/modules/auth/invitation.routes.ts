import { Router } from "express";
import { asyncHandler, authGuard, roleGuard } from "../../middlewares";
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

    const invitation = await invitationService.createInvitation(tenantId, {
      email,
      role,
      teamId
    });

    res.status(201).json(invitation);
  })
);

/**
 * POST /api/invitations/accept
 * Aceita um convite usando o token
 */
invitationRouter.post(
  "/accept",
  authGuard,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const userId = (req as any).user.id;

    const tenant = await invitationService.acceptInvitation(token, userId);

    res.json({ success: true, tenant });
  })
);
