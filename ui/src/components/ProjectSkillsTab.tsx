import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectSkillListItem } from "@paperclipai/shared";
import { projectSkillsApi } from "../api/projectSkills";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Boxes, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  companyId: string;
  projectId: string;
  canManage: boolean;
};

export function ProjectSkillsTab({ companyId, projectId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMarkdown, setNewMarkdown] = useState("");

  const skillsQuery = useQuery({
    queryKey: queryKeys.projectSkills.list(companyId, projectId),
    queryFn: () => projectSkillsApi.list(companyId, projectId),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const key = newName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return projectSkillsApi.create(companyId, projectId, {
        key,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        markdown: newMarkdown.trim() || `# ${newName.trim()}`,
        sourceType: "local_path",
        trustLevel: "markdown_only",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSkills.list(companyId, projectId) });
      setShowCreateDialog(false);
      setNewName("");
      setNewDescription("");
      setNewMarkdown("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (skillId: string) => projectSkillsApi.remove(companyId, projectId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSkills.list(companyId, projectId) });
    },
  });

  if (skillsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando skills...</p>;
  }

  if (skillsQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {skillsQuery.error instanceof Error ? skillsQuery.error.message : "Erro ao carregar skills."}
      </p>
    );
  }

  const skills: ProjectSkillListItem[] = skillsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Skills do Projeto</h3>
          <p className="text-xs text-muted-foreground">
            Skills específicas deste projeto, em adição às skills da empresa.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4" />
            Nova skill
          </Button>
        )}
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={Boxes}
          message="Skills da empresa sempre se aplicam. Adicione skills específicas para este projeto aqui."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {skills.map((skill) => (
            <li key={skill.id} className="flex items-center gap-3 px-4 py-3">
              <Boxes className="size-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{skill.name}</p>
                {skill.description ? (
                  <p className="truncate text-xs text-muted-foreground">{skill.description}</p>
                ) : null}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(skill.id)}
                >
                  {deleteMutation.isPending ? (
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar skill do projeto</DialogTitle>
            <DialogDescription>
              Adicione uma nova skill específica para este projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Nome</Label>
              <Input
                id="skill-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da skill"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-description">Descrição (opcional)</Label>
              <Textarea
                id="skill-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descreva o propósito desta skill..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-markdown">Conteúdo (Markdown)</Label>
              <Textarea
                id="skill-markdown"
                value={newMarkdown}
                onChange={(e) => setNewMarkdown(e.target.value)}
                placeholder="Descreva a skill em markdown (instruções para o agente)..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Criar skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
