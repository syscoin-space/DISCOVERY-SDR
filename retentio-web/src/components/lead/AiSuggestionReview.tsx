"use client";

import { useState } from "react";
import { useAcceptAISuggestion, useRejectAISuggestion } from "@/hooks/use-leads";
import { Sparkles, Check, X, Pencil, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiSuggestionReviewProps {
  leadId: string;
  metadata: any;
}

export function AiSuggestionReview({ leadId, metadata }: AiSuggestionReviewProps) {
  const suggestion = metadata?.last_suggestion;
  const acceptMut = useAcceptAISuggestion();
  const rejectMut = useRejectAISuggestion();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, any>>({});

  // Render nothing if no suggestion or if it's already processed
  if (!suggestion || suggestion.status === "ACCEPTED" || suggestion.status === "REJECTED") {
    return null;
  }

  const handleAccept = async () => {
    await acceptMut.mutateAsync({ leadId, editedData: isEditing ? editedData : undefined });
    setIsEditing(false);
  };

  const handleReject = async () => {
    await rejectMut.mutateAsync(leadId);
    setIsEditing(false);
  };

  const toggleEdit = () => {
    if (!isEditing) {
      // populate defaults from suggestion
      setEditedData({
        dm_name: suggestion.enrichment_data?.dm_name || "",
        dm_role: suggestion.enrichment_data?.dm_role || "",
        suggested_status: suggestion.suggested_status || "",
      });
    }
    setIsEditing(!isEditing);
  };

  const onEditChange = (field: string, val: string) => {
    setEditedData(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-900/40 to-brand-800/20 shadow-lg relative">
      {/* Glow effect */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-50"></div>
      
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-500/20 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-100 flex items-center gap-2">
                Discovery Intelligence
                {suggestion.confidence && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300">
                    {Math.round(suggestion.confidence * 100)}% Confiança
                  </span>
                )}
              </h3>
              <p className="text-xs text-brand-200/70 mt-0.5">
                Revise as sugestões extraídas da última anotação.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* Summary / Context */}
          {suggestion.summary && (
            <div className="text-sm text-neutral-300 border-l-2 border-brand-500/30 pl-3 italic">
              "{suggestion.summary}"
            </div>
          )}

          {/* AI Inferences blocks */}
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {suggestion.enrichment_data?.dm_name && (
                <div className="bg-black/20 p-2 rounded border border-white/5">
                  <span className="block text-[10px] text-brand-300 uppercase tracking-wider font-semibold">Decisor Identificado</span>
                  <span className="text-sm text-white font-medium">{suggestion.enrichment_data.dm_name}</span>
                  {suggestion.enrichment_data?.dm_role && <span className="text-xs text-neutral-400 ml-1">({suggestion.enrichment_data.dm_role})</span>}
                </div>
              )}
              {suggestion.suggested_status && (
                <div className="bg-black/20 p-2 rounded border border-white/5">
                  <span className="block text-[10px] text-brand-300 uppercase tracking-wider font-semibold">Avanço de Status Sugerido</span>
                  <span className="text-sm text-white font-medium">{suggestion.suggested_status}</span>
                </div>
              )}
              {suggestion.intent_classification && (
                <div className="bg-black/20 p-2 rounded border border-white/5 col-span-2">
                  <span className="block text-[10px] text-brand-300 uppercase tracking-wider font-semibold">Intenção / Contexto</span>
                  <span className="text-sm text-white font-medium">{suggestion.intent_classification}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3 bg-black/30 p-3 rounded-lg border border-brand-500/20">
              <div className="flex items-center gap-2 text-xs text-brand-300 mb-2">
                <ShieldAlert className="w-4 h-4" /> Ajuste os dados antes de aceitar.
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-400">Nome do Decisor</label>
                <input 
                  type="text" 
                  value={editedData.dm_name} 
                  onChange={(e) => onEditChange("dm_name", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-400">Cargo do Decisor</label>
                <input 
                  type="text" 
                  value={editedData.dm_role} 
                  onChange={(e) => onEditChange("dm_role", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReject}
            disabled={rejectMut.isPending || acceptMut.isPending}
            className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Ignorar
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleEdit}
            disabled={rejectMut.isPending || acceptMut.isPending}
            className="border-brand-500/30 text-brand-200 hover:bg-brand-500/20 hover:text-white h-8 px-3 text-xs bg-transparent"
          >
            {isEditing ? <X className="w-3.5 h-3.5 mr-1" /> : <Pencil className="w-3.5 h-3.5 mr-1" />}
            {isEditing ? "Cancelar Edição" : "Revisar/Editar"}
          </Button>

          <Button 
            size="sm" 
            onClick={handleAccept}
            disabled={rejectMut.isPending || acceptMut.isPending}
            className="bg-brand-600 hover:bg-brand-500 text-white h-8 px-3 text-xs shadow-lg shadow-brand-900/20"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> 
            {isEditing ? "Confirmar Edições" : "Aceitar Tudo"}
          </Button>
        </div>

      </div>
    </div>
  );
}
