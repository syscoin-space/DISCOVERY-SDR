import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { Role } from "@prisma/client";
import { emailService } from "../email/email.service";
import { env } from "../../config/env";
import { hash, compare } from "bcryptjs";
import { signTokens } from "./auth.routes";

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
    const inviteLink = `${env.CORS_ORIGIN}/invite/accept?token=${token}`;
    
    await emailService.send(tenantId, {
      to: data.email,
      subject: `Convite para participar do time ${companyName} no Discovery SDR`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 12px;">
          <h2 style="color: #1E3A5F;">Você foi convidado!</h2>
          <p>Olá,</p>
          <p>Você foi convidado para participar do time <strong>${companyName}</strong> no Discovery SDR com a função de <strong>${data.role}</strong>.</p>
          <p>Para aceitar o convite e acessar sua conta, clique no botão abaixo:</p>
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
   * Verifica o token de convite e retorna dados de contexto (Público)
   */
  async verifyToken(token: string) {
    const invitation = await prisma.membershipInvitation.findUnique({
      where: { token },
      include: { tenant: { select: { name: true, slug: true } } }
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new AppError(400, "Convite inválido ou já aceito.", "INVITATION_INVALID");
    }

    if (invitation.expires_at < new Date()) {
      await prisma.membershipInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new AppError(400, "Convite expirado.", "INVITATION_EXPIRED");
    }

    // Verificar se o email já existe na base
    const userExists = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, name: true }
    });

    return {
      email: invitation.email,
      role: invitation.role,
      tenantName: invitation.tenant.name,
      tenantSlug: invitation.tenant.slug,
      userExists: !!userExists,
      userName: userExists?.name // Sugere o nome se existir
    };
  }

  /**
   * Registro e Aceite: Para convidados SEM conta prévia
   */
  async registerAndAccept(token: string, name: string, password: string) {
    const invitation = await prisma.membershipInvitation.findUnique({
      where: { token },
      include: { tenant: true }
    });

    if (!invitation || invitation.status !== 'PENDING' || invitation.expires_at < new Date()) {
      throw new AppError(400, "Convite inválido ou expirado.", "INVITATION_INVALID");
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      throw new AppError(400, "Este e-mail já possui cadastro. Faça login em vez de registrar.", "USER_EXISTS");
    }

    const passwordHash = await hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cria usuário
      const user = await tx.user.create({
        data: { email: invitation.email, name, password_hash: passwordHash }
      });

      // 2. Cria membership no tenant
      const membership = await tx.membership.create({
        data: {
          user_id: user.id,
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          team_id: invitation.team_id
        }
      });

      // 3. Marca convite como aceito
      await tx.membershipInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      });

      return { user, membership, tenant: invitation.tenant };
    });

    const tokens = signTokens({
      sub: result.user.id,
      membership_id: result.membership.id,
      tenant_id: result.tenant.id,
      email: result.user.email,
      name: result.user.name,
      role: result.membership.role,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.membership.role,
        membership_id: result.membership.id,
        tenant_id: result.tenant.id,
        tenant: result.tenant,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  /**
   * Login e Aceite: Para convidados COM conta prévia
   */
  async loginAndAccept(token: string, password: string) {
    const invitation = await prisma.membershipInvitation.findUnique({
      where: { token },
      include: { tenant: true }
    });

    if (!invitation || invitation.status !== 'PENDING' || invitation.expires_at < new Date()) {
      throw new AppError(400, "Convite inválido ou expirado.", "INVITATION_INVALID");
    }

    const user = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (!user || !user.active) {
      throw new AppError(401, "Usuário não encontrado ou inativo.", "AUTH_INVALID");
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, "Senha incorreta.", "AUTH_INVALID");
    }

      const result = await prisma.$transaction(async (tx) => {
      // 1. Verifica se já tem membership (evitar duplicação)
      let membership = await tx.membership.findFirst({
        where: { user_id: user.id, tenant_id: invitation.tenant_id }
      });

      if (!membership) {
        membership = await tx.membership.create({
          data: {
            user_id: user.id,
            tenant_id: invitation.tenant_id,
            role: invitation.role,
            team_id: invitation.team_id
          }
        });
      } else {
        // O usuário já tinha um vínculo. Precisamos garantir que ele seja reativado (caso tenha sido deletado)
        // e que receba o novo cargo/equipe do convite caso sejam diferentes.
        membership = await tx.membership.update({
          where: { id: membership.id },
          data: {
            active: true,
            role: invitation.role,
            team_id: invitation.team_id
          }
        });
      }

      // 2. Marca convite como aceito
      await tx.membershipInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      });

      return { user, membership, tenant: invitation.tenant };
    });

    const tokens = signTokens({
      sub: result.user.id,
      membership_id: result.membership.id,
      tenant_id: result.tenant.id,
      email: result.user.email,
      name: result.user.name,
      role: result.membership.role,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.membership.role,
        membership_id: result.membership.id,
        tenant_id: result.tenant.id,
        tenant: result.tenant,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
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
