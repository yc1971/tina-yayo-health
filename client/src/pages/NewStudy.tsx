import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, X, FlaskConical, Scan, RadioTower, FileText, ChevronLeft, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

type LabRow = { markerName: string; value: string; unit: string; referenceMin: string; referenceMax: string; status: string; notes: string };
type FindingRow = { bodyPart: string; finding: string; severity: string; followUpRequired: boolean; notes: string };

const defaultLabRow = (): LabRow => ({ markerName: "", value: "", unit: "", referenceMin: "", referenceMax: "", status: "normal", notes: "" });
const defaultFindingRow = (): FindingRow => ({ bodyPart: "", finding: "", severity: "normal", followUpRequired: false, notes: "" });

export default function NewStudy() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", category: "lab", studyDate: new Date().toISOString().split("T")[0],
    facility: "", doctor: "", notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [labRows, setLabRows] = useState<LabRow[]>([defaultLabRow()]);
  const [findingRows, setFindingRows] = useState<FindingRow[]>([defaultFindingRow()]);

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);

      const res = await fetch("/api/studies", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al crear estudio");
      const study = await res.json();

      // Save lab results
      if (form.category === "lab") {
        for (const row of labRows) {
          if (!row.markerName.trim()) continue;
          const payload: any = {
            studyId: study.id,
            markerName: row.markerName,
            value: row.value ? parseFloat(row.value) : null,
            unit: row.unit || null,
            referenceMin: row.referenceMin ? parseFloat(row.referenceMin) : null,
            referenceMax: row.referenceMax ? parseFloat(row.referenceMax) : null,
            status: row.status || "normal",
            notes: row.notes || null,
          };
          await fetch(`/api/studies/${study.id}/lab-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }

      // Save imaging findings
      if (form.category !== "lab") {
        for (const row of findingRows) {
          if (!row.finding.trim()) continue;
          const payload: any = {
            studyId: study.id,
            bodyPart: row.bodyPart || null,
            finding: row.finding,
            severity: row.severity || "normal",
            followUpRequired: row.followUpRequired ? 1 : 0,
            notes: row.notes || null,
          };
          await fetch(`/api/studies/${study.id}/findings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }

      return study;
    },
    onSuccess: (study) => {
      qc.invalidateQueries({ queryKey: ["/api/studies"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Estudio guardado", description: `"${form.title}" agregado exitosamente.` });
      setLocation(`/studies/${study.id}`);
    },
    onError: () => toast({ title: "Error", description: "No se pudo guardar el estudio.", variant: "destructive" }),
  });

  const updateLabRow = (i: number, field: keyof LabRow, val: string) => {
    setLabRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const updateFindingRow = (i: number, field: keyof FindingRow, val: any) => {
    setFindingRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/studies">
          <div className="w-8 h-8 rounded-lg border border-border hover:bg-secondary cursor-pointer flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Nuevo Estudio</h1>
          <p className="text-sm text-muted-foreground">Registra laboratorios, scans, radiografías u otros estudios</p>
        </div>
      </div>

      {/* Form card */}
      <div className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">Información General</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Título / Nombre del Estudio *</Label>
            <Input data-testid="input-title" placeholder="ej. Panel Metabólico Completo" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Estudio *</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger data-testid="select-category" className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab"><div className="flex items-center gap-2"><FlaskConical className="w-4 h-4" />Laboratorio de Sangre</div></SelectItem>
                <SelectItem value="scan"><div className="flex items-center gap-2"><Scan className="w-4 h-4" />Imagen (MRI / CT / Eco)</div></SelectItem>
                <SelectItem value="xray"><div className="flex items-center gap-2"><RadioTower className="w-4 h-4" />Radiografía</div></SelectItem>
                <SelectItem value="other"><div className="flex items-center gap-2"><FileText className="w-4 h-4" />Otro</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha del Estudio *</Label>
            <Input data-testid="input-date" type="date" value={form.studyDate} onChange={e => setForm(f => ({ ...f, studyDate: e.target.value }))} className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label>Instalación / Clínica</Label>
            <Input data-testid="input-facility" placeholder="ej. Hospital San Jorge" value={form.facility} onChange={e => setForm(f => ({ ...f, facility: e.target.value }))} className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label>Médico / Doctor</Label>
            <Input data-testid="input-doctor" placeholder="ej. García Pérez" value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} className="bg-secondary border-border" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Notas Generales</Label>
            <Textarea data-testid="input-notes" placeholder="Observaciones, síntomas, contexto..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border resize-none" rows={3} />
          </div>
        </div>
      </div>

      {/* File upload */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">Archivo del Estudio (opcional)</h2>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <FileText className="w-8 h-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button
            data-testid="btn-upload"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">Subir PDF o imagen</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — máx 20MB</div>
            </div>
          </button>
        )}
      </div>

      {/* Lab results */}
      {form.category === "lab" && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">Resultados de Laboratorio</h2>
          <div className="space-y-3">
            {labRows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-secondary/40 rounded-lg">
                <div className="col-span-3 space-y-1">
                  {i === 0 && <Label className="text-xs">Marcador</Label>}
                  <Input data-testid={`lab-marker-${i}`} placeholder="ej. Glucosa" value={row.markerName} onChange={e => updateLabRow(i, "markerName", e.target.value)} className="bg-background border-border text-sm h-8" />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs">Valor</Label>}
                  <Input data-testid={`lab-value-${i}`} type="number" placeholder="95" value={row.value} onChange={e => updateLabRow(i, "value", e.target.value)} className="bg-background border-border text-sm h-8" />
                </div>
                <div className="col-span-1 space-y-1">
                  {i === 0 && <Label className="text-xs">Unidad</Label>}
                  <Input data-testid={`lab-unit-${i}`} placeholder="mg/dL" value={row.unit} onChange={e => updateLabRow(i, "unit", e.target.value)} className="bg-background border-border text-sm h-8" />
                </div>
                <div className="col-span-1 space-y-1">
                  {i === 0 && <Label className="text-xs">Ref Min</Label>}
                  <Input type="number" placeholder="70" value={row.referenceMin} onChange={e => updateLabRow(i, "referenceMin", e.target.value)} className="bg-background border-border text-sm h-8" />
                </div>
                <div className="col-span-1 space-y-1">
                  {i === 0 && <Label className="text-xs">Ref Max</Label>}
                  <Input type="number" placeholder="100" value={row.referenceMax} onChange={e => updateLabRow(i, "referenceMax", e.target.value)} className="bg-background border-border text-sm h-8" />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs">Estado</Label>}
                  <Select value={row.status} onValueChange={v => updateLabRow(i, "status", v)}>
                    <SelectTrigger className="bg-background border-border text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="low">Bajo</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-end gap-1">
                  {i === 0 && <div className="w-full space-y-1"><Label className="text-xs">Notas</Label><Input placeholder="Opcional" value={row.notes} onChange={e => updateLabRow(i, "notes", e.target.value)} className="bg-background border-border text-sm h-8" /></div>}
                  {i > 0 && <Input placeholder="Notas..." value={row.notes} onChange={e => updateLabRow(i, "notes", e.target.value)} className="bg-background border-border text-sm h-8 flex-1" />}
                  {i > 0 && (
                    <button onClick={() => setLabRows(rows => rows.filter((_, idx) => idx !== i))} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            data-testid="btn-add-marker"
            onClick={() => setLabRows(rows => [...rows, defaultLabRow()])}
            className="flex items-center gap-2 text-primary text-sm hover:underline"
          >
            <PlusCircle className="w-4 h-4" />
            Agregar marcador
          </button>
        </div>
      )}

      {/* Imaging findings */}
      {form.category !== "lab" && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">Hallazgos / Findings</h2>
          <div className="space-y-3">
            {findingRows.map((row, i) => (
              <div key={i} className="p-4 bg-secondary/40 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Área del Cuerpo</Label>
                    <Input placeholder="ej. Columna lumbar" value={row.bodyPart} onChange={e => updateFindingRow(i, "bodyPart", e.target.value)} className="bg-background border-border text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Severidad</Label>
                    <Select value={row.severity} onValueChange={v => updateFindingRow(i, "severity", v)}>
                      <SelectTrigger className="bg-background border-border text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="mild">Leve</SelectItem>
                        <SelectItem value="moderate">Moderado</SelectItem>
                        <SelectItem value="severe">Severo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hallazgo *</Label>
                  <Textarea placeholder="Describe el hallazgo o resultado del estudio..." value={row.finding} onChange={e => updateFindingRow(i, "finding", e.target.value)} className="bg-background border-border text-sm resize-none" rows={2} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={row.followUpRequired} onChange={e => updateFindingRow(i, "followUpRequired", e.target.checked)} className="rounded" />
                    Requiere seguimiento
                  </label>
                  {i > 0 && (
                    <button onClick={() => setFindingRows(rows => rows.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 text-xs">
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setFindingRows(rows => [...rows, defaultFindingRow()])}
            className="flex items-center gap-2 text-primary text-sm hover:underline"
          >
            <PlusCircle className="w-4 h-4" />
            Agregar hallazgo
          </button>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 justify-end pb-8">
        <Link href="/studies">
          <Button variant="outline" className="border-border">Cancelar</Button>
        </Link>
        <Button
          data-testid="btn-submit"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.title || !form.studyDate}
          className="bg-primary text-primary-foreground hover:opacity-90"
        >
          {mutation.isPending ? "Guardando..." : "Guardar Estudio"}
        </Button>
      </div>
    </div>
  );
}
