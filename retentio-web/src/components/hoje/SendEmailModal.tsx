"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Send, Eye, EyeOff, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { useGoogleStatus, useSendGmail } from "@/hooks/use-google";
import type { Template } from "@/lib/types";

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadEmail: string;
  companyName: string;
  contactName?: string | null;
  niche?: string | null;
  onSent?: () => void;
}

export function SendEmailModal({
  open,
  onOpenChange,
  leadId,
  leadEmail,
  companyName,
  contactName,
  niche,
  onSent,
}: SendEmailModalProps) {
  const { toast } = useToast();
  const { data: googleStatus } = useGoogleStatus();
  const [viaGmail, setViaGmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Fetch email templates
  const { data: templates } = useQuery<Template[]>({
    queryKey: ["templates", "EMAIL"],
    queryFn: async () => {
      const { data } = await api.get<Template[]>("/templates?channel=EMAIL");
      return data;
    },
    enabled: open,
  });

  // Send email via Resend (cadence system)
  const sendEmailResend = useMutation({
    mutationFn: async (payload: { subject: string; body: string; template_id?: string }) => {
      const { data } = await api.post(`/leads/${leadId}/send-email`, payload);
      return data;
    },
    onSuccess: () => {
      toast("Email enviado com sucesso (Resend)");
      onOpenChange(false);
      onSent?.();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Erro ao enviar email";
      toast(msg, "error");
    },
  });

  // Send email via Gmail
  const sendEmailGmail = useSendGmail();

  // When template changes, fill subject/body with rendered content
  useEffect(() => {
    if (!selectedTemplateId || !templates) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    // Simple Handlebars-like variable replacement for preview
    const context: Record<string, string> = {
      empresa: companyName,
      contato: contactName ?? "",
      nicho: niche ?? "",
      email: leadEmail,
    };

    let renderedSubject = tpl.subject ?? "";
    let renderedBody = tpl.body;

    for (const [key, val] of Object.entries(context)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      renderedSubject = renderedSubject.replace(regex, val);
      renderedBody = renderedBody.replace(regex, val);
    }

    setSubject(renderedSubject);
    setBody(renderedBody);
  }, [selectedTemplateId, templates, companyName, contactName, niche, leadEmail]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedTemplateId("");
      setSubject("");
      setBody("");
      setShowPreview(false);
    }
  }, [open]);

  function handleSend() {
    if (!subject.trim() || !body.trim()) return;

    if (viaGmail) {
      sendEmailGmail.mutate(
        {
          leadId,
          to: leadEmail,
          subject: subject.trim(),
          body: body.trim(),
          templateId: selectedTemplateId || undefined,
        },
        {
          onSuccess: () => {
            toast("Email enviado via Gmail");
            onOpenChange(false);
            onSent?.();
          },
          onError: (err: any) => {
            const msg = err?.response?.data?.message ?? "Erro ao enviar via Gmail";
            toast(msg, "error");
          },
        },
      );
    } else {
      sendEmailResend.mutate({
        subject: subject.trim(),
        body: body.trim(),
        template_id: selectedTemplateId || undefined,
      });
    }
  }

  const isSending = sendEmailResend.isPending || sendEmailGmail.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            Enviar email para {companyName}
          </DialogTitle>
          <DialogDescription>
            Para: {leadEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Template select */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Usar template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">Escrever do zero...</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Assunto
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email..."
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">
                Corpo
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-hover transition-colors"
              >
                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPreview ? "Editar" : "Ver preview"}
              </button>
            </div>
            {showPreview ? (
              <div
                className="min-h-[200px] rounded-lg border border-border bg-white dark:bg-gray-900 p-4 text-sm text-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: body.replace(/\n/g, "<br>") }}
              />
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva o corpo do email..."
                rows={8}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none resize-y min-h-[200px]"
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Gmail toggle */}
          {googleStatus?.connected && (
            <button
              type="button"
              onClick={() => setViaGmail(!viaGmail)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mr-auto"
            >
              {viaGmail ? (
                <ToggleRight className="h-5 w-5 text-red-500" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
              {viaGmail ? `Via Gmail (${googleStatus.email})` : "Via Resend"}
            </button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={!subject.trim() || !body.trim() || isSending}
              className={viaGmail ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
