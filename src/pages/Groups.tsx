import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, X, Check, ArrowLeft, Users, Send,
  Filter, Globe, FileJson, Copy, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface SignalFilter {
  filter_type: string;
  filter_value: string;
}

interface MetabaseQuery {
  id?: string;
  question_id: number;
  label: string;
}

interface ClientGroup {
  id: string;
  name: string;
  description: string | null;
  endpoint_url: string | null;
  group_type: "clients" | "broadcast";
  active: boolean;
  filters: SignalFilter[];
  metabase_queries: MetabaseQuery[];
  created_at: string;
}

interface NotificationLog {
  id: number;
  group_id: string;
  group_name: string;
  signal_id: string;
  signal_symbol: string;
  client_id: string;
  client_name: string;
  status: string;
  http_status: number | null;
  error_message: string | null;
  created_at: string;
}

const Groups = () => {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const [examplePayload, setExamplePayload] = useState<object | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ symbols: string[]; event_types: string[]; event_names: string[]; actions: string[] }>({ symbols: [], event_types: [], event_names: [], actions: ["BUY", "SELL", "NEUTRAL"] });

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formType, setFormType] = useState<"clients" | "broadcast">("clients");
  const [formFilters, setFormFilters] = useState<SignalFilter[]>([]);
  const [formQueries, setFormQueries] = useState<MetabaseQuery[]>([]);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchGroups = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/groups`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setGroups(await res.json());
  }, [token]);

  const fetchLogs = useCallback(async (page = 1) => {
    const res = await fetch(`${API_URL}/api/admin/notifications/logs?page=${page}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.data);
      setLogsTotal(data.total);
    }
  }, [token]);

  const fetchExamplePayload = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/notifications/example-payload`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setExamplePayload(await res.json());
  }, [token]);

  const fetchFilterOptions = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/signals/filter-options`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setFilterOptions(await res.json());
  }, [token]);

  useEffect(() => {
    fetchGroups();
    fetchLogs();
    fetchExamplePayload();
    fetchFilterOptions();
  }, [fetchGroups, fetchLogs, fetchExamplePayload, fetchFilterOptions]);

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormEndpoint("");
    setFormType("clients");
    setFormFilters([]);
    setFormQueries([]);
    setEditingGroup(null);
    setCreating(false);
  };

  const openCreate = () => {
    resetForm();
    setCreating(true);
  };

  const openEdit = (g: ClientGroup) => {
    setFormName(g.name);
    setFormDesc(g.description || "");
    setFormEndpoint(g.endpoint_url || "");
    setFormType(g.group_type || "clients");
    setFormFilters(g.filters || []);
    setFormQueries(g.metabase_queries?.map(q => ({ question_id: q.question_id, label: q.label || "" })) || []);
    setEditingGroup(g);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("El nombre es requerido"); return; }
    const body = {
      name: formName.trim(),
      description: formDesc.trim() || null,
      endpoint_url: formEndpoint.trim() || null,
      group_type: formType,
      active: true,
      filters: formFilters,
    };

    if (editingGroup) {
      const res = await fetch(`${API_URL}/api/admin/groups/${editingGroup.id}`, { method: "PUT", headers, body: JSON.stringify(body) });
      if (!res.ok) { toast.error("Error al actualizar grupo"); return; }
      if (formQueries.length > 0) {
        await fetch(`${API_URL}/api/admin/groups/${editingGroup.id}/queries`, {
          method: "PUT", headers, body: JSON.stringify({ queries: formQueries }),
        });
      }
      toast.success("Grupo actualizado");
    } else {
      const res = await fetch(`${API_URL}/api/admin/groups`, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) { toast.error("Error al crear grupo"); return; }
      const created = await res.json();
      if (formQueries.length > 0) {
        await fetch(`${API_URL}/api/admin/groups/${created.id}/queries`, {
          method: "PUT", headers, body: JSON.stringify({ queries: formQueries }),
        });
      }
      toast.success("Grupo creado");
    }
    resetForm();
    fetchGroups();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar grupo "${name}"?`)) return;
    await fetch(`${API_URL}/api/admin/groups/${id}`, { method: "DELETE", headers });
    toast.success(`Grupo "${name}" eliminado`);
    fetchGroups();
  };

  const handleToggleActive = async (g: ClientGroup) => {
    await fetch(`${API_URL}/api/admin/groups/${g.id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ ...g, active: !g.active, filters: g.filters }),
    });
    fetchGroups();
  };

  const addFilter = () => setFormFilters([...formFilters, { filter_type: "symbol", filter_value: "" }]);
  const removeFilter = (idx: number) => setFormFilters(formFilters.filter((_, i) => i !== idx));
  const updateFilter = (idx: number, field: string, value: string) => {
    const updated = [...formFilters];
    (updated[idx] as any)[field] = value;
    setFormFilters(updated);
  };

  const addQuery = () => setFormQueries([...formQueries, { question_id: 0, label: "" }]);
  const removeQuery = (idx: number) => setFormQueries(formQueries.filter((_, i) => i !== idx));

  const isFormOpen = creating || editingGroup;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 p-4 md:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="animate-fade-in-up flex items-center justify-between gap-4 mb-8 rounded-xl border border-border/50 p-5" style={{ background: "var(--gradient-header)" }}>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Grupos de Clientes
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Gestión de grupos, filtros y notificaciones</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo Grupo
          </Button>
        </header>

        <Tabs defaultValue="groups" className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <TabsList className="mb-6">
            <TabsTrigger value="groups" className="gap-2"><Users className="h-4 w-4" /> Grupos</TabsTrigger>
            <TabsTrigger value="logs" className="gap-2"><Send className="h-4 w-4" /> Logs de Notificaciones</TabsTrigger>
            <TabsTrigger value="payload" className="gap-2"><FileJson className="h-4 w-4" /> Ejemplo Payload</TabsTrigger>
          </TabsList>

          {/* Groups Tab */}
          <TabsContent value="groups">
            {isFormOpen && (
              <div className="rounded-xl border border-border/50 p-6 mb-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground font-semibold">{editingGroup ? "Editar Grupo" : "Nuevo Grupo"}</h3>
                  <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7"><X className="h-4 w-4" /></Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                    <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Premium Traders" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo de Grupo</label>
                    <Select value={formType} onValueChange={v => setFormType(v as "clients" | "broadcast")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clients">Clientes (Metabase)</SelectItem>
                        <SelectItem value="broadcast">General (Broadcast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Endpoint URL</label>
                    <Input value={formEndpoint} onChange={e => setFormEndpoint(e.target.value)} placeholder="https://api.example.com/notifications" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
                  <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descripción del grupo..." rows={2} />
                </div>

                {/* Signal Filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Filtros de Señales</label>
                    <Button variant="outline" size="sm" onClick={addFilter} className="h-7 text-xs gap-1"><Plus className="h-3 w-3" /> Filtro</Button>
                  </div>
                  {formFilters.map((f, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <Select value={f.filter_type} onValueChange={v => updateFilter(idx, "filter_type", v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="symbol">Símbolo</SelectItem>
                          <SelectItem value="action">Acción</SelectItem>
                          <SelectItem value="event_type">Tipo Evento</SelectItem>
                          <SelectItem value="event_name">Nombre Evento</SelectItem>
                        </SelectContent>
                      </Select>
                      {f.filter_type === "action" ? (
                        <Select value={f.filter_value} onValueChange={v => updateFilter(idx, "filter_value", v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BUY">BUY</SelectItem>
                            <SelectItem value="SELL">SELL</SelectItem>
                            <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={f.filter_value} onChange={e => updateFilter(idx, "filter_value", e.target.value)} placeholder="Valor..." className="flex-1" />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => removeFilter(idx)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>

                {/* Metabase Queries — only for 'clients' type */}
                {formType === "clients" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Queries de Metabase</label>
                    <Button variant="outline" size="sm" onClick={addQuery} className="h-7 text-xs gap-1"><Plus className="h-3 w-3" /> Query</Button>
                  </div>
                  {formQueries.map((q, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <Input type="number" value={q.question_id || ""} onChange={e => {
                        const updated = [...formQueries];
                        updated[idx] = { ...updated[idx], question_id: parseInt(e.target.value) || 0 };
                        setFormQueries(updated);
                      }} placeholder="Question ID" className="w-32" />
                      <Input value={q.label} onChange={e => {
                        const updated = [...formQueries];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setFormQueries(updated);
                      }} placeholder="Etiqueta (opcional)" className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => removeQuery(idx)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                )}

                {formType === "broadcast" && (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Grupo General (Broadcast):</strong> Las señales filtradas se enviarán al endpoint sin datos de clientes específicos. 
                      El sistema receptor se encargará de distribuir a todos los usuarios.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={handleSave} className="gap-2"><Check className="h-4 w-4" /> Guardar</Button>
                </div>
              </div>
            )}

            {/* Groups List */}
            <div className="space-y-3">
              {groups.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No hay grupos creados</p>
                </div>
              )}
              {groups.map(g => (
                <div key={g.id} className="rounded-xl border border-border/50 p-4 glass glass-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
                      <Switch checked={g.active} onCheckedChange={() => handleToggleActive(g)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-semibold">{g.name}</span>
                          <Badge variant={g.group_type === "broadcast" ? "default" : "outline"} className="text-xs">
                            {g.group_type === "broadcast" ? "General" : "Clientes"}
                          </Badge>
                          {g.filters.length > 0 && <Badge variant="secondary" className="text-xs">{g.filters.length} filtros</Badge>}
                          {g.metabase_queries?.length > 0 && <Badge variant="outline" className="text-xs">{g.metabase_queries.length} queries</Badge>}
                        </div>
                        {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                      </div>
                      {expandedGroup === g.id ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                    </div>
                    <div className="flex gap-1 ml-3">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(g)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id, g.name)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  {expandedGroup === g.id && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                      {g.endpoint_url && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">{g.endpoint_url}</span>
                        </div>
                      )}
                      {g.filters.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground mb-1 block">Filtros:</span>
                          <div className="flex flex-wrap gap-1">
                            {g.filters.map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{f.filter_type}: {f.filter_value}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {g.metabase_queries?.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground mb-1 block">Metabase Queries:</span>
                          <div className="flex flex-wrap gap-1">
                            {g.metabase_queries.map((q, i) => (
                              <Badge key={i} variant="outline" className="text-xs">#{q.question_id} {q.label && `— ${q.label}`}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <div className="rounded-xl border border-border/50 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Fecha</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Grupo</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Señal</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Cliente</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sin registros</td></tr>
                    )}
                    {logs.map(l => (
                      <tr key={l.id} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs">{l.group_name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{l.signal_symbol}</td>
                        <td className="px-4 py-2 text-xs">{l.client_name || "—"}</td>
                        <td className="px-4 py-2">
                          <Badge variant={l.status === "success" ? "default" : "destructive"} className="text-xs">
                            {l.status} {l.http_status && `(${l.http_status})`}
                          </Badge>
                          {l.error_message && <p className="text-xs text-destructive mt-0.5">{l.error_message}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logsTotal > 20 && (
                <div className="flex justify-center gap-2 p-3 border-t border-border/30">
                  <Button variant="outline" size="sm" disabled={logsPage <= 1} onClick={() => { setLogsPage(p => p - 1); fetchLogs(logsPage - 1); }}>Anterior</Button>
                  <span className="text-xs text-muted-foreground self-center">Página {logsPage}</span>
                  <Button variant="outline" size="sm" onClick={() => { setLogsPage(p => p + 1); fetchLogs(logsPage + 1); }}>Siguiente</Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Example Payload Tab */}
          <TabsContent value="payload">
            <div className="rounded-xl border border-border/50 p-6" style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-primary" />
                  Ejemplo de Payload de Notificación
                </h3>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(examplePayload, null, 2));
                  toast.success("Copiado al portapapeles");
                }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Este es el formato JSON que el sistema enviará al endpoint configurado en cada grupo.
                El sistema receptor debe poder aceptar este formato para crear notificaciones.
              </p>
              <pre className="bg-background rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto border border-border/30">
                {examplePayload ? JSON.stringify(examplePayload, null, 2) : "Cargando..."}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Groups;
