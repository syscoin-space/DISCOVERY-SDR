import { prisma } from "../../config/prisma";
import { emailHealthService } from "../email/email-health.service";

export class AdminTenantService {
  async getCompleteTenantProfile(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        subscription: true,
        memberships: {
          include: { user: true }
        },
        invitations: true,
        ai_settings: true,
        teams: true,
      }
    });

    if (!tenant) {
      return null;
    }

    // 1. Fetch External/Calculated Health & Usage Stats
    const emailHealth = await emailHealthService.getTenantHealth(tenantId);
    
    // Total Leads Count
    const totalLeads = await prisma.lead.count({ where: { tenant_id: tenantId } });

    // Last Activity Pulse (from Interactions or AuditLogs)
    const lastInteraction = await prisma.interaction.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
      select: { created_at: true }
    });
    const lastAudit = await prisma.auditLog.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
      select: { created_at: true }
    });
    
    let lastActivityAt: Date | null = null;
    if (lastInteraction && lastAudit) {
      lastActivityAt = lastInteraction.created_at > lastAudit.created_at ? lastInteraction.created_at : lastAudit.created_at;
    } else {
      lastActivityAt = lastInteraction?.created_at || lastAudit?.created_at || tenant.created_at;
    }

    // Identify primary owner
    const owner = tenant.memberships.find(m => m.role === "OWNER") || tenant.memberships[0];

    // Calculate role distribution
    const rolesDist = tenant.memberships.reduce((acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Construct the 5 blocks
    // BLOCK 1: SUMMARY
    const summary = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.active ? "ACTIVE" : "INACTIVE",
      plan: tenant.plan?.name || "Sem plano",
      plan_key: tenant.plan?.key,
      owner_name: owner?.user.name || "N/A",
      owner_email: owner?.user.email || "N/A",
      created_at: tenant.created_at,
      onboarding_status: tenant.onboarding_status,
      onboarding_step: tenant.onboarding_step,
    };

    // BLOCK 2: BILLING
    const billing = {
      status: tenant.subscription?.status || "INACTIVE",
      price: tenant.subscription?.price || tenant.plan?.price_monthly || 0,
      currency: tenant.subscription?.currency || tenant.plan?.currency || "BRL",
      current_period_end: tenant.subscription?.current_period_end || null,
      gateway_customer_id: tenant.subscription?.gateway_customer_id || null,
      gateway_subscription_id: tenant.subscription?.gateway_subscription_id || null,
    };

    // BLOCK 3: PRODUCT / CONFIGURATION
    const brandingConfigured = tenant.branding && Object.keys(tenant.branding as object).length > 0;
    const product = {
      discovery_enabled: tenant.discovery_enabled,
      branding_configured: !!brandingConfigured,
      ai_configured: tenant.ai_settings?.ai_enabled || false,
      email_configured: emailHealth.provider_configured,
      email_healthy: emailHealth.status === "HEALTHY",
    };

    // BLOCK 4: TEAM
    const pendingInvites = tenant.invitations.filter(i => i.status === "PENDING").length;
    const team = {
      members_count: tenant.memberships.length,
      roles_distribution: rolesDist,
      pending_invites: pendingInvites,
      teams_count: tenant.teams.length,
    };

    // BLOCK 5: USAGE & HEALTH
    const usage_health = {
      total_leads: totalLeads,
      last_activity_at: lastActivityAt,
      email_health: emailHealth, // Extracted from EmailHealthService
      operational_signal: totalLeads === 0 && (new Date().getTime() - new Date(tenant.created_at).getTime() > 7 * 24 * 60 * 60 * 1000)
        ? "AT_RISK_NO_ADOPTION"
        : (emailHealth.status === "CRITICAL" ? "BLOCKED_CHANNELS" : "NORMAL")
    };

    return {
      summary,
      billing,
      product,
      team,
      usage_health
    };
  }
}

export const adminTenantService = new AdminTenantService();
