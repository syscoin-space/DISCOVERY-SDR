import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { Role } from "@prisma/client";
import { emailService } from "../email/email.service";
import { env } from "../../config/env";

export class InvitationService {
  /**
   * Cria um novo convite e envia o e-mail
   */
  async createInvitation(tenantId: string, data: { email: string, role: Role, teamId?: string }) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Busca o tenant para pegar o nome real no convite
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const companyName = tenant?.name || " Discovery SDR";

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

    // Enviar e-mail real via EmailService (Multi-Tenant)
    const inviteLink = `${env.CORS_ORIGIN}/register?token=${token}&email=${encodeURIComponent(data.email)}`;
    
    await emailService.send(tenantId, {
      to: data.email,
      subject: `Convite para participar do time ${companyName} no Discovery SDR`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 12px;">
          <h2 style="color: #1E3A5F;">Você foi convidado!</h2>
          <p>Olá,</p>
          <p>Você foi convidado para participar do time <strong>${companyName}</strong> no Discovery SDR com a função de <strong>${data.role}</strong>.</p>
          <p>Para aceitar o convite e criar sua conta, clique no botão abaixo:</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2E86AB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Aceitar Convite</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">Se o botão não funcionar, copie e cole este link no seu navegador:<br />${inviteLink}</p>
          <p style="font-size: 12px; color: #999;">Discovery SDR — Inteligência Comercial em Escala.</p>
        </div>
      `
    });

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
