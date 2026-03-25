"use client";

import Link from "next/link";
import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
import { Plus, Mail, MessageCircle, Pencil, Trash2, Phone } from "lucide-react";
import { useState } from "react";
import type { StepChannel } from "@/lib/types";

const CHANNEL_BADGE: Record<StepChannel, { label: string; icon: any; classes: string }> = {
  EMAIL: { label: "Email", icon: Mail, classes: "text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400" },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle, classes: "text-green-600 bg-green-500/10 border-green-500/20 dark:text-green-400" },
  LIGACAO: { label: "Ligação", icon: Phone, classes: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400" },
  LINKEDIN: { label: "LinkedIn", icon: Mail, classes: "text-blue-700 bg-blue-700/10 border-blue-700/20 dark:text-blue-400" },
};

export default function TemplatesPage() {
  const { data: templates, isLoading, error } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deletar template "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteTemplate.mutateAsync(id);
    } catch {
      // handled by react-query
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-6 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Erro ao carregar templates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6 lg:py-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Templates</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            {templates?.length ?? 0} templates criados
          </p>
        </div>
        <Link
          href="/templates/nova"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo </span>Template
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {!templates?.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
              <Mail className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Nenhum template criado</h2>
            <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro template de mensagem</p>
            <Link
              href="/templates/nova"
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Criar Template
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:gap-4 lg:grid-cols-2">
            {templates.map((tpl) => {
              const ch = CHANNEL_BADGE[tpl.channel];
              const ChIcon = ch.icon;
              return (
                <div
                  key={tpl.id}
                  className="group flex flex-col rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-accent/30"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground truncate flex-1 mr-2">
                      {tpl.name}
                    </h3>
                    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ch.classes}`}>
                      <ChIcon className="h-3 w-3" />
                      {ch.label}
                    </span>
                  </div>

                  {/* Subject */}
                  {tpl.subject && (
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      <span className="font-medium text-foreground/70">Assunto:</span> {tpl.subject}
                    </p>
                  )}

                  {/* Body preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                    {(() => {
                      if (tpl.channel === "LIGACAO") {
                        try {
                          const parsed = JSON.parse(tpl.body);
                          return [parsed.abertura, parsed.diagnostico, parsed.implicacao, parsed.convite]
                            .filter(Boolean)
                            .join(" — ")
                            .slice(0, 150);
                        } catch {
                          return tpl.body.replace(/<[^>]*>/g, "").slice(0, 150);
                        }
                      }
                      return tpl.body.replace(/<[^>]*>/g, "").slice(0, 150);
                    })()}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-border/50 pt-2">
                    <span className="text-[10px] text-muted-foreground">
                      v{tpl.version} &middot; {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/templates/${tpl.id}`}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        disabled={deletingId === tpl.id}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Deletar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
