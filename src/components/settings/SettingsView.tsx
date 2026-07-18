import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardCopy,
  Bell,
  CreditCard,
  Download,
  FileJson,
  LifeBuoy,
  Layers3,
  Loader2,
  LogOut,
  Lock,
  Mail,
  Moon,
  Palette,
  Paperclip,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Volume2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NotificationControls } from "@/hooks/useNotifications";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { AppearanceThemePreset } from "@/lib/appearance";
import { ThemeLibrary } from "@/components/settings/ThemeLibrary";
import { useAuth } from "@/hooks/useAuth";
import { UserSettings } from "@/hooks/useUserSettings";
import { Notebook, Page } from "@/types/notes";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentsReturnBaseUrl, getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { playAppSound } from "@/lib/soundEffects";
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

const appSummary = "Estou usando o VISTA Tasks Control, um app para transformar anotacoes em tarefas executaveis. Feedback desejado: clareza, organizacao, velocidade e utilidade no dia a dia.";

const checklistItems = [
  { id: "first-note", label: "Criei minha primeira anotação" },
  { id: "organized-note", label: "Organizei uma anotação em uma pasta" },
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
  notifications: NotificationControls;
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
  notifications,
}: SettingsViewProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { signOut, resetPassword } = useAuth();
  const {
    theme,
    setTheme,
    toggleTheme,
    colorScheme,
    setColorScheme,
    visualTheme,
    setVisualTheme,
    reducedMotion,
    setReducedMotion,
    enhancedEffects,
    setEnhancedEffects,
  } = useTheme();
  const { isPro, loading: subscriptionLoading, plan, subscription, isLifetime } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<VistaBackup | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [sampleConfirmOpen, setSampleConfirmOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

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
    onSettingsImported(pendingBackup.data?.settings);
    await invalidateUserData();
    setPendingBackup(null);
    onGoToday();
    toast.success(`Backup importado: ${result.notebooks} pastas, ${result.notes} anotações e ${result.tasks} tarefas.`);
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
    toast.success(`Dados de exemplo carregados: ${result.notebooks} pastas, ${result.notes} anotações e ${result.tasks} tarefas.`);
  });

  const copySummary = async () => {
    await navigator.clipboard.writeText(appSummary);
    toast.success("Resumo do app copiado.");
  };

  const sendFeedback = () => {
    window.location.href = `mailto:contato@anchorlab.com.br?subject=${encodeURIComponent("Feedback VISTA Tasks Control")}&body=${encodeURIComponent(appSummary)}`;
  };

  const openBillingPortal = async () => {
    if (!subscription) {
      navigate("/planos");
      return;
    }
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: getPaymentsReturnBaseUrl() + "/configuracoes", environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    const { error } = await resetPassword(user.email);
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de redefinição para seu email.");
  };

  const handleSetAppearanceTheme = (preset: AppearanceThemePreset) => {
    if (preset.pro && !isPro) {
      toast.error("Este tema faz parte da personalização Pro.");
      navigate("/planos");
      return;
    }
    setTheme(preset.mode);
    setColorScheme(preset.colorScheme);
    setVisualTheme(preset.visualTheme);
    setEnhancedEffects(Boolean(preset.enhancedEffects));
    toast.success(`Tema ${preset.label} aplicado.`);
  };

  const handleEnhancedEffectsChange = (enabled: boolean) => {
    if (!isPro) {
      toast.error("Efeitos avançados são um recurso Pro.");
      navigate("/planos");
      return;
    }
    setEnhancedEffects(enabled);
  };

  const handleNotificationChange = async (enabled: boolean) => {
    if (!isPro) {
      toast.error("Lembretes são um recurso Pro.");
      navigate("/planos");
      return;
    }
    setNotificationBusy(true);
    try {
      await notifications.setNotificationsEnabled(enabled);
    } finally {
      setNotificationBusy(false);
    }
  };

  const completedChecklist = checklistItems.filter((item) => settings.validationChecklist[item.id]).length;
  const userName = user.user_metadata?.username || user.user_metadata?.name || "Nao informado";
  const emailVerified = user.email_confirmed_at ? "Confirmado" : "Pendente";
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "N?o informado";
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-3 sm:p-6">
      <section className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Settings className="h-4 w-4" />
          Configurações
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {userName !== "Nao informado" ? userName : user.email?.split("@")[0]}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {user.email} · Plano {plan.toUpperCase()}
        </p>
      </section>

      <Tabs defaultValue="perfil" className="min-w-0 w-full">
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5">
          <TabsTrigger value="perfil" className="min-h-11 gap-1.5"><UserRound className="h-3.5 w-3.5" />Perfil</TabsTrigger>
          <TabsTrigger value="plano" className="min-h-11 gap-1.5"><CreditCard className="h-3.5 w-3.5" />Plano</TabsTrigger>
          <TabsTrigger value="aparencia" className="min-h-11 gap-1.5"><Palette className="h-3.5 w-3.5" />Aparência</TabsTrigger>
          <TabsTrigger value="dados" className="min-h-11 gap-1.5"><FileJson className="h-3.5 w-3.5" />Dados</TabsTrigger>
          <TabsTrigger value="ajuda" className="col-span-2 min-h-11 gap-1.5 sm:col-span-1"><LifeBuoy className="h-3.5 w-3.5" />Ajuda</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4">
          <SettingsCard title="Sua conta" icon={UserRound}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <InfoRow label="Nome" value={userName} />
              <InfoRow label="Email" value={user.email || "Nao informado"} />
              <InfoRow label="Confirmação de email" value={emailVerified} />
              <InfoRow label="Criado em" value={createdAt} />
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <Button variant="outline" className="h-10 gap-2" onClick={handlePasswordReset}>
                  <ShieldCheck className="h-4 w-4" />
                  Redefinir senha
                </Button>
                <Button variant="outline" className="h-10 gap-2" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </Button>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Checklist de validação" icon={CheckCircle2}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Progresso do perfil</span>
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
        </TabsContent>

        <TabsContent value="plano" className="space-y-4">
          <SettingsCard title="Plano atual" icon={Sparkles}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <InfoRow label="Plano" value={subscriptionLoading ? "Verificando..." : plan.toUpperCase()} />
              {subscription && <InfoRow label="Status" value={subscription.status} />}
              {periodEnd && !isLifetime && (
                <InfoRow label={subscription.cancel_at_period_end ? "Acesso até" : "Renova em"} value={periodEnd} />
              )}
              {isLifetime && <InfoRow label="Acesso" value="Vitalício" />}
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                {!isPro && (
                  <Button className="h-10 gap-2" onClick={() => navigate("/planos")}>
                    <Sparkles className="h-4 w-4" />
                    Fazer upgrade para Pro
                  </Button>
                )}
                {isPro && !isLifetime && (
                  <Button variant="outline" className="h-10 gap-2" onClick={openBillingPortal} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Gerenciar assinatura
                  </Button>
                )}
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Recursos Pro" icon={Sparkles}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <ProFeatureRow icon={Layers3} title="Temas visuais premium" description="Anime, desenho, ouro e blocos mudam a personalidade completa do app." active={isPro} />
              <ProFeatureRow icon={Zap} title="Cores e efeitos avançados" description="Esquemas luminosos, RGB dinâmico e realces de profundidade." active={isPro} />
              <ProFeatureRow icon={Bell} title="Lembretes locais" description="Receba alertas no Android para tarefas pendentes com data definida." active={isPro} />
              <ProFeatureRow icon={Paperclip} title="Anexos" description="Adicione imagens e arquivos PDF às suas anotações." active={isPro} />
              <ProFeatureRow icon={Download} title="Exportação em PDF" description="Baixe ou compartilhe anotações em um formato pronto para uso." active={isPro} />
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-4">
          <SettingsCard title="Modo" icon={theme === "dark" ? Moon : Sun}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <InfoRow label="Modo atual" value={theme === "dark" ? "Escuro" : "Claro"} />
              <Button variant="outline" className="h-10 w-full gap-2" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Alternar para {theme === "dark" ? "Claro" : "Escuro"}
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard title="Biblioteca de temas" icon={Palette}>
            <p className="text-sm leading-6 text-muted-foreground">
              Cada tema combina cores, modo, superfícies, tipografia e movimento. Abra uma categoria para explorar.
            </p>
            <ThemeLibrary
              mode={theme}
              colorScheme={colorScheme}
              visualTheme={visualTheme}
              isPro={isPro}
              onSelect={handleSetAppearanceTheme}
            />
          </SettingsCard>

          <SettingsCard title="Conforto e efeitos" icon={Layers3}>
            <div className="divide-y divide-border/60">
              <PreferenceToggle
                title="Reduzir animações"
                description="Mais conforto visual e menor consumo de recursos. Disponível no plano gratuito."
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
              />
              <PreferenceToggle
                title="Realces luminosos"
                description="Aumenta profundidade, brilho e movimento nos esquemas compatíveis."
                checked={enhancedEffects && isPro}
                onCheckedChange={handleEnhancedEffectsChange}
                pro
                locked={!isPro}
              />
            </div>
          </SettingsCard>

          <SettingsCard title="Sons da interface" icon={Volume2}>
            <div className="space-y-3">
              <PreferenceToggle
                title="Feedback sonoro"
                description="Confirma ações importantes com sons curtos e discretos."
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => {
                  onSettingsImported({ ...settings, soundEnabled: checked });
                  playAppSound("preview", checked, settings.soundStyle);
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={settings.soundStyle === "soft" ? "secondary" : "outline"}
                  onClick={() => {
                    onSettingsImported({ ...settings, soundStyle: "soft" });
                    playAppSound("preview", true, "soft");
                  }}
                >Sutil</Button>
                <Button
                  variant={settings.soundStyle === "arcade" ? "secondary" : "outline"}
                  onClick={() => {
                    if (!isPro) { toast.error("O perfil Arcade faz parte do Pro."); navigate("/planos"); return; }
                    onSettingsImported({ ...settings, soundStyle: "arcade" });
                    playAppSound("preview", true, "arcade");
                  }}
                >Arcade {!isPro && <Lock className="ml-2 h-3.5 w-3.5" />}</Button>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Onboarding" icon={RotateCcw}>
            <Button variant="outline" className="h-10 w-full gap-2" onClick={onOpenOnboarding}>
              <RotateCcw className="h-4 w-4" />
              Ver onboarding novamente
            </Button>
          </SettingsCard>

          <SettingsCard title="Notificações" icon={Bell}>
            <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-background/35 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Lembretes de tarefas pendentes</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Agenda notificações locais no Android para tarefas pendentes com data definida.
                </p>
              </div>
              <Switch
                checked={notifications.enabled}
                disabled={!isPro || !notifications.supported || notificationBusy}
                onCheckedChange={handleNotificationChange}
                aria-label="Ativar notificações"
              />
            </div>
            {!notifications.supported && (
              <p className="text-xs text-muted-foreground">
                Notificações não estão disponíveis neste ambiente.
              </p>
            )}
            {!isPro && (
              <Button variant="outline" className="h-10 w-full gap-2" onClick={() => navigate("/planos")}>
                <Lock className="h-4 w-4" /> Desbloquear lembretes com Pro
              </Button>
            )}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="dados" className="space-y-4">
          <SettingsCard title="Backup e importação" icon={FileJson}>
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
        </TabsContent>

        <TabsContent value="ajuda" className="space-y-4">
          <SettingsCard title="Produto" icon={Sparkles}>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <InfoRow label="Nome" value="VISTA Tasks Control" />
              <InfoRow label="Versão" value="1.0" />
              <InfoRow label="Desenvolvido por" value="AnchorLab Studio" />
            </div>
          </SettingsCard>

          <SettingsCard title="Ajuda e feedback" icon={LifeBuoy}>
            <p className="text-sm leading-6 text-muted-foreground">
              Use o VISTA Tasks Control no seu dia a dia e envie feedback sobre clareza, velocidade e utilidade.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-10 gap-2" onClick={copySummary}>
                <ClipboardCopy className="h-4 w-4" />
                Copiar resumo do app
              </Button>
              <Button variant="outline" className="h-10 gap-2" onClick={sendFeedback}>
                <Mail className="h-4 w-4" />
                Enviar feedback
              </Button>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>

      <Dialog open={!!pendingBackup} onOpenChange={(open) => !open && setPendingBackup(null)}>
        <DialogContent className="max-h-[calc(100svh-7rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar backup</DialogTitle>
            <DialogDescription>Revise o resumo e escolha como os dados serão importados.</DialogDescription>
          </DialogHeader>
          {pendingBackup && (
            <div className="grid gap-2 rounded-md border border-border/60 bg-background/35 p-3 text-sm text-muted-foreground">
              <InfoRow label="Pastas" value={String(pendingBackup.data?.notebooks.length)} />
              <InfoRow label="Anotações" value={String(pendingBackup.data?.notes.length)} />
              <InfoRow label="Tarefas" value={String(pendingBackup.data?.tasks.length)} />
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
              Esta ação apagará todos os seus pastas, anotações e tarefas neste app. Dados de outros usuários não serão afetados.
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

function PreferenceToggle({
  title,
  description,
  checked,
  onCheckedChange,
  pro = false,
  locked = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  pro?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {pro && <Badge variant={locked ? "outline" : "secondary"} className="h-4 px-1 text-[10px]">PRO</Badge>}
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
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
    <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-left font-medium text-foreground sm:text-right">{value}</span>
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
