"use client";

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTemplate, useUpdateTemplate } from "@/hooks/use-templates";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import Handlebars from "handlebars";
import type { StepChannel } from "@/lib/types";

const CHANNELS: { value: StepChannel; label: string; icon: typeof Mail }[] = [
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
];

const VARIABLES = ["empresa", "contato", "nome_cliente", "nicho", "cidade", "plataforma", "sdr_nome", "prr_tier"];

const SAMPLE_CONTEXT: Record<string, string> = {
  empresa: "Loja Exemplo",
  contato: "Maria Silva",
  nome_cliente: "Maria Silva",
  nicho: "Moda Feminina",
  cidade: "São Paulo",
  plataforma: "Shopify",
  sdr_nome: "João SDR",
  prr_tier: "A",
};

function renderPreview(template: string, context: Record<string, string>): string {
  try {
    return Handlebars.compile(template)(context);
  } catch {
    return template;
  }
}

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: template, isLoading } = useTemplate(id);
  const updateTemplate = useUpdateTemplate();

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<StepChannel>("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [initialized, setInitialized] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template && !initialized) {
      setName(template.name);
      setChannel(template.channel);
      setSubject(template.subject ?? "");
      setBody(template.body);
      setInitialized(true);
    }
  }, [template, initialized]);

  function insertVariable(varName: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = `{{${varName}}}`;
    const newBody = body.slice(0, start) + text + body.slice(end);
    setBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;

    try {
      await updateTemplate.mutateAsync({
        id,
        name: name.trim(),
        subject: channel === "EMAIL" && subject.trim() ? subject.trim() : undefined,
        body: body.trim(),
      });
      router.push("/templates");
    } catch {
      // handled by react-query
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Template não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-6 py-4">
        <button
          onClick={() => router.push("/templates")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Editar Template</h1>
          <p className="text-sm text-muted-foreground">
            {template.name} &middot; v{template.version}
          </p>
        </div>
      </div>

      {/* Form + Preview */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl flex flex-col lg:flex-row gap-6">
          {/* Editor */}
          <div className="flex-1 space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Informações</h2>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Canal
                </label>
                <div className="flex gap-2">
                  {CHANNELS.map((ch) => {
                    const ChIcon = ch.icon;
                    const isActive = channel === ch.value;
                    return (
                      <div
                        key={ch.value}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
                          isActive
                            ? "border-accent bg-accent text-white shadow-sm"
                            : "border-border bg-surface-raised text-muted-foreground opacity-50"
                        }`}
                      >
                        <ChIcon className="h-3.5 w-3.5" />
                        {ch.label}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">O canal não pode ser alterado após criação</p>
              </div>

              {channel === "EMAIL" && (
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Corpo da Mensagem</h2>

              {/* Variable toolbar */}
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="rounded-md border border-border bg-surface-raised px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-accent/30 hover:text-accent transition-colors"
                  >
                    + {v}
                  </button>
                ))}
              </div>

              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-none"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={() => router.push("/templates")}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !body.trim() || updateTemplate.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {updateTemplate.isPending ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>

            {updateTemplate.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                Erro ao atualizar template. Verifique os dados e tente novamente.
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="lg:w-[340px] shrink-0">
            <div className="sticky top-0 rounded-xl border border-border bg-surface-raised p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Preview</h2>
              <div className="text-xs text-muted-foreground">
                Dados de exemplo para visualização
              </div>

              {channel === "EMAIL" && subject && (
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Assunto</p>
                  <p className="text-sm text-foreground font-medium">
                    {renderPreview(subject, SAMPLE_CONTEXT)}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Corpo</p>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {body ? renderPreview(body, SAMPLE_CONTEXT) : (
                    <span className="text-muted-foreground italic">Corpo vazio</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
