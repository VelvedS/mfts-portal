import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  KanbanSquare, 
  CalendarDays,
  Users,
  FolderOpen,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, lazy, Suspense } from "react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useAuth } from "@/lib/auth-context";

const AIChat = lazy(() => import("@/components/ai-chat"));

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: KanbanSquare },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/team", label: "Team", icon: Users },
  { href: "/files", label: "Files", icon: FolderOpen },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [chatOpen, setChatOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">MFTS Portal</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Agency 6</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkContent;
          })}

          {/* AI Chat toggle — only show for authenticated team/admin */}
          {isAuthenticated && (() => {
            const chatButton = (
              <button
                onClick={() => setChatOpen(!chatOpen)}
                data-testid="button-ai-chat"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                  chatOpen
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                {!collapsed && <span>AI Assistant</span>}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{chatButton}</TooltipTrigger>
                  <TooltipContent side="right">AI Assistant</TooltipContent>
                </Tooltip>
              );
            }
            return chatButton;
          })()}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
          {/* User info — show for authenticated team/admin */}
          {isAuthenticated && user && !collapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                {user.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-sidebar-foreground"
            onClick={() => setDark(!dark)}
            data-testid="button-theme"
          >
            {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span className="text-sm">{dark ? "Light Mode" : "Dark Mode"}</span>}
          </Button>

          {isAuthenticated ? (
            /* Authenticated team/admin: show Sign Out */
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-muted-foreground hover:text-sidebar-foreground"
              onClick={signOut}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-sm">Sign Out</span>}
            </Button>
          ) : (
            /* Guest/client view: show Team Login link */
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-sidebar-foreground"
                data-testid="button-team-login"
              >
                <Shield className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-sm">Team Login</span>}
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="button-collapse"
          >
            {collapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronLeft className="w-4 h-4 shrink-0" />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </Button>
          {!collapsed && <PerplexityAttribution />}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* AI Chat panel — only for authenticated users */}
      {chatOpen && isAuthenticated && (
        <div className="w-[360px] shrink-0">
          <Suspense fallback={
            <div className="h-full border-l border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          }>
            <AIChat onClose={() => setChatOpen(false)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
