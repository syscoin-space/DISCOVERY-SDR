import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { Role } from "@prisma/client";

export class InvitationService {
  /**
   * Cria um novo convite e envia o e-mail
   */
  async createInvitation(tenantId: string, data: { email: string, role: Role, teamId?: string }) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const invitation = await prisma.membershipInvitation.create({
      data: {
        tenant_id: tenantId,
        email: data.email,
        role: data.role,
        team_id: data.teamId,
        token,
        expires_at: expiresAt
      }
    });

    // Aqui enviaríamos o e-mail via Resend
    // console.log(`[Email] Convite enviado para ${data.email} com token ${token}`);

    return invitation;
  }

  /**
   * Responde ao convite (aceita ou recusa)
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.membershipInvitation.findUnique({
      where: { token },
      include: { tenant: true }
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new AppError(400, "Convite inválido ou já processado", "INVITATION_INVALID");
    }

    if (invitation.expires_at < new Date()) {
      await prisma.membershipInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new AppError(400, "Convite expirado", "INVITATION_EXPIRED");
    }

    // Cria o membership
    await prisma.membership.create({
      data: {
        user_id: userId,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
        team_id: invitation.team_id,
      }
    });

    // Marca como aceito
    await prisma.membershipInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' }
    });

    return invitation.tenant;
  }

  /**
   * Lista convites pendentes de um tenant
   */
  async listInvitations(tenantId: string) {
    return prisma.membershipInvitation.findMany({
      where: { tenant_id: tenantId, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Cancela um convite
   */
  async cancelInvitation(tenantId: string, invitationId: string) {
    const invitation = await prisma.membershipInvitation.findFirst({
      where: { id: invitationId, tenant_id: tenantId }
    });

    if (!invitation) throw new AppError(404, "Convite não encontrado");

    return prisma.membershipInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' }
    });
  }
}

export const invitationService = new InvitationService();
