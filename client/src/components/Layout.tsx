import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, FlaskConical, Bell, BarChart3, 
  Plus, Heart, Activity, Shield, Stethoscope, User,
  Menu, X, ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { usePatient, Patient } from "@/context/PatientContext";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studies", label: "Estudios", icon: FlaskConical },
  { href: "/analytics", label: "Análisis", icon: BarChart3 },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/expert", label: "Dr. FunctionalMD", icon: Stethoscope },
];

const PATIENTS: { id: Patient; label: string; sub: string; color: string; activeColor: string; dot: string }[] = [
  {
    id: "yayo",
    label: "Yayo",
    sub: "54 años · Masculino",
    color: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    activeColor: "border-blue-500 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-500/20",
    dot: "bg-blue-400",
  },
  {
    id: "tina",
    label: "Tina",
    sub: "53 años · Femenino",
    color: "border-pink-500/30 bg-pink-500/5 text-pink-400",
    activeColor: "border-pink-500 bg-pink-500/15 text-pink-300 shadow-sm shadow-pink-500/20",
    dot: "bg-pink-400",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { patient, setPatient, isYayo } = usePatient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Close sidebar on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
    refetchInterval: 30000,
  });

  const unresolvedAlerts = stats?.unresolvedAlerts ?? 0;
  const accentBg = isYayo ? "bg-blue-600 hover:bg-blue-500" : "bg-pink-600 hover:bg-pink-500";
  const accentActive = isYayo
    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    : "bg-pink-500/10 text-pink-400 border border-pink-500/20";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
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
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold leading-none ${isActive ? "" : "text-muted-foreground"}`}>
                    {p.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">{p.sub}</div>
                </div>
                {isActive && (
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} />
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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          const isAlerts = href === "/alerts";
          return (
            <Link key={href} href={href}>
              <div
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  isActive ? accentActive : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isAlerts && unresolvedAlerts > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs flex items-center justify-center">
                    {unresolvedAlerts}
                  </Badge>
                )}
                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
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
            className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-opacity justify-center text-white ${accentBg}`}
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
          <span>100% privado · datos protegidos</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-border flex-col">
        <SidebarContent />
      </aside>

      {/* ── MOBILE: Overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE: Slide-in sidebar drawer ── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-background border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── MOBILE TOP BAR ── */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30 flex-shrink-0">
          <button
            data-testid="btn-menu"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">TINA & YAYO</span>
          </div>

          {/* Patient quick-switch pills */}
          <div className="flex gap-1.5">
            {PATIENTS.map((p) => {
              const isActive = patient === p.id;
              return (
                <button
                  key={p.id}
                  data-testid={`mobile-patient-${p.id}`}
                  onClick={() => setPatient(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isActive ? p.activeColor : "border-border text-muted-foreground bg-transparent"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Alert badge */}
          {unresolvedAlerts > 0 && (
            <Link href="/alerts">
              <div className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              </div>
            </Link>
          )}
        </header>

        {/* ── SCROLLABLE CONTENT ── */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* ── MOBILE BOTTOM NAV BAR ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border">
          <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              const isAlerts = href === "/alerts";
              return (
                <Link key={href} href={href}>
                  <div
                    data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl min-w-[52px] transition-all relative ${
                      isActive
                        ? isYayo ? "text-blue-400" : "text-pink-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className="relative">
                      <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                      {isAlerts && unresolvedAlerts > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    <span className={`text-[9px] font-medium leading-none transition-all ${
                      isActive ? "opacity-100" : "opacity-60"
                    }`}>
                      {label === "Dr. FunctionalMD" ? "Dr. MD" : label}
                    </span>
                    {isActive && (
                      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        isYayo ? "bg-blue-400" : "bg-pink-400"
                      }`} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
}
