import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler, validate, authGuard, roleGuard, getTenantId } from '../../middlewares';
import { Role, EmailProviderType } from '@prisma/client';
import { encrypt } from '../../shared/utils/crypto';
import { emailService } from '../email/email.service';
import { AppError } from '../../shared/types';

export const emailConfigRouter = Router();

// Middleware de proteção: Apenas OWNER e MANAGER podem mexer em config de e-mail
emailConfigRouter.use(authGuard, roleGuard(Role.OWNER, Role.MANAGER));

const upsertEmailConfigSchema = z.object({
  provider: z.nativeEnum(EmailProviderType).default(EmailProviderType.RESEND),
  is_enabled: z.boolean().optional(),
  api_key: z.string().min(1).optional(),
  sender_name: z.string().optional(),
  sender_email: z.string().email().optional(),
  reply_to: z.string().email().optional().nullable(),
});

// GET /api/tenant/email-config
emailConfigRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const config = await prisma.tenantEmailProvider.findFirst({
      where: { tenant_id: tenantId }
    });

    if (!config) {
      return res.json({ is_enabled: false, provider: EmailProviderType.RESEND });
    }

    // Retorna a config omitindo/mascarando a chave
    res.json({
      id: config.id,
      provider: config.provider,
      is_enabled: config.is_enabled,
      api_key_masked: config.api_key_encrypted ? '••••••••••••••••' : null,
      sender_name: config.sender_name,
      sender_email: config.sender_email,
      reply_to: config.reply_to,
      updated_at: config.updated_at
    });
  })
);

// PUT /api/tenant/email-config
emailConfigRouter.put(
  '/',
  validate(upsertEmailConfigSchema),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { provider, is_enabled, api_key, sender_name, sender_email, reply_to } = req.body;

    const data: any = {
      provider,
      is_enabled: is_enabled ?? true,
      sender_name,
      sender_email,
      reply_to
    };

    if (api_key) {
      data.api_key_encrypted = encrypt(api_key);
    }

    const config = await prisma.tenantEmailProvider.upsert({
      where: { tenant_id_provider: { tenant_id: tenantId, provider } },
      create: { ...data, tenant_id: tenantId },
      update: data
    });

    res.json({
      id: config.id,
      provider: config.provider,
      is_enabled: config.is_enabled,
      api_key_masked: config.api_key_encrypted ? '••••••••••••••••' : null,
      sender_name: config.sender_name,
      sender_email: config.sender_email,
      reply_to: config.reply_to
    });
  })
);

// POST /api/tenant/email-config/test
emailConfigRouter.post(
  '/test',
  validate(z.object({
    provider: z.nativeEnum(EmailProviderType),
    api_key: z.string().optional(), // Pode ser a nova chave ou usar a salva
    to: z.string().email()
  })),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { provider, api_key, to } = req.body;

    let finalApiKey = api_key;

    if (!finalApiKey) {
      const saved = await prisma.tenantEmailProvider.findFirst({
        where: { tenant_id: tenantId, provider }
      });
      if (!saved || !saved.api_key_encrypted) throw new AppError(400, 'API Key não configurada');
      // No need to decrypt if we pass it to testConnection which handles it? 
      // Wait, testConnection expects a RAW apiKey.
      const { decrypt } = require('../../shared/utils/crypto');
      finalApiKey = decrypt(saved.api_key_encrypted);
    }

    const success = await emailService.testConnection(provider, finalApiKey!);
    
    if (success) {
      // Opcionalmente enviar um e-mail de teste real
      await emailService.send(tenantId, {
        to,
        subject: 'Teste de Configuração de E-mail - Discovery SDR',
        html: `<p>Olá! Este é um e-mail de teste para validar sua configuração no <strong>Discovery SDR</strong>.</p><p>Se você recebeu este e-mail, sua integração com o ${provider} está funcionando corretamente.</p>`
      });
      res.json({ success: true, message: 'Conexão validada e e-mail de teste enviado.' });
    } else {
      res.status(400).json({ success: false, message: 'Falha na validação da API Key.' });
    }
  })
);
