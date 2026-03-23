"use client";

import { useState } from "react";
import { 
  useTeamMembers, 
  useUpdateMemberRole, 
  useRemoveMember, 
  useInvitations, 
  useCreateInvitation, 
  useCancelInvitation 
} from "@/hooks/use-team";
import { Role } from "@/lib/types";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Trash2, 
  ShieldCheck, 
  Shield, 
  User,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/shared/Toast";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function TeamPage() {
  const { data: members, isLoading: loadingMembers } = useTeamMembers();
  const { data: invitations, isLoading: loadingInvitations } = useInvitations();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const createInvite = useCreateInvitation();
  const cancelInvite = useCancelInvitation();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("SDR");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await createInvite.mutateAsync({ email: inviteEmail, role: inviteRole });
      toast("Convite enviado com sucesso!", "success");
      setInviteEmail("");
      setIsInviting(false);
    } catch (error) {
      toast("Erro ao enviar convite.", "error");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    try {
      await updateRole.mutateAsync({ id: memberId, role: newRole });
      toast("Papel atualizado!", "success");
    } catch (error) {
      toast("Erro ao atualizar papel.", "error");
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover ${name} da equipe?`)) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast("Membro removido.", "info");
    } catch (error) {
      toast("Erro ao remover membro.", "error");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite.mutateAsync(inviteId);
      toast("Convite cancelado.", "info");
    } catch (error) {
      toast("Erro ao cancelar convite.", "error");
    }
  };

  if (loadingMembers || loadingInvitations) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Equipe</h2>
          <p className="text-muted-foreground">Gerencie quem tem acesso ao seu tenant.</p>
        </div>
        <Button onClick={() => setIsInviting(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar Membro
        </Button>
      </div>

      {/* Invite Form (Conditional) */}
      {isInviting && (
        <Card className="border-accent/30 bg-accent/5 overflow-hidden animate-in zoom-in-95">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm">Novo Convite</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsInviting(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="email@empresa.com.br"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-surface"
                  required
                />
              </div>
              <div className="w-full sm:w-40">
                <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as Role)}>
                  <SelectTrigger className="bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SDR">SDR</SelectItem>
                    <SelectItem value="MANAGER">Gerente Comercial</SelectItem>
                    <SelectItem value="OWNER">Dono</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createInvite.isPending}>
                {createInvite.isPending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Members List */}
        <SettingsSection
          title="Membros Ativos"
          icon={Users}
          contentClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-surface-raised/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">Membro</th>
                  <th className="px-6 py-3 font-semibold">Papel</th>
                  <th className="px-6 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {members?.map((member) => (
                  <tr key={member.id} className="hover:bg-surface-raised/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                          {member.user.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            member.user.name.charAt(0)
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{member.user.name}</span>
                          <span className="text-xs text-muted-foreground">{member.user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <Select 
                          value={member.role} 
                          onValueChange={(val) => handleRoleChange(member.id, val as Role)}
                          disabled={member.role === "OWNER" && members.filter(m => m.role === "OWNER").length === 1}
                        >
                          <SelectTrigger className="h-8 border-none bg-transparent hover:bg-surface-raised px-2">
                            <div className="flex items-center gap-1.5">
                              {member.role === "OWNER" ? <ShieldCheck className="h-3 w-3 text-amber-500" /> : 
                               member.role === "MANAGER" ? <Shield className="h-3 w-3 text-blue-500" /> : 
                               <User className="h-3 w-3 text-muted-foreground" />}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SDR">SDR</SelectItem>
                            <SelectItem value="MANAGER">Gerente Comercial</SelectItem>
                            <SelectItem value="OWNER">Dono</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/10"
                        onClick={() => handleRemoveMember(member.id, member.user.name)}
                        disabled={member.role === "OWNER"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsSection>

        {/* Invitations List */}
        {invitations && invitations.length > 0 && (
          <SettingsSection
            title="Convites Pendentes"
            icon={Mail}
            contentClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-surface-raised/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-semibold">E-mail</th>
                    <th className="px-6 py-3 font-semibold">Papel</th>
                    <th className="px-6 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="hover:bg-surface-raised/30 transition-colors italic opacity-70">
                      <td className="px-6 py-4 text-foreground">{invite.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-normal">{invite.role}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:text-danger"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          Cancelar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SettingsSection>
        )}
      </div>
    </div>
  );
}
