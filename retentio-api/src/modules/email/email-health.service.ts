import { prisma } from "../../config/prisma";
import { EmailProviderType } from "@prisma/client";
import { subDays } from "date-fns";

export interface EmailHealthStatus {
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "INACTIVE";
  provider_configured: boolean;
  provider_active: boolean;
  configuration_valid: boolean;
  last_success_at: Date | null;
  last_error: {
    message: string;
    at: Date;
  } | null;
  failure_count_24h: number;
  blocked_cadences_count: number;
  issues: string[];
}

export class EmailHealthService {
  async getTenantHealth(tenantId: string): Promise<EmailHealthStatus> {
    const issues: string[] = [];
    
    // 1. Check Provider Config
    const provider = await prisma.tenantEmailProvider.findUnique({
      where: { tenant_id_provider: { tenant_id: tenantId, provider: EmailProviderType.RESEND } }
    });

    const provider_configured = !!provider && !!provider.api_key_encrypted;
    const provider_active = !!provider && provider.is_enabled;
    const configuration_valid = !!provider && !!provider.sender_email;

    if (!provider_configured) issues.push("E-mail provider não configurado.");
    if (provider_configured && !provider_active) issues.push("Provider de e-mail desativado.");
    if (provider_configured && !configuration_valid) issues.push("E-mail do remetente não configurado.");

    // 2. Operational Stats (Recent Interactions)
    const lastSuccessAt = await prisma.interaction.findFirst({
      where: {
        tenant_id: tenantId,
        type: "EMAIL",
        status: "delivered"
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true }
    });

    const lastError = await prisma.interaction.findFirst({
      where: {
        tenant_id: tenantId,
        type: "EMAIL",
        error: { not: null }
      },
      orderBy: { created_at: "desc" },
      select: { error: true, created_at: true }
    });

    const failureCount24h = await prisma.interaction.count({
      where: {
        tenant_id: tenantId,
        type: "EMAIL",
        error: { not: null },
        created_at: { gte: subDays(new Date(), 1) }
      }
    });

    if (failureCount24h > 5) {
      issues.push(`Detectamos ${failureCount24h} falhas de envio nas últimas 24 horas.`);
    }

    // 3. Blocked Cadences
    // Cadences that are ACTIVE and have EMAIL steps, but tenant has no active provider
    let blockedCadencesCount = 0;
    if (!provider_active || !configuration_valid) {
      blockedCadencesCount = await prisma.cadence.count({
        where: {
          tenant_id: tenantId,
          active: true,
          steps: {
            some: { channel: "EMAIL" }
          }
        }
      });
    }

    if (blockedCadencesCount > 0) {
      issues.push(`${blockedCadencesCount} cadência(s) ativa(s) estão bloqueadas por falta de configuração.`);
    }

    // 4. Determine Global Status
    let status: EmailHealthStatus["status"] = "HEALTHY";
    
    if (blockedCadencesCount > 0) {
      status = "CRITICAL";
    } else if (!provider_active || failureCount24h > 0 || !configuration_valid) {
      status = "WARNING";
    }

    if (!provider_configured) {
      status = "INACTIVE";
    }

    return {
      status,
      provider_configured,
      provider_active,
      configuration_valid,
      last_success_at: lastSuccessAt?.created_at || null,
      last_error: lastError ? { message: lastError.error || "Erro desconhecido", at: lastError.created_at } : null,
      failure_count_24h: failureCount24h,
      blocked_cadences_count: blockedCadencesCount,
      issues
    };
  }
}

export const emailHealthService = new EmailHealthService();
