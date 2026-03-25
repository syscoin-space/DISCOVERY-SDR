import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailApi, UpsertEmailConfig } from "@/lib/api/email.api";
import { useToast } from "@/components/shared/Toast";

export function useEmailConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const configQuery = useQuery({
    queryKey: ["email-config"],
    queryFn: emailApi.getConfig,
  });

  const upsertMutation = useMutation({
    mutationFn: emailApi.upsertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-config"] });
      toast("Configuração de e-mail salva com sucesso!", "success");
    },
    onError: (error: any) => {
      toast(error.message || "Erro ao salvar configuração de e-mail.", "error");
    },
  });

  const testMutation = useMutation({
    mutationFn: emailApi.testConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast(data.message, "success");
      } else {
        toast(data.message, "error");
      }
    },
    onError: (error: any) => {
      toast(error.message || "Falha ao testar conexão.", "error");
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    isRefetching: configQuery.isRefetching,
    upsert: upsertMutation,
    test: testMutation,
  };
}
