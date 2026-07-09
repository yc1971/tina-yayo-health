import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, FlaskConical, Bell, BarChart3, 
  Plus, Heart, Activity, Shield, Stethoscope, User
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { usePatient, Patient } from "@/context/PatientContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studies", label: "Estudios", icon: FlaskConical },
  { href: "/analytics", label: "Análisis", icon: BarChart3 },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/expert", label: "Dr. FunctionalMD", icon: Stethoscope },
];

const PATIENTS: { id: Patient; label: string; sub: string; color: string; activeColor: string }[] = [
  {
    id: "yayo",
    label: "Yayo",
    sub: "54 años · Masculino",
    color: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    activeColor: "border-blue-500 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-500/20",
  },
  {
    id: "tina",
    label: "Tina",
    sub: "53 años · Femenino",
    color: "border-pink-500/30 bg-pink-500/5 text-pink-400",
    activeColor: "border-pink-500 bg-pink-500/15 text-pink-300 shadow-sm shadow-pink-500/20",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { patient, setPatient, isYayo } = usePatient();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
    refetchInterval: 30000,
  });

  // Count studies per patient
  const yayoStudies = stats?.labResults
    ? stats.totalStudies - (stats.labResults.filter((r: any) => r.studyId >= 15).length > 0 ? 13 : 0)
    : null;

  // Derive per-patient alert count from all studies
  const unresolvedAlerts = stats?.unresolvedAlerts ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-sm">TINA & YAYO</div>
              <div className="text-xs text-muted-foreground">Health Dashboard</div>
            </div>
          </div>
        </div>

        {/* Patient Selector */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Paciente activo
          </p>
          <div className="space-y-1.5">
            {PATIENTS.map((p) => {
              const isActive = patient === p.id;
              return (
                <button
                  key={p.id}
                  data-testid={`patient-selector-${p.id}`}
                  onClick={() => setPatient(p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive ? p.activeColor : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? p.id === "yayo" ? "bg-blue-500/20" : "bg-pink-500/20"
                      : "bg-secondary"
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold leading-none ${isActive ? "" : "text-muted-foreground"}`}>
                      {p.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">{p.sub}</div>
                  </div>
                  {isActive && (
                    <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      p.id === "yayo" ? "bg-blue-400" : "bg-pink-400"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">
              {stats?.totalStudies ?? 0} estudios · {unresolvedAlerts} alertas
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href;
            const isAlerts = href === "/alerts";
            return (
              <Link key={href} href={href}>
                <div
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                    isActive
                      ? isYayo
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isAlerts && unresolvedAlerts > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                    >
                      {unresolvedAlerts}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick add */}
        <div className="p-4 border-t border-border">
          <Link href="/studies/new">
            <div
              data-testid="btn-new-study"
              className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-opacity justify-center text-white ${
                isYayo ? "bg-blue-600 hover:bg-blue-500" : "bg-pink-600 hover:bg-pink-500"
              }`}
            >
              <Plus className="w-4 h-4" />
              Nuevo Estudio
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>100% privado · local</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
