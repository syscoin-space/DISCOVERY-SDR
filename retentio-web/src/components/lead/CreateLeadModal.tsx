"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCreateLead } from "@/hooks/use-leads";
import { useAuth } from "@/hooks/use-auth";
import { useGestorSdrs } from "@/hooks/use-gestor";
import { cn } from "@/lib/utils";

const createLeadFormSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  contact_name: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  notes: z.string().optional(),
  icp_score: z.number().min(0).max(10).default(0),
  sdr_id: z.string().uuid("Selecione um responsável").optional(),
});

type CreateLeadFormValues = z.infer<typeof createLeadFormSchema>;

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadModal({ open, onOpenChange }: CreateLeadModalProps) {
  const { user } = useAuth();
  const { data: sdrs } = useGestorSdrs();
  const createLead = useCreateLead();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadFormSchema) as any,
    defaultValues: {
      company_name: "",
      contact_name: "",
      email: "",
      whatsapp: "",
      notes: "",
      icp_score: 0,
      sdr_id: user?.membership_id || undefined,
    },
  });

  const onSubmit = async (values: CreateLeadFormValues) => {
    try {
      await createLead.mutateAsync({
        ...values,
        source: "MANUAL",
      });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Erro ao criar lead:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccess(false);
      reset();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Adicione um lead manualmente ao pipeline (status inicial: BANCO).
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Lead Criado!</h3>
              <p className="text-sm text-gray-500">O lead foi adicionado com sucesso ao seu banco.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="company_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Empresa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company_name"
                  placeholder="Nome da empresa"
                  {...register("company_name")}
                  className={cn(errors.company_name && "border-red-500")}
                />
                {errors.company_name && (
                  <p className="text-[10px] text-red-500">{errors.company_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contato
                </Label>
                <Input
                  id="contact_name"
                  placeholder="Nome do contato"
                  {...register("contact_name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icp_score" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Score ICP (0-10)
                </Label>
                <Input
                  id="icp_score"
                  type="number"
                  min="0"
                  max="10"
                  {...register("icp_score")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  {...register("email")}
                  className={cn(errors.email && "border-red-500")}
                />
                {errors.email && (
                  <p className="text-[10px] text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  WhatsApp / Celular
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  {...register("whatsapp")}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="sdr_id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Responsável
                </Label>
                <select
                  id="sdr_id"
                  {...register("sdr_id")}
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
                >
                  <option value="">Sem responsável</option>
                  {sdrs?.map((sdr) => (
                    <option key={sdr.id} value={sdr.id}>
                      {sdr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações
                </Label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Notas iniciais sobre o lead..."
                  {...register("notes")}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            {createLead.isError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{(createLead.error as any)?.response?.data?.message || "Erro ao criar lead. Verifique se o e-mail ou domínio já existem."}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent-hover min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Lead"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
