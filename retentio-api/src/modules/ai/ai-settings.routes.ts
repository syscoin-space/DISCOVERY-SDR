import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../middlewares';
import { getTenantId } from '../../middlewares';
import { AIProviderType } from '@prisma/client';
import { AppError } from '../../shared/types';

export const aiSettingsRouter = Router();

/**
 * Util function to mask an API key for the frontend
 */
function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...****...${key.slice(-4)}`;
}

/**
 * GET /api/ai-settings
 * Returns global governance settings and a protected list of configured providers
 */
aiSettingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    const [settings, providers] = await Promise.all([
      prisma.tenantAISettings.findUnique({ where: { tenant_id: tenantId } }),
      prisma.tenantAIProvider.findMany({ where: { tenant_id: tenantId } })
    ]);

    // Mask api keys
    const maskedProviders = providers.map(p => ({
      ...p,
      api_key_encrypted: maskApiKey(p.api_key_encrypted)
    }));

    res.json({
      success: true,
      settings: settings || {
        ai_enabled: false,
        allow_fallback: true,
        human_review_required: true,
        persist_ai_metadata_by_default: true
      },
      providers: maskedProviders
    });
  })
);

/**
 * PUT /api/ai-settings/governance
 * Updates TenantAISettings
 */
aiSettingsRouter.put(
  '/governance',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const data = req.body;

    // Filter permitted fields
    const updatePayload = {
      ai_enabled: data.ai_enabled,
      default_provider: data.default_provider,
      classification_provider: data.classification_provider,
      summary_provider: data.summary_provider,
      guidance_provider: data.guidance_provider,
      allow_fallback: data.allow_fallback,
      fallback_provider: data.fallback_provider,
      human_review_required: data.human_review_required,
      persist_ai_metadata_by_default: data.persist_ai_metadata_by_default
    };

    const settings = await prisma.tenantAISettings.upsert({
      where: { tenant_id: tenantId },
      update: updatePayload,
      create: { ...updatePayload, tenant_id: tenantId }
    });

    res.json({ success: true, settings });
  })
);

/**
 * PUT /api/ai-settings/providers/:provider_type
 * Creates or updates a specific provider credential/config
 */
aiSettingsRouter.put(
  '/providers/:provider_type',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const providerType = (req.params.provider_type as string).toUpperCase() as AIProviderType;

    if (!Object.values(AIProviderType).includes(providerType)) {
      throw new AppError(400, 'Provider inválido');
    }

    const { is_enabled, api_key, default_model, priority_order } = req.body;

    let encryptedKeyFragment = {};
    
    // Only update key if it's explicitly provided and doesn't look like a masked key
    if (api_key && !api_key.includes('...****...')) {
      // Future: Real Encryption AES-256 could go here BEFORE saving
      encryptedKeyFragment = { api_key_encrypted: api_key };
    }

    const provider = await prisma.tenantAIProvider.upsert({
      where: { tenant_id_provider: { tenant_id: tenantId, provider: providerType } },
      update: {
        is_enabled: is_enabled,
        default_model: default_model,
        priority_order: priority_order,
        ...encryptedKeyFragment
      },
      create: {
        tenant_id: tenantId,
        provider: providerType,
        is_enabled: is_enabled ?? false,
        default_model: default_model || '',
        priority_order: priority_order || 0,
        ...encryptedKeyFragment
      }
    });

    res.json({ 
      success: true, 
      provider: {
        ...provider,
        api_key_encrypted: maskApiKey(provider.api_key_encrypted)
      } 
    });
  })
);
