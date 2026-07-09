import { useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardCopy,
  Bell,
  Download,
  FileJson,
  LayoutTemplate,
  LifeBuoy,
  Loader2,
  Moon,
  Paperclip,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { UserSettings } from "@/hooks/useUserSettings";
import { Notebook, Page } from "@/types/notes";
import {
  collectUserBackup,
  downloadBackup,
  importBackupForUser,
  ImportMode,
  loadSampleData,
  resetUserData,
  validateBackup,
  VistaBackup,
} from "@/lib/userData";

const betaSummary = "Estou testando o VISTA Tasks Control, um app para transformar anotações em tarefas executáveis. Feedback desejado: clareza, organização, bugs e utilidade no dia a dia.";

const checklistItems = [
  { id: "first-note", label: "Criei minha primeira anotação" },
  { id: "organized-note", label: "Organizei uma anotação em um caderno" },
  { id: "note-to-task", label: "Criei uma tarefa a partir de uma anotação" },
  { id: "calendar-task", label: "Planejei uma tarefa no Calendário" },
  { id: "exported-backup", label: "Exportei meu backup" },
  { id: "day-without-keep", label: "Usei o app por um dia sem abrir o Google Keep" },
];

interface SettingsViewProps {
  user: User;
  notebooks: Notebook[];
  notes: Page[];
  tasks: WeeklyTask[];
  settings: UserSettings;
  onChecklistChange: (itemId: string, checked: boolean) => void;
  onSettingsImported: (settings: UserSettings) => void;
  onOpenOnboarding: () => void;
  onGoToday: () => void;
}

export function SettingsView({
  user,
  notebooks,
  notes,
  tasks,
  settings,
  onChecklistChange,
  onSettingsImported,
  onOpenOnboarding,
  onGoToday,
}: SettingsViewProps) {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { isPro, loading: subscriptionLoading, plan } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<VistaBackup | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [sampleConfirmOpen, setSampleConfirmOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [resetText, setResetText] = useState("");

  const invalidateUserData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notebooks"] }),
      queryClient.invalidateQueries({ queryKey: ["pages"] }),
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] }),
      queryClient.invalidateQueries({ queryKey: ["all-pages"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["task-history"] }),
    ]);
  };

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await action();
    } finally {
      setBusyAction(null);
    }
  };

  const handleExport = () => runAction("export", async () => {
    const backup = await collectUserBackup(user.id, settings);
    downloadBackup(backup);
    toast.success("Backup exportado com sucesso.");
    onChecklistChange("exported-backup", true);
  });

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      setPendingBackup(validateBackup(parsed));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler este backup.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = (mode: ImportMode) => runAction(`import-${mode}`, async () => {
    if (!pendingBackup) return;
    const result = await importBackupForUser(user.id, pendingBackup, mode);
    onSettingsImported(pendingBackup.data.settings);
    await invalidateUserData();
    setPendingBackup(null);
    onGoToday();
    toast.success(`Backup importado: ${result.notebooks} cadernos, ${result.notes} anotações e ${result.tasks} tarefas.`);
  });

  const handleReset = () => runAction("reset", async () => {
    if (resetText !== "RESETAR") {
      toast.error("Digite RESETAR para confirmar.");
      return;
    }
    await resetUserData(user.id, true);
    await invalidateUserData();
    setResetOpen(false);
    setResetText("");
    onGoToday();
    toast.success("Seus dados foram resetados com sucesso.");
  });

  const handleSampleData = () => {
    const hasCurrentData = notebooks.length > 0 || notes.length > 0 || tasks.length > 0;
    if (hasCurrentData) {
      setSampleConfirmOpen(true);
      return;
    }
    void confirmSampleData();
  };

  const confirmSampleData = () => runAction("sample", async () => {
    setSampleConfirmOpen(false);
    const result = await loadSampleData(user.id);
    await invalidateUserData();
    toast.success(`Dados de exemplo carregados: ${result.notebooks} cadernos, ${result.notes} anotações e ${result.tasks} tarefas.`);
  });

  const copySummary = async () => {
    await navigator.clipboard.writeText(betaSummary);
    toast.success("Resumo do app copiado.");
  };

  const sendFeedback = () => {
    window.location.href = `mailto:contato@anchorlab.com.br?subject=${encodeURIComponent("Feedback VISTA Tasks Control")}&body=${encodeURIComponent(betaSummary)}`;
  };

  const completedChecklist = checklistItems.filter((item) => settings.validationChecklist[item.id]).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-3 sm:p-6">
      <section className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Settings className="h-4 w-4" />
          Configurações
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">VISTA Tasks Control</h1>
        <p className="text-sm leading-6 text-muted-foreground">Transforme anotações em tarefas executáveis.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
        <section className="space-y-4">
          <SettingsCard title="Produto" icon={Sparkles}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <InfoRow label="Nome" value="VISTA Tasks Control" />
              <InfoRow label="Versão" value="1.0 beta" />
              <InfoRow label="Desenvolvido por" value="AnchorLab" />
              <p className="rounded-md border border-primary/20 bg-primary/10 p-3 text-primary">
                Transforme anotações em tarefas executáveis.
              </p>
            </div>
          </SettingsCard>

          <SettingsCard title="Recursos Pro" icon={Sparkles}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <InfoRow label="Plano" value={subscriptionLoading ? "Verificando..." : plan.toUpperCase()} />
              <ProFeatureRow
                icon={Sparkles}
                title="IA anotacao para tarefa"
                description="Use a captura avancada e o comando Criar tarefa para transformar uma nota em tarefa com origem preservada."
                active
              />
              <ProFeatureRow
                icon={Bell}
                title="Lembretes e recorrencia"
                description="Planejamento por data ja esta ativo nas tarefas. Notificacoes nativas e repeticao automatica dependem da proxima migracao de schema."
                active={isPro}
              />
              <ProFeatureRow
                icon={Paperclip}
                title="Anexos"
                description="Anexe arquivos e imagens dentro do editor de anotacoes pelo bloco Imagem ou arquivo."
                active
              />
              <ProFeatureRow
                icon={LayoutTemplate}
                title="Templates"
                description="Use dados de exemplo e captura avancada como base. Biblioteca editavel de templates entra na proxima rodada de schema."
                active={isPro}
              />
            </div>
          </SettingsCard>

          <SettingsCard title="Dados" icon={FileJson}>
            <p className="text-sm leading-6 text-muted-foreground">
              As ações abaixo afetam apenas os dados do usuário logado.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton icon={Download} loading={busyAction === "export"} onClick={handleExport}>
                Exportar backup
              </ActionButton>
              <ActionButton icon={Upload} onClick={() => fileInputRef.current?.click()}>
                Importar backup
              </ActionButton>
              <ActionButton icon={Sparkles} loading={busyAction === "sample"} onClick={handleSampleData}>
                Carregar dados de exemplo
              </ActionButton>
              <ActionButton icon={Trash2} variant="destructive" onClick={() => setResetOpen(true)}>
                Resetar meus dados
              </ActionButton>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => handleImportFile(event.target.files?.[0])}
            />
          </SettingsCard>

          <SettingsCard title="Beta fechado" icon={LifeBuoy}>
            <p className="text-sm leading-6 text-muted-foreground">
              Use o VISTA Tasks Control no seu dia a dia e envie feedback sobre clareza, velocidade e utilidade.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-10 gap-2" onClick={copySummary}>
                <ClipboardCopy className="h-4 w-4" />
                Copiar resumo do app
              </Button>
              <Button variant="outline" className="h-10 gap-2" onClick={sendFeedback}>
                <LifeBuoy className="h-4 w-4" />
                Enviar feedback
              </Button>
            </div>
          </SettingsCard>
        </section>

        <section className="space-y-4">
          <SettingsCard title="Conta" icon={CheckCircle2}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <InfoRow label="Nome" value={user.user_metadata?.username || user.user_metadata?.name || "Não informado"} />
              <InfoRow label="E-mail" value={user.email || "Não informado"} />
              <InfoRow label="Status" value="Logado" />
            </div>
          </SettingsCard>

          <SettingsCard title="Preferências" icon={Settings}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <InfoRow label="Tema atual" value={theme === "dark" ? "Escuro" : "Claro"} />
              <Button variant="outline" className="h-10 w-full gap-2" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Alternar para {theme === "dark" ? "Claro" : "Escuro"}
              </Button>
              <p>O tema escolhido fica salvo neste navegador. Modo automático será adicionado futuramente.</p>
              <Button variant="outline" className="h-10 w-full gap-2" onClick={onOpenOnboarding}>
                <RotateCcw className="h-4 w-4" />
                Ver onboarding novamente
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard title="Checklist de validação" icon={CheckCircle2}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Progresso do beta</span>
              <Badge variant="secondary" className="rounded-full">{completedChecklist}/{checklistItems.length}</Badge>
            </div>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <label key={item.id} className="flex min-h-10 items-center gap-3 rounded-md border border-border/50 bg-background/35 px-3 py-2 text-sm">
                  <Checkbox
                    checked={!!settings.validationChecklist[item.id]}
                    onCheckedChange={(checked) => onChecklistChange(item.id, !!checked)}
                  />
                  <span className="leading-5">{item.label}</span>
                </label>
              ))}
            </div>
          </SettingsCard>
        </section>
      </div>

      <Dialog open={!!pendingBackup} onOpenChange={(open) => !open && setPendingBackup(null)}>
        <DialogContent className="max-h-[calc(100svh-7rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar backup</DialogTitle>
            <DialogDescription>Revise o resumo e escolha como os dados serão importados.</DialogDescription>
          </DialogHeader>
          {pendingBackup && (
            <div className="grid gap-2 rounded-md border border-border/60 bg-background/35 p-3 text-sm text-muted-foreground">
              <InfoRow label="Cadernos" value={String(pendingBackup.data.notebooks.length)} />
              <InfoRow label="Anotações" value={String(pendingBackup.data.notes.length)} />
              <InfoRow label="Tarefas" value={String(pendingBackup.data.tasks.length)} />
              <InfoRow label="Exportado em" value={new Date(pendingBackup.exportedAt).toLocaleString("pt-BR")} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingBackup(null)}>Cancelar</Button>
            <Button variant="secondary" disabled={!!busyAction} onClick={() => handleImport("merge")}>
              {busyAction === "import-merge" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mesclar
            </Button>
            <Button
              variant="destructive"
              disabled={!!busyAction}
              onClick={() => setReplaceConfirmOpen(true)}
            >
              {busyAction === "import-replace" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Substituir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sampleConfirmOpen} onOpenChange={setSampleConfirmOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar dados de exemplo?</DialogTitle>
            <DialogDescription>
              Os exemplos serão adicionados aos seus dados atuais. Nada será apagado e outros usuários não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSampleConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSampleData} disabled={busyAction === "sample"}>
              {busyAction === "sample" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar exemplos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Substituir dados atuais?</DialogTitle>
            <DialogDescription>
              Esta ação apagará seus dados atuais antes da importação. Dados de outros usuários não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceConfirmOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setReplaceConfirmOpen(false);
                handleImport("replace");
              }}
              disabled={!!busyAction}
            >
              {busyAction === "import-replace" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Substituir e importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetar meus dados?</DialogTitle>
            <DialogDescription>
              Esta ação apagará todos os seus cadernos, anotações e tarefas neste app. Dados de outros usuários não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-confirmation">Digite RESETAR para confirmar</Label>
            <Input
              id="reset-confirmation"
              value={resetText}
              onChange={(event) => setResetText(event.target.value)}
              placeholder="RESETAR"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={resetText !== "RESETAR" || busyAction === "reset"} onClick={handleReset}>
              {busyAction === "reset" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resetar meus dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/65 bg-card/70 p-4 shadow-sm ring-1 ring-white/5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function ProFeatureRow({
  icon: Icon,
  title,
  description,
  active,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border/60 bg-background/35 p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant={active ? "secondary" : "outline"} className="rounded-full">
            {active ? "Ativo" : "Pro"}
          </Badge>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  loading,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Button {...props} className="h-10 w-full gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </Button>
  );
}
