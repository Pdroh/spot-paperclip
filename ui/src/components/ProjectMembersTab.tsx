import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectMembershipWithUser } from "@paperclipai/shared";
import { projectMembersApi } from "../api/projectMembers";
import { accessApi } from "../api/access";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  companyId: string;
  projectId: string;
  canManage: boolean;
};

export function ProjectMembersTab({ companyId, projectId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"owner" | "member">("member");

  const membersQuery = useQuery({
    queryKey: queryKeys.projectMembers.list(companyId, projectId),
    queryFn: () => projectMembersApi.list(companyId, projectId),
  });

  const directoryQuery = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(companyId),
    queryFn: () => accessApi.listUserDirectory(companyId),
    enabled: showAddDialog,
  });

  const existingUserIds = new Set(membersQuery.data?.map((m) => m.userId) ?? []);
  const availableUsers = (directoryQuery.data?.users ?? []).filter(
    (u) => !existingUserIds.has(u.principalId),
  );

  const addMutation = useMutation({
    mutationFn: () =>
      projectMembersApi.add(companyId, projectId, { userId: selectedUserId, role: selectedRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers.list(companyId, projectId) });
      setShowAddDialog(false);
      setSelectedUserId("");
      setSelectedRole("member");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "owner" | "member" }) =>
      projectMembersApi.update(companyId, projectId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers.list(companyId, projectId) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectMembersApi.remove(companyId, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers.list(companyId, projectId) });
    },
  });

  if (membersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando membros...</p>;
  }

  if (membersQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {membersQuery.error instanceof Error ? membersQuery.error.message : "Erro ao carregar membros."}
      </p>
    );
  }

  const members: ProjectMembershipWithUser[] = membersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Membros do Projeto</h3>
          <p className="text-xs text-muted-foreground">
            Usuários com acesso a este projeto. Membros com papel "owner" podem gerenciar configurações.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4" />
            Adicionar membro
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          message="Este projeto não tem membros adicionados. Qualquer administrador da instância tem acesso implícito."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar size="sm">
                {member.userImage ? <AvatarImage src={member.userImage} alt={member.userName ?? ""} /> : null}
                <AvatarFallback>
                  {(member.userName ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.userName ?? member.userId}</p>
                {member.userEmail ? (
                  <p className="truncate text-xs text-muted-foreground">{member.userEmail}</p>
                ) : null}
              </div>
              {canManage ? (
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    updateMutation.mutate({ userId: member.userId, role: role as "owner" | "member" })
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
              )}
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(member.userId)}
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar membro ao projeto</DialogTitle>
            <DialogDescription>
              Selecione um usuário da empresa e defina o papel no projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuário</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {directoryQuery.isLoading ? (
                    <SelectItem value="__loading__" disabled>
                      Carregando...
                    </SelectItem>
                  ) : availableUsers.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      Nenhum usuário disponível
                    </SelectItem>
                  ) : (
                    availableUsers.map((u) => (
                      <SelectItem key={u.principalId} value={u.principalId}>
                        {u.user?.name ?? u.user?.email ?? u.principalId}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Papel</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "owner" | "member")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedUserId || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
