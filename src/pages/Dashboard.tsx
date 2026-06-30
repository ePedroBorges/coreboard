import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useFavoritePages } from "@/hooks/usePages";
import {
  BookOpen,
  FileText,
  Star,
  Tag,
  Clock,
  TrendingUp,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Page, Notebook, Block } from "@/types/notes";

type FilterPeriod = "all" | "month" | "year" | "custom";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<FilterPeriod>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(() => format(new Date(), "yyyy"));

  const notebooks = useNotebooks();
  const favorites = useFavoritePages();

  // Fetch all pages for stats
  const allPages = useQuery({
    queryKey: ["all-pages", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Page[]> => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((page) => ({
        ...page,
        content: Array.isArray(page.content) ? (page.content as unknown as Block[]) : [],
      }));
    },
  });

  // Fetch all tags
  const allTags = useQuery({
    queryKey: ["all-tags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Filter pages by period
  const filteredPages = useMemo(() => {
    if (!allPages.data) return [];
    if (period === "all") return allPages.data;

    return allPages.data.filter((p) => {
      const d = parseISO(p.created_at);
      if (period === "month") {
        const [y, m] = selectedMonth.split("-").map(Number);
        const start = startOfMonth(new Date(y, m - 1));
        const end = endOfMonth(new Date(y, m - 1));
        return isWithinInterval(d, { start, end });
      }
      if (period === "year") {
        const y = parseInt(selectedYear);
        return isWithinInterval(d, { start: startOfYear(new Date(y, 0)), end: endOfYear(new Date(y, 0)) });
      }
      return true;
    });
  }, [allPages.data, period, selectedMonth, selectedYear]);

  // KPIs
  const totalNotebooks = notebooks.data?.length || 0;
  const totalPages = filteredPages.length;
  const totalFavorites = filteredPages.filter((p) => p.is_favorite).length;
  const totalTags = allTags.data?.length || 0;

  const totalBlocks = useMemo(() => {
    return filteredPages.reduce((acc, p) => acc + (Array.isArray(p.content) ? p.content.length : 0), 0);
  }, [filteredPages]);

  const totalChecklists = useMemo(() => {
    return filteredPages.reduce((acc, p) => {
      if (!Array.isArray(p.content)) return acc;
      return acc + p.content.filter((b: Block) => b.type === "checklist").length;
    }, 0);
  }, [filteredPages]);

  const completedChecklists = useMemo(() => {
    return filteredPages.reduce((acc, p) => {
      if (!Array.isArray(p.content)) return acc;
      return acc + p.content.filter((b: Block) => b.type === "checklist" && b.checked).length;
    }, 0);
  }, [filteredPages]);

  // Recent activity
  const recentPages = useMemo(() => {
    return [...filteredPages].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  }, [filteredPages]);

  // Pages per notebook
  const pagesPerNotebook = useMemo(() => {
    if (!notebooks.data || !filteredPages.length) return [];
    return notebooks.data.map((n) => ({
      name: n.title,
      count: filteredPages.filter((p) => p.notebook_id === n.id).length,
    })).sort((a, b) => b.count - a.count);
  }, [notebooks.data, filteredPages]);

  // Month options
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: ptBR }) });
    }
    return opts;
  }, []);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ value: String(current - i), label: String(current - i) }));
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeView="diary"
          sidebarPinned
          onToggleSidebarPinned={() => {}}
          onMouseLeave={() => {}}
          onSelectToday={() => navigate("/")}
          onSelectTasks={() => navigate("/")}
          onSelectNotes={() => navigate("/")}
          onSelectCalendar={() => navigate("/")}
          notebooks={notebooks.data || []}
          pinnedNotebooks={[]}
          pinnedTasks={[]}
          favoritePages={favorites.data || []}
          selectedPageId={null}
          onOpenNotebook={() => navigate("/")}
          onOpenPage={() => navigate("/")}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader canGoBack onBack={() => navigate("/")} />
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground font-mono-accent">Visão geral das suas notas</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={period} onValueChange={(v) => setPeriod(v as FilterPeriod)}>
                  <SelectTrigger className="w-[140px] h-10 sm:h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="month">Por mês</SelectItem>
                    <SelectItem value="year">Por ano</SelectItem>
                  </SelectContent>
                </Select>

                {period === "month" && (
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px] h-10 sm:h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="capitalize">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {period === "year" && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[100px] h-10 sm:h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <KpiCard icon={BookOpen} label="Cadernos" value={totalNotebooks} color="text-primary" />
              <KpiCard icon={FileText} label="Anotações" value={totalPages} color="text-accent" />
              <KpiCard icon={Star} label="Favoritas" value={totalFavorites} color="text-warning" />
              <KpiCard icon={Tag} label="Tags" value={totalTags} color="text-primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Blocks stats */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Produtividade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalBlocks}</div>
                      <div className="text-[11px] text-muted-foreground font-mono-accent">Blocos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalChecklists}</div>
                      <div className="text-[11px] text-muted-foreground font-mono-accent">Checklists</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0}%
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono-accent">Concluídos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pages per notebook */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-accent" />
                    Anotações por Caderno
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pagesPerNotebook.length > 0 ? (
                    <div className="space-y-2">
                      {pagesPerNotebook.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-sm truncate max-w-[200px]">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.min(100, (item.count / Math.max(...pagesPerNotebook.map(p => p.count), 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono-accent text-xs text-muted-foreground w-6 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentPages.length > 0 ? (
                  <div className="space-y-2">
                    {recentPages.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{p.title}</span>
                          {p.is_favorite && <Star className="h-3 w-3 text-warning fill-warning shrink-0" />}
                        </div>
                        <span className="font-mono-accent text-[11px] text-muted-foreground shrink-0 ml-2">
                          {format(new Date(p.updated_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade no período</p>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-5 flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/5">
          <Icon className={`h-5 w-5 sm:h-4 sm:w-4 ${color}`} />
        </div>
        <div>
          <div className="text-2xl sm:text-xl font-bold">{value}</div>
          <div className="text-[11px] sm:text-[10px] text-muted-foreground font-mono-accent uppercase tracking-wider">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
