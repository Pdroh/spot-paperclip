import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { projectAgentsApi } from "../api/projectAgents";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Loader2, Plus, Trash2 } from "lucide-react";
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

export function ProjectAgentsTab({ companyId, projectId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.projectAgents.list(companyId, projectId),
    queryFn: () => projectAgentsApi.list(companyId, projectId),
  });

  const allAgentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: showAddDialog,
  });

  const existingAgentIds = new Set(assignmentsQuery.data?.map((a) => a.agentId) ?? []);
  const availableAgents: Agent[] = (allAgentsQuery.data ?? []).filter(
    (a) => !existingAgentIds.has(a.id),
  );

  const addMutation = useMutation({
    mutationFn: () => projectAgentsApi.assign(companyId, projectId, { agentId: selectedAgentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectAgents.list(companyId, projectId) });
      setShowAddDialog(false);
      setSelectedAgentId("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (agentId: string) => projectAgentsApi.unassign(companyId, projectId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectAgents.list(companyId, projectId) });
    },
  });

  if (assignmentsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando agentes...</p>;
  }

  if (assignmentsQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : "Erro ao carregar agentes."}
      </p>
    );
  }

  const assignments = assignmentsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Agentes do Projeto</h3>
          <p className="text-xs text-muted-foreground">
            Agentes atribuídos a este projeto. Quando configurado, issues do projeto só são visíveis para agentes atribuídos.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4" />
            Atribuir agente
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={Bot}
          message="Sem restrições: todos os agentes da empresa têm acesso. Atribua agentes para limitar o acesso."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {assignments.map((assignment) => (
            <li key={assignment.agentId} className="flex items-center gap-3 px-4 py-3">
              <Bot className="size-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {assignment.agentName ?? assignment.agentId}
                </p>
                {assignment.agentAdapterType ? (
                  <p className="text-xs text-muted-foreground">{assignment.agentAdapterType}</p>
                ) : null}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(assignment.agentId)}
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
            <DialogTitle>Atribuir agente ao projeto</DialogTitle>
            <DialogDescription>
              Selecione um agente para atribuir a este projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Agente</label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar agente..." />
              </SelectTrigger>
              <SelectContent>
                {allAgentsQuery.isLoading ? (
                  <SelectItem value="__loading__" disabled>
                    Carregando...
                  </SelectItem>
                ) : availableAgents.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    Nenhum agente disponível
                  </SelectItem>
                ) : (
                  availableAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedAgentId || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
