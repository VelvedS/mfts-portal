import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TaskBoard from "@/pages/task-board";
import Timeline from "@/pages/timeline";
import LoginPage from "@/pages/login";
import AppLayout from "@/components/app-layout";
import { Loader2 } from "lucide-react";

function PortalRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tasks" component={TaskBoard} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/admin" component={AdminLogin} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

/** Admin login page — shown inside the layout at /#/admin */
function AdminLogin() {
  const { isAuthenticated, signOut } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">Signed In</h2>
        <p className="text-sm text-muted-foreground">You're signed in as an Agency 6 team member. You can now edit tasks, dates, and project details from any page.</p>
        <button
          onClick={signOut}
          className="text-sm text-primary hover:underline"
          data-testid="button-admin-signout"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <LoginPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <Router hook={useHashLocation}>
            <PortalRoutes />
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
