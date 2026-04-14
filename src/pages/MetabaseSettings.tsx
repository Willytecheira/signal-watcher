import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Database, Save, TestTube, Check, X, Plus, Trash2, Pencil, Link2 } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface MetabaseConnection {
  id: string;
  name: string;
  base_url: string;
  api_token?: string;
  created_at: string;
  updated_at: string;
}

const MetabaseSettings = () => {
  const { token } = useAuth();
  const [connections, setConnections] = useState<MetabaseConnection[]>([]);
  const [editing, setEditing] = useState<MetabaseConnection | null>(null);
  const [creating, setCreating] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formToken, setFormToken] = useState("");
  const [saving, setSaving] = useState(false);

  // Test
  const [testConnId, setTestConnId] = useState<string | null>(null);
  const [testQuestionId, setTestQuestionId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ rows: number; sample: any[] } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchConnections = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/metabase/connections`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setConnections(await res.json());
  }, [token]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const resetForm = () => {
    setFormName(""); setFormUrl(""); setFormToken("");
    setEditing(null); setCreating(false);
  };

  const openCreate = () => {
    resetForm();
    setCreating(true);
  };

  const openEdit = (c: MetabaseConnection) => {
    setFormName(c.name);
    setFormUrl(c.base_url);
    setFormToken("");
    setEditing(c);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) { toast.error("Nombre y URL son requeridos"); return; }
    setSaving(true);

    if (editing) {
      const body: any = { name: formName.trim(), base_url: formUrl.trim() };
      if (formToken.trim()) body.api_token = formToken.trim();
      else {
        // Keep existing token — need to fetch it
        const existing = await fetch(`${API_URL}/api/admin/metabase/connections`, { headers: { Authorization: `Bearer ${token}` } });
        if (existing.ok) {
          const all = await existing.json();
          const found = all.find((c: any) => c.id === editing.id);
          body.api_token = found?.api_token || "";
        }
      }
      const res = await fetch(`${API_URL}/api/admin/metabase/connections/${editing.id}`, {
        method: "PUT", headers, body: JSON.stringify(body),
      });
      setSaving(false);
      if (res.ok) { toast.success("Conexión actualizada"); resetForm(); fetchConnections(); }
      else toast.error("Error al actualizar");
    } else {
      if (!formToken.trim()) { toast.error("Token es requerido para nueva conexión"); setSaving(false); return; }
      const res = await fetch(`${API_URL}/api/admin/metabase/connections`, {
        method: "POST", headers,
        body: JSON.stringify({ name: formName.trim(), base_url: formUrl.trim(), api_token: formToken.trim() }),
      });
      setSaving(false);
      if (res.ok) { toast.success("Conexión creada"); resetForm(); fetchConnections(); }
      else toast.error("Error al crear");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar conexión "${name}"? Los queries asociados perderán su referencia.`)) return;
    await fetch(`${API_URL}/api/admin/metabase/connections/${id}`, { method: "DELETE", headers });
    toast.success(`Conexión "${name}" eliminada`);
    fetchConnections();
  };

  const handleTest = async () => {
    if (!testConnId || !testQuestionId) return;
    setTesting(true); setTestResult(null); setTestError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/metabase/connections/${testConnId}/test`, {
        method: "POST", headers,
        body: JSON.stringify({ question_id: parseInt(testQuestionId) }),
      });
      const data = await res.json();
      if (res.ok) setTestResult(data);
      else setTestError(data.error || "Error desconocido");
    } catch {
      setTestError("Error de conexión");
    }
    setTesting(false);
  };

  const isFormOpen = creating || editing;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 p-4 md:p-8 max-w-[1000px] mx-auto">
        <header className="animate-fade-in-up flex items-center justify-between gap-4 mb-8 rounded-xl border border-border/50 p-5" style={{ background: "var(--gradient-header)" }}>
          <div className="flex items-center gap-4">
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
                Conexiones Metabase
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Gestiona múltiples fuentes de datos de Metabase</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Conexión
          </Button>
        </header>

        <div className="animate-fade-in-up space-y-6" style={{ animationDelay: "0.1s" }}>
          {/* Create/Edit Form */}
          {isFormOpen && (
            <div className="rounded-xl border border-border/50 p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold">{editing ? "Editar Conexión" : "Nueva Conexión"}</h3>
                <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7"><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Producción, Staging, etc." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">URL Base de Metabase</label>
                  <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://metabase.ejemplo.com" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  API Token / Session Token {editing && <span className="text-muted-foreground/60">(dejar vacío para mantener el actual)</span>}
                </label>
                <Input type="password" value={formToken} onChange={e => setFormToken(e.target.value)} placeholder="Token de autenticación..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}

          {/* Connections List */}
          <div className="space-y-3">
            {connections.length === 0 && !isFormOpen && (
              <div className="text-center py-12 text-muted-foreground rounded-xl border border-border/50" style={{ background: "hsl(var(--card))" }}>
                <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay conexiones configuradas</p>
                <Button onClick={openCreate} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" /> Crear primera conexión</Button>
              </div>
            )}
            {connections.map(c => (
              <div key={c.id} className="rounded-xl border border-border/50 p-4 glass glass-hover">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Link2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">{c.name}</span>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.base_url}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setTestConnId(c.id); setTestResult(null); setTestError(null); }} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <TestTube className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Test Query Panel */}
          {testConnId && (
            <div className="rounded-xl border border-border/50 p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-primary" /> Probar Query
                  <Badge variant="outline" className="text-xs">{connections.find(c => c.id === testConnId)?.name}</Badge>
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { setTestConnId(null); setTestResult(null); setTestError(null); }} className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </div>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default MetabaseSettings;
