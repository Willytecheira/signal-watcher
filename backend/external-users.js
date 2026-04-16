/**
 * Proxy to fetch users from the external Supabase manage-users Edge Function.
 * Exposes: GET /api/admin/external-users
 */

const SUPABASE_FUNCTION_URL =
  process.env.SUPABASE_MANAGE_USERS_URL ||
  "https://tnjcigqqmwahnxcsljgk.supabase.co/functions/v1/manage-users";

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuamNpZ3FxbXdhaG54Y3NsamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk2NjQsImV4cCI6MjA4NjkyNTY2NH0.Q7R51xWL23UZegJyaZVUJibNQ1FeMcYHMtmoY1rNBIk";

async function handleExternalUsersRoutes(req, res, json, requireAdmin) {
  if (req.url === "/api/admin/external-users" && req.method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });

    try {
      const authHeader = req.headers.authorization || "";
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: "list-emails" }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return json(res, 502, { error: data.error || "Failed to fetch external users" });
      }

      return json(res, 200, { users: data.users || [] });
    } catch (err) {
      console.error("External users fetch error:", err.message);
      return json(res, 502, { error: "Could not reach external user service" });
    }
  }

  return false;
}

module.exports = { handleExternalUsersRoutes };
