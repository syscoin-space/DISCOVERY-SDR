import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTeamMembers } from "@/hooks/use-team";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { CheckCircle2, Loader2, UsersRound } from "lucide-react";

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

export function BulkAssignModal({ open, onOpenChange, selectedIds, onSuccess }: BulkAssignModalProps) {
  const { data: teamMembers } = useTeamMembers();
  const [targetSdr, setTargetSdr] = useState("");
  const qc = useQueryClient();

  const sdrs = teamMembers?.filter((m) => m.role === "SDR" || m.role === "MANAGER" || m.role === "OWNER") || [];

  const assignMutation = useMutation({
    mutationFn: async ({ leadIds, sdrId }: { leadIds: string[]; sdrId: string }) => {
      const { data } = await api.post("/leads/bulk-assign", {
        leadIds,
        targetSdrId: sdrId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      onSuccess();
    },
  });

  const handleAssign = () => {
    if (!targetSdr || selectedIds.length === 0 || isOverLimit) return;
    assignMutation.mutate({ leadIds: selectedIds, sdrId: targetSdr });
  };

  const selectedSdrData = sdrs.find((s) => s.id === targetSdr);
  const currentActiveLeads = selectedSdrData?._count?.assigned_leads || 0;
  const potentialTotal = currentActiveLeads + selectedIds.length;
  const isOverLimit = potentialTotal > 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-accent" />
            Atribuição em Massa
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está prestes a atribuir <strong>{selectedIds.length}</strong> leads. Selecione o novo responsável abaixo.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground uppercase tracking-wider">Novo Responsável</label>
              <select
                value={targetSdr}
                onChange={(e) => setTargetSdr(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Selecione um membro...</option>
                {sdrs.map((sdr) => (
                  <option key={sdr.id} value={sdr.id}>
                    {sdr.user.name} ({sdr.role})
                  </option>
                ))}
              </select>
            </div>

            {selectedSdrData && (
              <div className={`p-3 rounded-lg border flex items-center justify-between ${isOverLimit ? 'bg-red-500/5 border-red-500/20' : 'bg-accent/5 border-accent/20'}`}>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo do SDR</p>
                  <p className={`text-sm font-bold ${isOverLimit ? 'text-red-500' : 'text-foreground'}`}>
                    {currentActiveLeads} / 100 ativos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Após Atribuição</p>
                  <p className={`text-sm font-bold ${isOverLimit ? 'text-red-600 animate-pulse' : 'text-accent'}`}>
                    {potentialTotal} / 100
                  </p>
                </div>
              </div>
            )}
          </div>

          {isOverLimit && (
            <p className="text-[11px] text-red-500 bg-red-500/10 p-2.5 rounded-md font-medium border border-red-500/20">
              Limite excedido! Este SDR atingirá {potentialTotal} leads ativos. O máximo permitido é 100.
            </p>
          )}

          {assignMutation.isError && (
            <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded-md">
              {(assignMutation.error as any)?.response?.data?.message || "Erro na atribuição. Verifique a conexão ou limites do SDR."}
            </p>
          )}
          {assignMutation.isSuccess && (
            <p className="text-xs text-green-600 bg-green-500/10 p-2 rounded-md flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Atribuídos com sucesso!
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assignMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!targetSdr || isOverLimit || assignMutation.isPending || assignMutation.isSuccess}
            className={`min-w-[100px] ${isOverLimit ? 'bg-gray-400 cursor-not-allowed' : 'bg-accent hover:bg-accent-hover text-white'}`}
          >
            {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isOverLimit ? 'Limite Excedido' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
