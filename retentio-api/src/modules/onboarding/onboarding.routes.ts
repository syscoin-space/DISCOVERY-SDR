import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, getTenantId, roleGuard, validate } from '../../middlewares';
import { z } from 'zod';
import { AppError } from '../../shared/types';
import { OnboardingStatus } from '@prisma/client';

export const onboardingRouter = Router();

onboardingRouter.use(authGuard);
onboardingRouter.use(roleGuard('OWNER' as any));

const companySetupSchema = z.object({
  name: z.string().min(2),
  logo_url: z.string().optional(),
  branding: z.record(z.any()).optional(),
});

const teamSetupSchema = z.object({
  members: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.enum(['SDR', 'CLOSER', 'MANAGER']),
  })),
});

const aiSetupSchema = z.object({
  provider: z.enum(['OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI']),
  api_key: z.string().min(10),
});

// GET /onboarding/state
onboardingRouter.get(
  '/state',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const state = await prisma.onboardingState.findUnique({
      where: { tenant_id: tenantId },
      include: { tenant: true }
    });
    res.json(state);
  })
);

// GET /onboarding/activation-summary
onboardingRouter.get(
  '/activation-summary',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const [
      leadsCount,
      cadencesCount,
      handoffsCount,
      integrationsCount,
      state
    ] = await Promise.all([
      prisma.lead.count({ where: { tenant_id: tenantId } }),
      prisma.cadence.count({ where: { tenant_id: tenantId } }),
      prisma.handoffBriefing.count({ where: { lead: { tenant_id: tenantId } } }),
      prisma.googleIntegration.count({ where: { membership: { tenant_id: tenantId } } }),
      prisma.onboardingState.findUnique({ where: { tenant_id: tenantId } })
    ]);

    res.json({
      company_setup: state?.tasks_completed && (state.tasks_completed as any).company_setup,
      team_added: state?.tasks_completed && (state.tasks_completed as any).team_added,
      ai_setup: state?.tasks_completed && (state.tasks_completed as any).ai_setup,
      first_lead: leadsCount > 0,
      first_cadence: cadencesCount > 0,
      calendar_connected: integrationsCount > 0,
      first_handoff: handoffsCount > 0
    });
  })
);

onboardingRouter.patch(
  '/company',
  validate(companySetupSchema, 'body'),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { name, branding } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        name, 
        branding,
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 1
      }
    });

    await prisma.onboardingState.update({
      where: { tenant_id: tenantId },
      data: { 
        tasks_completed: { 
          ...(await prisma.onboardingState.findUnique({ where: { tenant_id: tenantId } }))?.tasks_completed as any,
          company_setup: true 
        } 
      }
    });

    // Log de Auditoria
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: (req as any).user.sub,
        action: 'ONBOARDING_COMPANY_SETUP',
        entity_type: 'TENANT',
        entity_id: tenantId,
        new_value: { name }
      }
    });

    res.json(tenant);
  })
);

// POST /onboarding/team
onboardingRouter.post(
  '/team',
  validate(teamSetupSchema, 'body'),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { members } = req.body;

    // Transação para convidar/criar usuários
    // Simplificando: Apenas cria membros com senha padrão
    const results = await prisma.$transaction(
      members.map((m: any) => {
        return prisma.user.upsert({
          where: { email: m.email },
          update: {},
          create: {
            email: m.email,
            name: m.name,
            password_hash: '$2a$10$Ue9S2D5R...' // "123456" hash de exemplo
          }
        }).then(user => {
          return prisma.membership.create({
            data: {
              user_id: user.id,
              tenant_id: tenantId,
              role: m.role,
            }
          });
        });
      })
    );

    await prisma.onboardingState.update({
      where: { tenant_id: tenantId },
      data: { 
        tasks_completed: { 
          ...(await prisma.onboardingState.findUnique({ where: { tenant_id: tenantId } }))?.tasks_completed as any,
          team_added: true 
        } 
      }
    });

    // Log de Auditoria
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: (req as any).user.sub,
        action: 'ONBOARDING_TEAM_ADDED',
        entity_type: 'TENANT',
        entity_id: tenantId,
        new_value: { count: results.length }
      }
    });

    res.json({ count: results.length, members: results });
  })
);

// PATCH /onboarding/ai
onboardingRouter.patch(
  '/ai',
  validate(aiSetupSchema, 'body'),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { provider, api_key } = req.body;

    const normalizedProvider = provider.toUpperCase() as any;

    if (normalizedProvider && api_key) {
      const aiProvider = normalizedProvider;

      await prisma.tenantAIProvider.upsert({
        where: { tenant_id_provider: { tenant_id: tenantId, provider: aiProvider } },
        update: { api_key_encrypted: api_key, is_enabled: true, is_default: true },
        create: {
          tenant_id: tenantId,
          provider: aiProvider,
          api_key_encrypted: api_key,
          is_enabled: true,
          is_default: true
        }
      });

      await prisma.tenantAISettings.upsert({
        where: { tenant_id: tenantId },
        update: { ai_enabled: true, default_provider: aiProvider },
        create: {
          tenant_id: tenantId,
          ai_enabled: true,
          default_provider: aiProvider
        }
      });
    }

    await prisma.onboardingState.update({
      where: { tenant_id: tenantId },
      data: { 
        tasks_completed: { 
          ...(await prisma.onboardingState.findUnique({ where: { tenant_id: tenantId } }))?.tasks_completed as any,
          ai_setup: true 
        } 
      }
    });

    // Log de Auditoria
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: (req as any).user.sub,
        action: 'ONBOARDING_AI_SETUP',
        entity_type: 'TENANT',
        entity_id: tenantId,
        new_value: { provider }
      }
    });

    res.json({ message: 'AI configured' });
  })
);

// POST /onboarding/complete
onboardingRouter.post(
  '/complete',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        onboarding_status: 'COMPLETED',
        onboarding_step: 4
      }
    });

    await prisma.onboardingState.update({
      where: { tenant_id: tenantId },
      data: { 
        completed_at: new Date()
      }
    });

    // Log de Auditoria de Conclusão Final
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: (req as any).user.sub,
        action: 'ONBOARDING_COMPLETED',
        entity_type: 'TENANT',
        entity_id: tenantId,
        new_value: { status: 'COMPLETED' }
      }
    });

    res.json({ message: 'Onboarding completed successfully', tenant });
  })
);

