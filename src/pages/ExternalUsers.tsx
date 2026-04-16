import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, RefreshCw, Search, Shield, User, Settings, Plus, Trash2, TestTube, Check, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface ExternalUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  _source?: string;
}

interface Source {
  id: string;
  name: string;
  function_url: string;
  anon_key: string;
  auth_token: string;
  active: number;
}

export default function ExternalUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Sources config
  const [sources, setSources] = useState<Source[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [editSource, setEditSource] = useState<Partial<Source> | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; count?: number; error?: string }>>({});

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/external-users`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err: any) {
      toast.error(err.message || "Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/external-users/sources`, { headers });
      const data = await res.json();
      if (res.ok) setSources(data.sources);
    } catch {}
  };

  useEffect(() => {
    fetchUsers();
    fetchSources();
  }, [token]);

  const saveSource = async () => {
    if (!editSource) return;
    try {
      const isNew = !editSource.id;
      const url = isNew
        ? `${API_URL}/api/admin/external-users/sources`
        : `${API_URL}/api/admin/external-users/sources/${editSource.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers,
        body: JSON.stringify(editSource),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isNew ? "Fuente creada" : "Fuente actualizada");
      setEditSource(null);
      fetchSources();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("¿Eliminar esta fuente?")) return;
    try {
      await fetch(`${API_URL}/api/admin/external-users/sources/${id}`, { method: "DELETE", headers });
      toast.success("Fuente eliminada");
      fetchSources();
    } catch {}
  };

  const testSource = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/external-users/sources/${id}/test`, { method: "POST", headers });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [id]: data }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, error: "Network error" } }));
    }
  };

  const roles = useMemo(() => Array.from(new Set(users.map((u) => u.role))).sort(), [users]);
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.full_name || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);
  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    users.forEach((u) => (c[u.role] = (c[u.role] || 0) + 1));
    return c;
  }, [users]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Usuarios del Sistema
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Usuarios registrados en el sistema externo · {users.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <NavLink to="/">
              <Button variant="outline" size="sm">← Dashboard</Button>
            </NavLink>
            <Button variant="outline" size="sm" onClick={() => { setConfigOpen(true); fetchSources(); }}>
              <Settings className="h-4 w-4 mr-1" /> Configuración
            </Button>
            <Button size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Role summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          {roles.map((role) => (
            <Card key={role} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{roleCounts[role]}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{r} ({roleCounts[r]})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{filtered.length} usuario{filtered.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando usuarios...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron usuarios</TableCell></TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium flex items-center gap-2">
                        {u.role === "admin" ? <Shield className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                        {u.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">{u.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u._source || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString("es-ES")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Fuentes de Usuarios
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button size="sm" onClick={() => setEditSource({ name: "", function_url: "", anon_key: "", auth_token: "" })}>
              <Plus className="h-4 w-4 mr-1" /> Nueva fuente
            </Button>

            {/* Edit form */}
            {editSource && (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label>Nombre</Label>
                    <Input value={editSource.name || ""} onChange={(e) => setEditSource({ ...editSource, name: e.target.value })} placeholder="Mi Supabase" />
                  </div>
                  <div className="space-y-1">
                    <Label>Function URL</Label>
                    <Input value={editSource.function_url || ""} onChange={(e) => setEditSource({ ...editSource, function_url: e.target.value })} placeholder="https://xxx.supabase.co/functions/v1/manage-users" />
                  </div>
                  <div className="space-y-1">
                    <Label>Anon Key (apikey)</Label>
                    <Input value={editSource.anon_key || ""} onChange={(e) => setEditSource({ ...editSource, anon_key: e.target.value })} placeholder="eyJhbGci..." />
                  </div>
                  <div className="space-y-1">
                    <Label>Auth Token (opcional — Bearer token fijo)</Label>
                    <Input value={editSource.auth_token || ""} onChange={(e) => setEditSource({ ...editSource, auth_token: e.target.value })} placeholder="Dejar vacío para usar el token de sesión" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveSource}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditSource(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sources list */}
            {sources.map((s) => (
              <Card key={s.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{s.name}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => testSource(s.id)} title="Probar conexión">
                        <TestTube className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSource({ ...s })} title="Editar">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSource(s.id)} title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{s.function_url}</p>
                  <p className="text-xs text-muted-foreground mt-1">Key: {s.anon_key} · Token: {s.auth_token || "sesión"}</p>
                  {testResults[s.id] && (
                    <div className={`mt-2 text-xs flex items-center gap-1 ${testResults[s.id].ok ? "text-primary" : "text-destructive"}`}>
                      {testResults[s.id].ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {testResults[s.id].ok ? `Conectado — ${testResults[s.id].count} usuarios` : testResults[s.id].error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
