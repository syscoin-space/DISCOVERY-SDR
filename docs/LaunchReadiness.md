# Discovery SDR V2 - Launch Readiness Checklist

Esta documentação define o estado oficial da V2 após a Fase 14 (Polish & QA). O objetivo é fornecer ao Owner uma visão cristalina do que é estável para produção e do que ainda requer observação profunda (Beta).

## 🟢 O que está ESTÁVEL (Production-Ready)
1. **Multi-Tenancy Isolation**:
   - Dados de `Lead`, `Touchpoint`, `Task`, e `HandoffBriefing` estão rigorosamente isolados por `tenant_id`.
   - Acesso cross-tenant bloqueado no backend (`getTenantId`).

2. **Core Operational Pipeline**:
   - Rotas de Dashboard V2 filtradas corretamente para `SDR` vs `MANAGER/OWNER`.
   - Semântica de Fila `Hoje`, `Agenda`, e Funil `Kanban` (`BANCO` até `PERDIDO`) alinhada. `NUTRICAO` age sistemicamente por trás, sem quebrar as 7 colunas.

3. **EventBus & Workers**:
   - Gatilhos de isolamento assíncrono totalmente testados para avanço de cadência e registro de Handlers.

4. **AI Provider Management**:
   - Chaves isoladas por Tenant com roteamento fallback (OpenRouter).
   - Tela de Settings segura (Masking `sk-***`) limitando a visualização e restrita a proprietários e gestores.

## 🟡 O que está em OBSERVABILIDADE (Beta)
Estas features são seguras para uso, limitadas pela proteção Humana, mas a usabilidade fina pode variar dependendo docomportamento dinâmico da IA.

1. **Human-in-the-Loop (HIL) - Discovery Intelligence**:
   - A taxonomia de extração ("Nome", "Cargo") depende do Prompt.
   - **Risco mitigado**: O modelo **jamais** sobrepõe automaticamente o banco oficial (Lead Details). Tudo é tratado como `Transient Metadata` sob aprovação manual (UX HIL V2).

2. **Next Best Action (Guidance)**:
   - Resumos gerados localmente e dicas dinâmicas nos touchpoints dependem o volume histórico do card. Tenants novos sem muita interação acharão a IA "vazia".

## 🚧 Known Limitations (Limitações Intencionais Atuais)
1. **Providers Fallbacks Isolados**: Se o OpenRouter ficar instável e as keys de OpenAI direct não estiverem mapeadas no Banco, a IA de sugestões cai graciosamente e a UI se esconde (Falha Limpa).
2. **Edição do Aceite (AuditLog limits)**: Conseguimos medir a *Adoção*, *Rejeição* e se o humano *modificou* (`is_edited_by_human = true`), mas o AuditLog não armazena a string exata prévia para uma feature futura de "Revert AI Action". Uma adoção aceita o dado sobre o oficial.

## 🚀 Guia Operacional de Onboarding (Novo Tenant = Novo V2)
Siga os 3 passos para ativar um cliente de modo impecável:
- [ ] 1. **Tenant Seed**: Banco Isolado no Prisma (`tenant_id`).
- [ ] 2. **AI Enablement**: Vá na Rota de IA Settings com conta `OWNER`, insira a key do OpenRouter, defina os defaults e ative `ai_enabled = true`.
- [ ] 3. **Role Binding**: Crie `Memberships` garantindo que Closer jamais pise em `SDR` access e vice-versa.

## Próxima Recomendação Estratégica
A **Fase 15** recomendada deve fugir da prospecção e englobar a criação das **Páginas de Onboarding** nativas (Gestão de Equipe, Billing, Onboarding Forms do ICP). Com o núcleo operacional fechado, a barreira do app agora é "Escalar sem onboardings manuais".
