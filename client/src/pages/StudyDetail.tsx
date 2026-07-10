import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, useLocation, Link } from "wouter";
import { ChevronLeft, FlaskConical, Scan, RadioTower, FileText, TrendingUp, TrendingDown, Minus, AlertTriangle, ExternalLink, Trash2, CheckCircle, Stethoscope, Sparkles, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

function StatusChip({ status }: { status: string | null | undefined }) {
  const s = status?.toLowerCase() ?? "normal";
  const map: Record<string, string> = {
    normal: "status-normal", high: "status-high", low: "status-low", critical: "status-critical",
  };
  const labels: Record<string, string> = { normal: "Normal", high: "Alto", low: "Bajo", critical: "Crítico" };
  const icons: Record<string, any> = { high: TrendingUp, low: TrendingDown, normal: Minus, critical: AlertTriangle };
  const Icon = icons[s] ?? Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium ${map[s] ?? map.normal}`}>
      <Icon className="w-3 h-3" />
      {labels[s] ?? "Normal"}
    </span>
  );
}

function SeverityChip({ severity }: { severity: string | null | undefined }) {
  const s = severity?.toLowerCase() ?? "normal";
  const map: Record<string, string> = {
    normal: "status-normal", mild: "status-low", moderate: "status-high", severe: "status-critical",
  };
  const labels: Record<string, string> = { normal: "Normal", mild: "Leve", moderate: "Moderado", severe: "Severo" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium ${map[s] ?? map.normal}`}>
      {labels[s] ?? s}
    </span>
  );
}

const categoryIconMap: Record<string, any> = {
  lab: FlaskConical, scan: Scan, xray: RadioTower, other: FileText,
};
const categoryLabelMap: Record<string, string> = {
  lab: "Laboratorio", scan: "Imagen / Scan", xray: "Radiografía", other: "Otro",
};

