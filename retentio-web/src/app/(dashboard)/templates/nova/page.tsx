"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreateTemplate } from "@/hooks/use-templates";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import Handlebars from "handlebars";
import type { StepChannel } from "@/lib/types";

const CHANNELS: { value: StepChannel; label: string; icon: any }[] = [
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "LIGACAO", label: "Ligação", icon: Phone },
];

const VARIABLES = ["empresa", "contato", "nome_cliente", "nicho", "cidade", "plataforma", "sdr_nome", "fit_tier"];

const SAMPLE_CONTEXT: Record<string, string> = {
  empresa: "Loja Exemplo",
  contato: "Maria Silva",
  nome_cliente: "Maria Silva",
  nicho: "Moda Feminina",
  cidade: "São Paulo",
  plataforma: "Shopify",
  sdr_nome: "João SDR",
  fit_tier: "A",
};

function renderPreview(template: string, context: Record<string, string>): string {
  try {
    return Handlebars.compile(template)(context);
  } catch {
    return template;
  }
}

export default function NovoTemplatePage() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<StepChannel>("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // States specíficos de Ligação
  const [abertura, setAbertura] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [implicacao, setImplicacao] = useState("");
  const [convite, setConvite] = useState("");

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
    if (!name.trim()) return;

    const finalBody = channel === "LIGACAO"
      ? JSON.stringify({ abertura, diagnostico, implicacao, convite })
      : body.trim();

    if (!finalBody) return;

    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        channel,
        subject: channel === "EMAIL" && subject.trim() ? subject.trim() : undefined,
        body: finalBody,
      });
      router.push("/templates");
    } catch {
      // handled by react-query
    }
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
          <h1 className="text-xl font-bold text-foreground">Novo Template</h1>
          <p className="text-sm text-muted-foreground">Crie um template de mensagem</p>
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
                  placeholder="Ex: Primeiro Contato — E-commerce"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
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
                      <button
                        key={ch.value}
                        type="button"
                        onClick={() => setChannel(ch.value)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "border-accent bg-accent text-white shadow-sm"
                            : "border-border bg-surface-raised text-muted-foreground hover:border-accent/20"
                        }`}
                      >
                        <ChIcon className="h-3.5 w-3.5" />
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
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
                    placeholder="Ex: {{empresa}} — oportunidade que eu precisava te mostrar"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              )}
            </div>

            {channel === "LIGACAO" ? (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Passo a Passo da Ligação</h2>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-xs text-muted-foreground mr-2 mt-1">Variáveis úteis (digite manualmente):</span>
                  {VARIABLES.map((v) => (
                    <span key={v} className="rounded border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-bold text-accent">1. Abertura - Conexão pela dor</label>
                    <textarea value={abertura} onChange={(e) => setAbertura(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none" placeholder="Ex: Vi que a {{empresa}} está..." required />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-bold text-blue-500">2. Pergunta de Diagnóstico</label>
                    <textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none" placeholder="Ex: Como vocês estão resolvendo..." required />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-bold text-purple-500">3. Pergunta de Implicação</label>
                    <textarea value={implicacao} onChange={(e) => setImplicacao(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none" placeholder="Ex: E qual o impacto disso na operação?" required />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-bold text-emerald-500">4. Convite</label>
                    <textarea value={convite} onChange={(e) => setConvite(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none" placeholder="Ex: Faz sentido a gente bater um papo rápido segunda-feira?" required />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Corpo da Mensagem</h2>

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
                  placeholder="Escreva sua mensagem aqui. Use {{empresa}}, {{nicho}}, etc. para variáveis..."
                  rows={12}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:border-accent focus:outline-none resize-none"
                  required
                />
              </div>
            )}

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
                disabled={!name.trim() || createTemplate.isPending || (channel === "LIGACAO" ? (!abertura || !diagnostico || !implicacao || !convite) : !body.trim())}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {createTemplate.isPending ? "Salvando..." : "Salvar Template"}
              </button>
            </div>

            {createTemplate.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                Erro ao criar template. Verifique os dados e tente novamente.
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
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed space-y-4">
                  {channel === "LIGACAO" ? (
                    <>
                      {abertura || diagnostico || implicacao || convite ? (
                        <div className="space-y-3">
                          {abertura && <div><span className="text-[10px] uppercase font-bold text-accent">Abertura:</span><br/>{renderPreview(abertura, SAMPLE_CONTEXT)}</div>}
                          {diagnostico && <div><span className="text-[10px] uppercase font-bold text-blue-500">Diagnóstico:</span><br/>{renderPreview(diagnostico, SAMPLE_CONTEXT)}</div>}
                          {implicacao && <div><span className="text-[10px] uppercase font-bold text-purple-500">Implicação:</span><br/>{renderPreview(implicacao, SAMPLE_CONTEXT)}</div>}
                          {convite && <div><span className="text-[10px] uppercase font-bold text-emerald-500">Convite:</span><br/>{renderPreview(convite, SAMPLE_CONTEXT)}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Preencha os campos para ver o preview...</span>
                      )}
                    </>
                  ) : (
                    <>
                      {body ? renderPreview(body, SAMPLE_CONTEXT) : (
                        <span className="text-muted-foreground italic">Digite o corpo para ver o preview...</span>
                      )}
                    </>
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
