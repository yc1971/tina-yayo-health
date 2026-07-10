import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { HealthAlert } from "@shared/schema";
import { usePatient } from "@/context/PatientContext";

const typeConfig: Record<string, { label: string; color: string; glow: string }> = {
  critical: { label: "Crítica", color: "text-red-400 bg-red-500/10 border-red-500/20", glow: "glow-critical" },
  warning: { label: "Advertencia", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", glow: "glow-warning" },
  recommendation: { label: "Recomendación", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", glow: "" },
  prevention: { label: "Prevención", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", glow: "" },
};

export default function Alerts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");
  const [form, setForm] = useState({ type: "warning", title: "", description: "" });
  const { patientLabel, patientAge, isYayo, studyBelongsToPatient } = usePatient();

  const { data: allAlerts = [], isLoading } = useQuery<HealthAlert[]>({
    queryKey: ["/api/alerts"],
    queryFn: () => apiRequest("GET", "/api/alerts").then(r => r.json()),
  });

  // Filter by active patient
  const alerts = allAlerts.filter(a => studyBelongsToPatient(a.title));

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/alerts/${id}/resolve`).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/alerts"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/alerts", form).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/alerts"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      setShowNew(false);
      setForm({ type: "warning", title: "", description: "" });
      toast({ title: "Alerta creada" });
    },
  });

  const filtered = alerts.filter(a => {
    if (filter === "active") return !a.resolved;
    if (filter === "resolved") return a.resolved;
    return true;
  });

  const active = alerts.filter(a => !a.resolved).length;
  const critical = alerts.filter(a => !a.resolved && a.type === "critical").length;

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-semibold text-foreground">Alertas — {patientLabel}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              isYayo
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-pink-500/10 text-pink-400 border-pink-500/20"
            }`}>{patientAge}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {active} activa{active !== 1 ? "s" : ""}
            {critical > 0 && <span className="text-red-400 ml-2">· {critical} crítica{critical !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Button data-testid="btn-new-alert" onClick={() => setShowNew(true)} className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" />
          Nueva Alerta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "active", "resolved"] as const).map(f => (
          <button
            key={f}
            data-testid={`alert-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            {f === "all" ? "Todas" : f === "active" ? "Activas" : "Resueltas"}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-xl">
          <Bell className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">{filter === "active" ? "Sin alertas activas" : "No hay alertas"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(alert => {
            const cfg = typeConfig[alert.type] ?? typeConfig.warning;
            return (
              <div
                key={alert.id}
                data-testid={`alert-item-${alert.id}`}
                className={`glass rounded-xl p-5 border ${cfg.color} ${!alert.resolved ? cfg.glow : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${alert.type === "critical" ? "text-red-400" : alert.type === "prevention" || alert.type === "recommendation" ? "text-blue-400" : "text-amber-400"}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{alert.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${cfg.color}`}>{cfg.label}</span>
                        {alert.resolved && <span className="text-xs text-muted-foreground">(Resuelta)</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(alert.createdAt).toLocaleDateString("es-PR", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      data-testid={`btn-resolve-${alert.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                      className="border-border text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolver
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New alert dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nueva Alerta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="warning">Advertencia</SelectItem>
                  <SelectItem value="recommendation">Recomendación</SelectItem>
                  <SelectItem value="prevention">Prevención</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input data-testid="alert-title-input" placeholder="ej. Glucosa elevada" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea data-testid="alert-desc-input" placeholder="Detalla la alerta, recomendación o acción a tomar..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)} className="border-border">Cancelar</Button>
            <Button
              data-testid="btn-create-alert"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.title || !form.description}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              {createMutation.isPending ? "Guardando..." : "Crear Alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
