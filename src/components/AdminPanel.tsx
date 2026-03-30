import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, X, Shield, Users } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export const AdminPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  }, [token]);

  useEffect(() => {
    if (open) fetchUsers();
  }, [open, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setCreating(true);
    const res = await fetch(`${API_URL}/api/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(`Usuario "${data.username}" creado`);
    setUsername("");
    setPassword("");
    fetchUsers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar usuario "${name}"?`)) return;
    await fetch(`${API_URL}/api/admin/users/${id}`, { method: "DELETE", headers });
    toast.success(`Usuario "${name}" eliminado`);
    fetchUsers();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border/50 p-6 space-y-5" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Users className="h-5 w-5 text-primary" />
            Gestión de Usuarios
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Create user form */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1" required />
          <Input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1" required />
          <Button type="submit" size="icon" disabled={creating} className="shrink-0">
            <UserPlus className="h-4 w-4" />
          </Button>
        </form>

        {/* User list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
              <div className="flex items-center gap-2">
                {u.role === "admin" && <Shield className="h-3.5 w-3.5 text-warning" />}
                <span className="text-sm text-foreground font-mono">{u.username}</span>
                <span className="text-xs text-muted-foreground">({u.role})</span>
              </div>
              {u.username !== "admin" && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id, u.username)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
