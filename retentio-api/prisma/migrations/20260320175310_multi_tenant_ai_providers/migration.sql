-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENROUTER', 'OPENAI', 'CLAUDE', 'GEMINI');

-- CreateTable
CREATE TABLE "tenant_ai_providers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "AIProviderType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "api_key_encrypted" TEXT,
    "default_model" TEXT,
    "base_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "priority_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_ai_settings" (
    "tenant_id" TEXT NOT NULL,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_provider" "AIProviderType",
    "classification_provider" "AIProviderType",
    "summary_provider" "AIProviderType",
    "guidance_provider" "AIProviderType",
    "allow_fallback" BOOLEAN NOT NULL DEFAULT true,
    "fallback_provider" "AIProviderType",
    "human_review_required" BOOLEAN NOT NULL DEFAULT true,
    "persist_ai_metadata_by_default" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_ai_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_ai_providers_tenant_id_provider_key" ON "tenant_ai_providers"("tenant_id", "provider");

-- AddForeignKey
ALTER TABLE "tenant_ai_providers" ADD CONSTRAINT "tenant_ai_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_ai_settings" ADD CONSTRAINT "tenant_ai_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