export default function StudyDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [functionalAnalysis, setFunctionalAnalysis] = useState<string | null>(null);

  const { data: study, isLoading } = useQuery({
    queryKey: ["/api/studies", id],
    queryFn: () => apiRequest("GET", `/api/studies/${id}`).then(r => r.json()),
  });

  const studyAnalysisMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/ai/analyze-study/${id}`).then(r => r.json()),
    onSuccess: (data) => setFunctionalAnalysis(data.analysis),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/studies/${id}`).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/studies"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Estudio eliminado" });
      setLocation("/studies");
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-5 md:space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Estudio no encontrado</p>
        <Link href="/studies"><span className="text-primary text-sm mt-2 hover:underline cursor-pointer">Volver a estudios</span></Link>
      </div>
    );
  }

  const Icon = categoryIconMap[study.category] ?? FileText;
  const labResults = study.labResults ?? [];
  const findings = study.imagingFindings ?? [];
  const abnormal = labResults.filter((r: any) => r.status !== "normal");

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/studies">
            <div className="w-8 h-8 rounded-lg border border-border hover:bg-secondary cursor-pointer flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-foreground">{study.title}</h1>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">{categoryLabelMap[study.category]}</Badge>
                <span>·</span>
                <span>{new Date(study.studyDate).toLocaleDateString("es-PR", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm("¿Eliminar este estudio?")) deleteMutation.mutate();
          }}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Eliminar
        </Button>
      </div>

      {/* Info card */}
      <div className="glass rounded-xl p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: "Instalación", value: study.facility || "—" },
          { label: "Doctor", value: study.doctor ? `Dr. ${study.doctor}` : "—" },
          { label: "Archivo", value: study.fileName ? (
            <a href={study.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <span className="truncate max-w-40">{study.fileName}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="text-sm text-foreground">{value}</div>
          </div>
        ))}
        {study.notes && (
          <div className="col-span-3 border-t border-border pt-4">
            <div className="text-xs text-muted-foreground mb-1">Notas</div>
            <div className="text-sm text-foreground">{study.notes}</div>
          </div>
        )}
      </div>

      {/* Abnormal summary */}
      {abnormal.length > 0 && (
        <div className="glass rounded-xl p-5 border border-amber-500/20 glow-warning">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">{abnormal.length} marcador{abnormal.length !== 1 ? "es" : ""} fuera de rango</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {abnormal.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">{r.markerName}</div>
                  <div className="font-semibold text-foreground mono">{r.value} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span></div>
                  {r.referenceMin != null && r.referenceMax != null && (
                    <div className="text-xs text-muted-foreground">Ref: {r.referenceMin}–{r.referenceMax}</div>
                  )}
                </div>
                <StatusChip status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab results table */}
      {labResults.length > 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Resultados Completos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium pb-3 pr-4">Marcador</th>
                  <th className="text-right text-xs text-muted-foreground font-medium pb-3 pr-4">Valor</th>
                  <th className="text-right text-xs text-muted-foreground font-medium pb-3 pr-4">Referencia</th>
                  <th className="text-center text-xs text-muted-foreground font-medium pb-3 pr-4">Estado</th>
                  <th className="text-left text-xs text-muted-foreground font-medium pb-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {labResults.map((r: any) => (
                  <tr key={r.id} className={r.status !== "normal" ? "bg-amber-500/5" : ""}>
                    <td className="py-3 pr-4 font-medium text-foreground">{r.markerName}</td>
                    <td className="py-3 pr-4 text-right mono font-semibold text-foreground">{r.value ?? "—"} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span></td>
                    <td className="py-3 pr-4 text-right text-muted-foreground mono text-xs">
                      {r.referenceMin != null && r.referenceMax != null ? `${r.referenceMin} – ${r.referenceMax}` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-center"><StatusChip status={r.status} /></td>
                    <td className="py-3 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Imaging findings */}
      {findings.length > 0 && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Hallazgos del Estudio</h2>
          {findings.map((f: any) => (
            <div key={f.id} className="p-4 bg-secondary/40 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                {f.bodyPart && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{f.bodyPart}</span>}
                <div className="flex items-center gap-2">
                  <SeverityChip severity={f.severity} />
                  {f.followUpRequired ? (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">Seguimiento requerido</Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3 h-3" />Sin seguimiento</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground">{f.finding}</p>
              {f.notes && <p className="text-xs text-muted-foreground italic">{f.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {labResults.length === 0 && findings.length === 0 && (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No se registraron resultados detallados para este estudio.</p>
        </div>
      )}

      {/* Functional Medicine Analysis Panel */}
      <div className="glass rounded-xl border border-primary/15">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Análisis Dr. FunctionalMD</div>
              <div className="text-xs text-muted-foreground">Medicina funcional state-of-the-art · Rangos óptimos</div>
            </div>
          </div>
          <Button
            data-testid="btn-analyze-study"
            onClick={() => studyAnalysisMutation.mutate()}
            disabled={studyAnalysisMutation.isPending}
            size="sm"
            className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 gap-2"
          >
            {studyAnalysisMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analizando...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" />{functionalAnalysis ? "Re-analizar" : "Analizar con IA"}</>
            )}
          </Button>
        </div>
        {functionalAnalysis && (
          <div className="px-5 pb-5 border-t border-border pt-4">
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2
              prose-h3:text-xs prose-h3:mt-3 prose-h3:mb-1
              prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed prose-p:my-1
              prose-li:text-muted-foreground prose-li:text-xs
              prose-strong:text-foreground prose-strong:font-semibold">
              <ReactMarkdown>{functionalAnalysis}</ReactMarkdown>
            </div>
          </div>
        )}
        {!functionalAnalysis && !studyAnalysisMutation.isPending && (
          <div className="px-5 pb-5 text-center">
            <p className="text-xs text-muted-foreground">Haz clic en "Analizar con IA" para obtener una evaluación funcional profunda de este estudio específico.</p>
          </div>
        )}
        {studyAnalysisMutation.isPending && (
          <div className="px-5 pb-5 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">El Dr. FunctionalMD está analizando este estudio...</span>
          </div>
        )}
      </div>
    </div>
  );
}
