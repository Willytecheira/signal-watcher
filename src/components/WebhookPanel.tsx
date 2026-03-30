import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Webhook, Plus, Trash2, X, Pencil, Check, XCircle } from "lucide-react";
import { toast } from "sonner";
import { WebhookLogs } from "./WebhookLogs";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  filter_symbol: string | null;
  filter_action: string | null;
  filter_event_type: string | null;
  active: boolean;
  created_at: string;
}

const emptyForm = { name: "", url: "", secret: "", filter_symbol: "", filter_action: "", filter_event_type: "" };

export const WebhookPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { token } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchWebhooks = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/webhooks`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setWebhooks(await res.json());
  }, [token]);

  useEffect(() => {
    if (open) fetchWebhooks();
  }, [open, fetchWebhooks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    setCreating(true);
    const res = await fetch(`${API_URL}/api/admin/webhooks`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(`Webhook "${data.name}" creado`);
    setForm(emptyForm);
    fetchWebhooks();
  };

  const handleToggle = async (wh: WebhookItem) => {
    await fetch(`${API_URL}/api/admin/webhooks/${wh.id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ ...wh, active: !wh.active }),
    });
    fetchWebhooks();
  };

  const handleEdit = (wh: WebhookItem) => {
    setEditingId(wh.id);
    setEditForm({
      name: wh.name, url: wh.url, secret: wh.secret || "",
      filter_symbol: wh.filter_symbol || "", filter_action: wh.filter_action || "",
      filter_event_type: wh.filter_event_type || "",
    });
  };

  const handleSaveEdit = async (id: string, active: boolean) => {
    const res = await fetch(`${API_URL}/api/admin/webhooks/${id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ ...editForm, active }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    toast.success("Webhook actualizado");
    setEditingId(null);
    fetchWebhooks();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar webhook "${name}"?`)) return;
    await fetch(`${API_URL}/api/admin/webhooks/${id}`, { method: "DELETE", headers });
    toast.success(`Webhook "${name}" eliminado`);
    fetchWebhooks();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border/50 p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Webhook className="h-5 w-5 text-primary" />
            Webhooks
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="logs">Logs de envío</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-5 mt-4">
            {/* Create form */}
            <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-border/30 p-4">
              <p className="text-xs text-muted-foreground font-mono mb-2">Nuevo webhook</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder="URL (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Secret (opcional)" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
                <Input placeholder="Filtro símbolo" value={form.filter_symbol} onChange={(e) => setForm({ ...form, filter_symbol: e.target.value })} />
                <Select value={form.filter_action || "all"} onValueChange={(v) => setForm({ ...form, filter_action: v === "all" ? "" : v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Acción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                    <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Filtro event type" value={form.filter_event_type} onChange={(e) => setForm({ ...form, filter_event_type: e.target.value })} />
              </div>
              <Button type="submit" size="sm" disabled={creating} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Crear
              </Button>
            </form>

            {/* List */}
            <div className="space-y-2">
              {webhooks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 font-mono">No hay webhooks configurados</p>
              )}
              {webhooks.map((wh) => (
                <div key={wh.id} className="rounded-lg border border-border/30 px-4 py-3 space-y-2">
                  {editingId === wh.id ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-xs" />
                        <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input placeholder="Secret" value={editForm.secret} onChange={(e) => setEditForm({ ...editForm, secret: e.target.value })} className="h-8 text-xs" />
                        <Input placeholder="Símbolo" value={editForm.filter_symbol} onChange={(e) => setEditForm({ ...editForm, filter_symbol: e.target.value })} className="h-8 text-xs" />
                        <Select value={editForm.filter_action || "all"} onValueChange={(v) => setEditForm({ ...editForm, filter_action: v === "all" ? "" : v })}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="BUY">BUY</SelectItem>
                            <SelectItem value="SELL">SELL</SelectItem>
                            <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Event type" value={editForm.filter_event_type} onChange={(e) => setEditForm({ ...editForm, filter_event_type: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-green-500 h-7 gap-1" onClick={() => handleSaveEdit(wh.id, wh.active)}>
                          <Check className="h-3.5 w-3.5" /> Guardar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground h-7" onClick={() => setEditingId(null)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground font-semibold">{wh.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${wh.active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {wh.active ? "activo" : "inactivo"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{wh.url}</p>
                        {(wh.filter_symbol || wh.filter_action || wh.filter_event_type) && (
                          <div className="flex gap-2 mt-1">
                            {wh.filter_symbol && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded">símbolo: {wh.filter_symbol}</span>}
                            {wh.filter_action && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded">acción: {wh.filter_action}</span>}
                            {wh.filter_event_type && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded">tipo: {wh.filter_event_type}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Switch checked={wh.active} onCheckedChange={() => handleToggle(wh)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit(wh)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(wh.id, wh.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <WebhookLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
