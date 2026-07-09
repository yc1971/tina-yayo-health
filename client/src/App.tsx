import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import Dashboard from "@/pages/Dashboard";
import Studies from "@/pages/Studies";
import StudyDetail from "@/pages/StudyDetail";
import NewStudy from "@/pages/NewStudy";
import Alerts from "@/pages/Alerts";
import Analytics from "@/pages/Analytics";
import Expert from "@/pages/Expert";
import PinLock from "@/pages/PinLock";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import { PatientProvider } from "@/context/PatientContext";

function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/studies" component={Studies} />
        <Route path="/studies/new" component={NewStudy} />
        <Route path="/studies/:id" component={StudyDetail} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/expert" component={Expert} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PatientProvider>
        <Router hook={useHashLocation}>
          <AppRoutes />
        </Router>
        <Toaster />
      </PatientProvider>
    </QueryClientProvider>
  );
}
