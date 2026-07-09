import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { FlaskConical, Scan, RadioTower, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Study, HealthAlert } from "@shared/schema";
import { usePatient } from "@/context/PatientContext";

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">{label}</div>
          <div className="text-3xl font-bold text-foreground mono">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status?.toLowerCase() ?? "normal";
  const map: Record<string, string> = {
    normal: "status-normal",
    high: "status-high",
    low: "status-low",
    critical: "status-critical",
  };
  const labels: Record<string, string> = {
    normal: "Normal",
    high: "Alto",
    low: "Bajo",
    critical: "Crítico",
  };
  const icons: Record<string, any> = {
    high: TrendingUp,
    low: TrendingDown,
    normal: Minus,
    critical: AlertTriangle,
  };
  const Icon = icons[s] ?? Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${map[s] ?? map.normal}`}>
      <Icon className="w-3 h-3" />
      {labels[s] ?? "Normal"}
    </span>
  );
}

function getCategoryIcon(cat: string) {
  if (cat === "lab") return FlaskConical;
  if (cat === "scan") return Scan;
  if (cat === "xray") return RadioTower;
  return FileText;
}

function getCategoryLabel(cat: string) {
  if (cat === "lab") return "Laboratorio";
  if (cat === "scan") return "Imagen";
  if (cat === "xray") return "Radiografía";
  return "Otro";
}

export default function Dashboard() {
  const { patientLabel, patientAge, isYayo, studyBelongsToPatient } = usePatient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  const { data: allStudies, isLoading: studiesLoading } = useQuery<Study[]>({
    queryKey: ["/api/studies"],
    queryFn: () => apiRequest("GET", "/api/studies").then(r => r.json()),
  });

  const { data: allAlerts, isLoading: alertsLoading } = useQuery<HealthAlert[]>({
    queryKey: ["/api/alerts"],
    queryFn: () => apiRequest("GET", "/api/alerts").then(r => r.json()),
  });

  // Filter by active patient
  const studies = allStudies?.filter(s => studyBelongsToPatient(s.title)) ?? [];
  const alerts = allAlerts?.filter(a => studyBelongsToPatient(a.title)) ?? [];

  const recentStudies = studies.slice(0, 5);
  const activeAlerts = alerts.filter(a => !a.resolved).slice(0, 4);

  // Per-patient computed stats
  const totalStudies = studies.length;
  const totalLabs = studies.filter(s => s.category === "lab").length;
  const totalScans = studies.filter(s => s.category === "scan").length;
  const totalXrays = studies.filter(s => s.category === "xray").length;
  const totalActiveAlerts = alerts.filter(a => !a.resolved).length;
  const criticalAlerts = alerts.filter(a => !a.resolved && a.type === "critical").length;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Dashboard — {patientLabel}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              isYayo
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-pink-500/10 text-pink-400 border-pink-500/20"
            }`}>{patientAge}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("es-PR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Estudios" value={totalStudies} icon={FileText} color="bg-primary/10 text-primary" />
            <StatCard label="Laboratorios" value={totalLabs} icon={FlaskConical} color="bg-blue-500/10 text-blue-400" />
            <StatCard label="Imágenes" value={totalScans} icon={Scan} color="bg-violet-500/10 text-violet-400" sub={`+ ${totalXrays} radiografías`} />
            <StatCard
              label="Alertas Activas"
              value={totalActiveAlerts}
              icon={AlertTriangle}
              color={criticalAlerts > 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}
              sub={criticalAlerts > 0 ? `${criticalAlerts} críticas` : "Sin alertas críticas"}
            />
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent studies */}
        <div className="col-span-2 glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground">Estudios Recientes</h2>
            <Link href="/studies">
              <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {studiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : recentStudies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay estudios aún</p>
              <Link href="/studies/new">
                <span className="text-primary text-xs mt-2 hover:underline cursor-pointer">Agregar primer estudio →</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentStudies.map(study => {
                const Icon = getCategoryIcon(study.category);
                return (
                  <Link key={study.id} href={`/studies/${study.id}`}>
                    <div
                      data-testid={`study-row-${study.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{study.title}</div>
                        <div className="text-xs text-muted-foreground">{study.facility ?? "Sin instalación"} · {new Date(study.studyDate).toLocaleDateString("es-PR")}</div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {getCategoryLabel(study.category)}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts panel */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground">Alertas Activas</h2>
            <Link href="/alerts">
              <span className="text-xs text-primary hover:underline cursor-pointer">Ver todas</span>
            </Link>
          </div>
          {alertsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <span className="text-lg">✓</span>
              </div>
              <p className="text-sm text-muted-foreground">Sin alertas activas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  data-testid={`alert-card-${alert.id}`}
                  className={`p-3 rounded-lg border ${alert.type === "critical" ? "glow-critical border-red-500/20 bg-red-500/5" : "glow-warning border-amber-500/20 bg-amber-500/5"}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.type === "critical" ? "text-red-400" : "text-amber-400"}`} />
                    <div>
                      <div className="text-sm font-medium text-foreground">{alert.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lab results highlight */}
      {studies.filter(s => s.category === "lab").length > 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Marcadores Fuera de Rango — {patientLabel}</h2>
          <div className="grid grid-cols-4 gap-3">
            {(stats?.labResults ?? [])
              .filter((r: any) => {
                // Match to this patient's study IDs
                const patientStudyIds = studies.map(s => s.id);
                return r.status !== "normal" && patientStudyIds.includes(r.studyId);
              })
              .slice(0, 8)
              .map((r: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">{r.markerName}</div>
                  <div className="font-semibold text-foreground mono text-lg">
                    {r.value} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
