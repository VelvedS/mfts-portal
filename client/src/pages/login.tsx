import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, LogIn, Loader2 } from "lucide-react";

/** Admin/team login — shown at /#/admin */
export default function LoginPage() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-sm mx-auto py-16 px-4 space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">Team Login</h1>
          <p className="text-sm text-muted-foreground">Agency 6 team members only</p>
        </div>
      </div>

      <Card className="border border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-center">Sign in to edit</CardTitle>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables to enable team login.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@agency-6.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        This login is for Agency 6 team members to manage project tasks and timelines.
      </p>
    </div>
  );
}
