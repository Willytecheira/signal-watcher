import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Database, Save, TestTube, Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

const MetabaseSettings = () => {
  const { token } = useAuth();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testQuestionId, setTestQuestionId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ rows: number; sample: any[] } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchConfig = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/metabase`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setBaseUrl(data.base_url || "");
      setApiToken(data.api_token || "");
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`${API_URL}/api/admin/metabase`, {
      method: "PUT", headers,
      body: JSON.stringify({ base_url: baseUrl.trim(), api_token: apiToken.trim() }),
    });
    setSaving(false);
    if (res.ok) toast.success("Configuración guardada");
    else toast.error("Error al guardar");
  };

  const handleTest = async () => {
    if (!testQuestionId) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/metabase/test`, {
        method: "POST", headers,
        body: JSON.stringify({ question_id: parseInt(testQuestionId) }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(data);
      } else {
        setTestError(data.error || "Error desconocido");
      }
    } catch {
      setTestError("Error de conexión");
    }
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 p-4 md:p-8 max-w-[900px] mx-auto">
        <header className="animate-fade-in-up flex items-center gap-4 mb-8 rounded-xl border border-border/50 p-5" style={{ background: "var(--gradient-header)" }}>
          <Link to="/groups">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="rounded-xl bg-primary/10 p-3">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configuración Metabase
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Conectar API de Metabase para consultar datos de clientes</p>
          </div>
        </header>

        <div className="animate-fade-in-up space-y-6" style={{ animationDelay: "0.1s" }}>
          {/* Connection Settings */}
          <div className="rounded-xl border border-border/50 p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="text-foreground font-semibold">Conexión</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL Base de Metabase</label>
              <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://metabase.ejemplo.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">API Token / Session Token</label>
              <Input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="Token de autenticación..." />
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes configurar esto más tarde cuando tengas las tablas creadas en Metabase.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>

          {/* Test Query */}
          <div className="rounded-xl border border-border/50 p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <TestTube className="h-4 w-4 text-primary" /> Probar Query
            </h3>
            <p className="text-xs text-muted-foreground">
              Ingresa el ID de una pregunta (question) de Metabase para verificar que la conexión funciona.
            </p>
            <div className="flex gap-2">
              <Input type="number" value={testQuestionId} onChange={e => setTestQuestionId(e.target.value)} placeholder="Question ID" className="w-40" />
              <Button variant="outline" onClick={handleTest} disabled={testing || !testQuestionId} className="gap-2">
                <TestTube className="h-4 w-4" /> {testing ? "Probando..." : "Probar"}
              </Button>
            </div>

            {testResult && (
              <div className="rounded-lg bg-background border border-border/30 p-4">
                <div className="flex items-center gap-2 text-sm text-foreground mb-2">
                  <Check className="h-4 w-4 text-success" /> {testResult.rows} filas encontradas
                </div>
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                  {JSON.stringify(testResult.sample, null, 2)}
                </pre>
              </div>
            )}

            {testError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <X className="h-4 w-4" /> {testError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetabaseSettings;
