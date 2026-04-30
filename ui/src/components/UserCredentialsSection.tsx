import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserAdapterCredential } from "@paperclipai/shared";
import { userCredentialsApi } from "../api/userCredentials";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ADAPTER_TYPES = [
  { value: "claude-code", label: "Claude Code (Anthropic)" },
  { value: "openai-codex", label: "OpenAI Codex" },
  { value: "gemini", label: "Gemini" },
];

export function UserCredentialsSection() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adapterType, setAdapterType] = useState("");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const credentialsQuery = useQuery({
    queryKey: queryKeys.userCredentials.list,
    queryFn: () => userCredentialsApi.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      userCredentialsApi.upsert(adapterType, { label: label.trim(), apiKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userCredentials.list });
      setShowAddDialog(false);
      setAdapterType("");
      setLabel("");
      setApiKey("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (type: string) => userCredentialsApi.remove(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userCredentials.list });
    },
  });

  const credentials: UserAdapterCredential[] = credentialsQuery.data ?? [];
  const existingTypes = new Set(credentials.map((c) => c.adapterType));

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Chaves de API de Agentes</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure suas chaves de API pessoais para agentes. Quando você iniciar uma tarefa, sua chave será usada automaticamente no lugar da chave padrão da instância.
        As chaves são armazenadas com criptografia AES-256 e nunca são exibidas após o cadastro.
      </p>

      {credentialsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : credentialsQuery.error ? (
        <p className="text-sm text-destructive">
          {credentialsQuery.error instanceof Error ? credentialsQuery.error.message : "Erro ao carregar credenciais."}
        </p>
      ) : credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhuma chave cadastrada.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {credentials.map((cred) => {
            const adapterLabel = ADAPTER_TYPES.find((a) => a.value === cred.adapterType)?.label ?? cred.adapterType;
            return (
              <li key={cred.adapterType} className="flex items-center gap-3 px-4 py-3">
                <KeyRound className="size-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{adapterLabel}</p>
                  {cred.label ? (
                    <p className="truncate text-xs text-muted-foreground">{cred.label}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Cadastrada em {new Date(cred.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(cred.adapterType)}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowAddDialog(true)}
        disabled={existingTypes.size >= ADAPTER_TYPES.length}
      >
        <Plus className="size-4" />
        {existingTypes.size > 0 ? "Atualizar / adicionar chave" : "Cadastrar chave"}
      </Button>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar chave de API</DialogTitle>
            <DialogDescription>
              A chave é armazenada com criptografia e nunca poderá ser visualizada novamente.
              Para atualizar uma chave existente, selecione o mesmo tipo de adaptador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de adaptador</Label>
              <Select value={adapterType} onValueChange={setAdapterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar adaptador..." />
                </SelectTrigger>
                <SelectContent>
                  {ADAPTER_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                      {existingTypes.has(a.value) ? " (substituir)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-label">Rótulo (opcional)</Label>
              <Input
                id="cred-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: chave pessoal prod"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-api-key">Chave de API</Label>
              <Input
                id="cred-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!adapterType || !apiKey.trim() || upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
            >
              {upsertMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
