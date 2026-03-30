import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Radio, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await login(username, password);
    setLoading(false);
    if (err) setError(err);
    else navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-accent/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="rounded-xl bg-primary/10 p-3">
            <Radio className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Signal Monitor
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border/50 p-6 space-y-4"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Usuario
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="h-4 w-4 mr-2" />
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
