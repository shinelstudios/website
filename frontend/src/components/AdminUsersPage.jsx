// src/components/AdminUsersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, ShieldCheck, RefreshCcw, AlertTriangle, Linkedin, Twitter, Globe, Star, Briefcase } from "lucide-react";
import { Input, TextArea, LoadingOverlay } from "./AdminUIComponents";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE;

// ---- tiny JWT decoder (no verification) ----
function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const daysLeftFromExp = (payload) => {
  if (!payload?.exp) return null;
  const ms = payload.exp * 1000 - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

function toast(type, message) {
  window.dispatchEvent(
    new CustomEvent("notify", { detail: { type: type === "error" ? "error" : "success", message: String(message || "") } })
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "client",
    password: "",
    bio: "",
    slug: "",
    linkedin: "",
    twitter: "",
    website: "",
    skills: "",
    experience: "",
  });
  const [editingEmail, setEditingEmail] = useState(null);

  // --- token state that updates when auth changes ---
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const rawRole = (payload?.role || localStorage.getItem("role") || "").toLowerCase();
  const userRoles = useMemo(() => rawRole.split(",").map(r => r.trim()).filter(Boolean), [rawRole]);
  const role = useMemo(() => userRoles[0] || "client", [userRoles]);
  const isAdmin = userRoles.includes("admin");
  const daysLeft = daysLeftFromExp(payload);

  // --- derived banner conditions ---
  const showExpiringBanner = isAdmin && Number.isFinite(daysLeft) && daysLeft <= 14;

  // --- recompute headers whenever token changes ---
  const authHeaders = useMemo(() => ({ authorization: `Bearer ${token}` }), [token]);

  const abortRef = useRef(null);

  async function loadUsers({ warm = false } = {}) {
    setErr("");
    // Warm cache
    if (warm) {
      try {
        const cached = sessionStorage.getItem("adminUsersCache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setUsers(parsed);
        }
      } catch { }
    }

    // Cancel ongoing request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    try {
      const res = await fetch(`${AUTH_BASE}/admin/users`, {
        headers: authHeaders,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load users");
      const list = data.users || [];
      setUsers(list);
      sessionStorage.setItem("adminUsersCache", JSON.stringify(list));
    } catch (e) {
      if (e.name !== "AbortError") {
        setErr(e.message || "Error");
        toast("error", e.message || "Failed to load users");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const url = editingEmail
        ? `${AUTH_BASE}/admin/users/${encodeURIComponent(editingEmail)}`
        : `${AUTH_BASE}/admin/users`;

      const method = editingEmail ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${editingEmail ? 'update' : 'create'} user`);

      setForm({
        firstName: "", lastName: "", email: "", role: "client", password: "",
        bio: "", slug: "", linkedin: "", twitter: "", website: "", skills: "", experience: ""
      });
      setEditingEmail(null);
      await loadUsers();
      toast("success", `User ${editingEmail ? 'updated' : 'created'} successfully`);
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(email) {
    if (!confirm(`Delete ${email}?`)) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${AUTH_BASE}/admin/users/${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      await loadUsers();
      toast("success", "User deleted successfully");
    } catch (e) {
      setErr(e.message || "Error");
      toast("error", e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshNow() {
    try {
      const refresh = localStorage.getItem("refresh") || "";
      if (!refresh) return alert("No refresh token available");

      const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
        method: "POST",
        headers: { authorization: `Bearer ${refresh}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Refresh failed");

      // update storage
      localStorage.setItem("token", data.token);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      if (data.role) localStorage.setItem("role", data.role);
      setToken(data.token);

      window.dispatchEvent(new Event("auth:changed"));
      alert("Session refreshed ✅");
    } catch (e) {
      alert(e.message || "Refresh failed");
    }
  }

  useEffect(() => {
    // initial warm paint
    loadUsers({ warm: true });

    // when token changes externally
    const onAuthChanged = () => {
      setToken(localStorage.getItem("token") || "");
      loadUsers();
    };
    window.addEventListener("auth:changed", onAuthChanged);

    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="min-h-screen" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
            Admin · Users
          </h1>
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <ShieldCheck size={16} />
            <span>Role: {role || "unknown"}</span>
            {Number.isFinite(daysLeft) && (
              <span aria-label="days left">
                • Session: {role === "admin" ? `${daysLeft} days (auto-refresh on)` : `${daysLeft} days`}
              </span>
            )}
            <button
              onClick={refreshNow}
              className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Refresh session now"
            >
              <RefreshCcw size={14} /> Refresh session
            </button>
          </div>
        </div>

        {showExpiringBanner && (
          <div
            className="mb-5 rounded-xl p-4 flex items-start gap-3"
            style={{
              background: "rgba(232,80,2,.1)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <AlertTriangle size={18} style={{ color: "var(--orange)" }} />
            <div className="text-sm">
              <b>Heads up:</b> your admin session expires in <b>{daysLeft} days</b>. Auto-refresh is enabled, but if your
              browser is closed for very long periods, you can tap <i>Refresh session</i> above to roll it forward.
            </div>
          </div>
        )}

        {err && (
          <div
            className="mb-4 rounded-lg p-3 text-sm"
            style={{ background: "var(--surface-alt)", color: "var(--text)" }}
          >
            {err}
          </div>
        )}

        {/* Create user */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-4 border mb-6"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {editingEmail ? "Edit user" : "Create user"}
            </div>
            {editingEmail && (
              <button
                type="button"
                onClick={() => {
                  setEditingEmail(null);
                  setForm({
                    firstName: "", lastName: "", email: "", role: "client", password: "",
                    bio: "", slug: "", linkedin: "", twitter: "", website: "", skills: "", experience: ""
                  });
                }}
                className="text-xs text-[var(--orange)] font-bold hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-1">
              <Input
                label="First name"
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
              />
            </div>
            <div className="md:col-span-1">
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
              />
            </div>
            <div className="md:col-span-1">
              <Input
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                type="email"
                disabled={!!editingEmail}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2">
                Roles (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {["admin", "editor", "artist", "client"].map((r) => {
                  const active = form.role.split(",").includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        const roles = form.role.split(",").filter(Boolean);
                        const next = roles.includes(r)
                          ? roles.filter((x) => x !== r)
                          : [...roles, r];
                        setForm({ ...form, role: next.join(",") || "client" });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${active
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                        }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-1">
              <Input
                label="Password"
                placeholder={editingEmail ? "Leave blank to keep" : "Enter password"}
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                type="password"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Custom Slug (Staff Page)"
                value={form.slug}
                onChange={v => setForm({ ...form, slug: v })}
                placeholder="e.g. jhon-doe"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Skills (Comma separated)"
                value={form.skills}
                onChange={v => setForm({ ...form, skills: v })}
                placeholder="e.g. Editing, Color Grading, VFX"
              />
            </div>

            {/* Socials Group */}
            <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/5 pt-3 mt-1">
              <Input
                label="LinkedIn URL"
                value={form.linkedin}
                onChange={v => setForm({ ...form, linkedin: v })}
                placeholder="https://linkedin.com/in/..."
              />
              <Input
                label="X (Twitter) URL"
                value={form.twitter}
                onChange={v => setForm({ ...form, twitter: v })}
                placeholder="https://x.com/..."
              />
              <Input
                label="Personal Website"
                value={form.website}
                onChange={v => setForm({ ...form, website: v })}
                placeholder="https://yourpage.com"
              />
            </div>

            <div className="md:col-span-3">
              <TextArea
                label="Bio / Tagline"
                value={form.bio}
                onChange={v => setForm({ ...form, bio: v })}
                placeholder="Tell clients about your expertise..."
                rows={4}
              />
            </div>

            <div className="md:col-span-2">
              <TextArea
                label="Experience Highlights"
                value={form.experience}
                onChange={v => setForm({ ...form, experience: v })}
                placeholder="Software, notable projects, years..."
                rows={4}
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            >
              {editingEmail ? <ShieldCheck size={16} /> : <Plus size={16} />}
              {editingEmail ? "Update User" : "Create User"}
            </button>
          </div>
        </form>

        {/* Users table */}
        <div
          className="rounded-2xl border overflow-x-auto"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead style={{ color: "var(--text-muted)" }}>
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text)" }}>
              {users.map((u) => (
                <tr key={u.email} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-3">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.role.split(",").map(r => (
                        <span key={r} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-gray-400">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEmail(u.email);
                          setForm({
                            firstName: u.firstName || "",
                            lastName: u.lastName || "",
                            email: u.email || "",
                            role: u.role || "client",
                            password: "",
                            bio: u.bio || "",
                            slug: u.slug || "",
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        title="Edit user"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(u.email)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border text-red-500/70 hover:text-red-500"
                        style={{ borderColor: "var(--border)" }}
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td className="p-3 text-center text-sm text-[var(--text-muted)]" colSpan={4}>
                    {busy ? "Loading users…" : "No users yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

