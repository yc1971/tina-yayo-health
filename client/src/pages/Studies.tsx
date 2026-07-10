import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { FlaskConical, Scan, RadioTower, FileText, Plus, ChevronRight, Search, Filter } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Study } from "@shared/schema";
import { usePatient } from "@/context/PatientContext";

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  lab: { label: "Laboratorio", icon: FlaskConical, color: "text-blue-400 bg-blue-500/10" },
  scan: { label: "Imagen / Scan", icon: Scan, color: "text-violet-400 bg-violet-500/10" },
  xray: { label: "Radiografía", icon: RadioTower, color: "text-emerald-400 bg-emerald-500/10" },
  other: { label: "Otro", icon: FileText, color: "text-muted-foreground bg-secondary" },
};

const FILTERS = ["all", "lab", "scan", "xray", "other"];

export default function Studies() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { patientLabel, patientAge, isYayo, studyBelongsToPatient } = usePatient();

  const { data: allStudies = [], isLoading } = useQuery<Study[]>({
    queryKey: ["/api/studies"],
    queryFn: () => apiRequest("GET", "/api/studies").then(r => r.json()),
  });

  // Filter by active patient first, then by category/search
  const patientStudies = allStudies.filter(s => studyBelongsToPatient(s.title));

  const filtered = patientStudies.filter(s => {
    const matchCat = filter === "all" || s.category === filter;
    const q = search.toLowerCase();
    // Strip [TINA] prefix for display/search
    const cleanTitle = s.title.replace(/^\[TINA\]\s*/, "");
    const matchSearch = !q || cleanTitle.toLowerCase().includes(q) || (s.facility ?? "").toLowerCase().includes(q) || (s.doctor ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="flex items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1">
            <h1 className="text-lg md:text-xl font-semibold text-foreground">Estudios — {patientLabel}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              isYayo
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-pink-500/10 text-pink-400 border-pink-500/20"
            }`}>{patientAge}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{patientStudies.length} estudios registrados</p>
        </div>
        <Link href="/studies/new">
          <div data-testid="btn-new-study-page" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Nuevo Estudio
          </div>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Buscar estudios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {FILTERS.map(f => (
            <button
              key={f}
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {f === "all" ? "Todos" : categoryConfig[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-xl">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{search ? "No se encontraron estudios" : "No hay estudios registrados aún"}</p>
          {!search && (
            <Link href="/studies/new">
              <span className="text-primary text-sm mt-3 hover:underline cursor-pointer">Agregar primer estudio →</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(study => {
            const cat = categoryConfig[study.category] ?? categoryConfig.other;
            const Icon = cat.icon;
            const displayTitle = study.title.replace(/^\[TINA\]\s*/, "");
            return (
              <Link key={study.id} href={`/studies/${study.id}`}>
                <div
                  data-testid={`study-item-${study.id}`}
                  className="glass rounded-xl p-3.5 md:p-5 flex items-center gap-3 md:gap-5 hover:border-primary/20 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1">
                      <span className="text-sm font-semibold text-foreground">{displayTitle}</span>
                      <Badge variant="outline" className="text-xs">{cat.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span>{new Date(study.studyDate).toLocaleDateString("es-PR", { year: "numeric", month: "long", day: "numeric" })}</span>
                      {study.facility && <><span>·</span><span>{study.facility}</span></>}
                      {study.doctor && <><span>·</span><span>Dr. {study.doctor}</span></>}
                    </div>
                    {study.notes && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">{study.notes}</div>
                    )}
                  </div>
                  {study.fileName && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-32">{study.fileName}</span>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
