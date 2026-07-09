import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Activity, FlaskConical, AlertTriangle } from "lucide-react";
import type { Study, LabResult } from "@shared/schema";

const COLORS = {
  primary: "hsl(192, 80%, 45%)",
  blue: "hsl(217, 91%, 60%)",
  violet: "hsl(263, 70%, 60%)",
  emerald: "hsl(142, 76%, 45%)",
  amber: "hsl(38, 92%, 50%)",
  red: "hsl(0, 72%, 51%)",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="font-medium" style={{ color: p.color }}>{p.value} {p.unit ?? ""}</div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { data: studies = [], isLoading: studiesLoading } = useQuery<Study[]>({
    queryKey: ["/api/studies"],
    queryFn: () => apiRequest("GET", "/api/studies").then(r => r.json()),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  const isLoading = studiesLoading || statsLoading;

  // Studies by category pie
  const categoryData = [
    { name: "Laboratorios", value: stats?.totalLabs ?? 0, color: COLORS.blue },
    { name: "Imágenes", value: stats?.totalScans ?? 0, color: COLORS.violet },
    { name: "Radiografías", value: stats?.totalXrays ?? 0, color: COLORS.emerald },
  ].filter(d => d.value > 0);

  // Studies per month
  const studiesByMonth: Record<string, number> = {};
  studies.forEach(s => {
    const month = s.studyDate.slice(0, 7); // YYYY-MM
    studiesByMonth[month] = (studiesByMonth[month] ?? 0) + 1;
  });
  const studiesTimeData = Object.entries(studiesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("es-PR", { month: "short", year: "2-digit" }),
      count,
    }));

  // Lab markers trend (group by markerName, get last N values)
  const allLabResults: any[] = stats?.labResults ?? [];
  const markerMap: Record<string, { date: string; value: number; unit: string }[]> = {};
  allLabResults.forEach((r: any) => {
    if (r.value == null) return;
    if (!markerMap[r.markerName]) markerMap[r.markerName] = [];
    markerMap[r.markerName].push({ date: r.studyDate, value: r.value, unit: r.unit ?? "" });
  });
  const topMarkers = Object.entries(markerMap)
    .filter(([, vals]) => vals.length >= 2)
    .slice(0, 4);

  // Status distribution
  const statusCounts = { normal: 0, high: 0, low: 0, critical: 0 };
  allLabResults.forEach((r: any) => {
    const s = r.status as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
  });
  const statusData = [
    { name: "Normal", value: statusCounts.normal, color: COLORS.emerald },
    { name: "Alto", value: statusCounts.high, color: COLORS.amber },
    { name: "Bajo", value: statusCounts.low, color: COLORS.blue },
    { name: "Crítico", value: statusCounts.critical, color: COLORS.red },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const hasData = studies.length > 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Análisis & Tendencias</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualización histórica de tus estudios y marcadores</p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center glass rounded-xl">
          <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Agrega estudios para ver análisis y tendencias</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Studies over time */}
          <div className="glass rounded-xl p-6 col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Estudios por Mes</h2>
            </div>
            {studiesTimeData.length < 2 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Necesitas más estudios para ver tendencias</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={studiesTimeData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 14%)" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category distribution */}
          {categoryData.length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <FlaskConical className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Distribución por Tipo</h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "hsl(210, 10%, 50%)" }} fontSize={11}>
                    {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status distribution */}
          {statusData.length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Estado de Marcadores de Lab</h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 14%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Marker trends */}
          {topMarkers.map(([markerName, values]) => {
            const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));
            const chartData = sorted.map(v => ({
              date: new Date(v.date).toLocaleDateString("es-PR", { month: "short", day: "numeric" }),
              value: v.value,
              unit: v.unit,
            }));
            return (
              <div key={markerName} className="glass rounded-xl p-6">
                <h2 className="text-sm font-semibold text-foreground mb-1">{markerName}</h2>
                <p className="text-xs text-muted-foreground mb-4">{values[0]?.unit} · Tendencia</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 14%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
