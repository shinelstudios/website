// src/components/AdminUsersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, ShieldCheck, RefreshCcw, AlertTriangle } from "lucide-react";

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
  });

  // --- token state that updates when auth changes ---
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const role = (payload?.role || localStorage.getItem("role") || "").toLowerCase();
  const daysLeft = daysLeftFromExp(payload);

  // --- derived banner conditions ---
  const showExpiringBanner = role === "admin" && Number.isFinite(daysLeft) && daysLeft <= 14;

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
      } catch {}
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
      if (e.name !== "AbortError") setErr(e.message || "Error");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${AUTH_BASE}/admin/users`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create user");
      setForm({ firstName: "", lastName: "", email: "", role: "client", password: "" });
      await loadUsers();
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
    } catch (e) {
      setErr(e.message || "Error");
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
          onSubmit={createUser}
          className="rounded-2xl p-4 border mb-6"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
        >
          <div className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Create user
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <Input label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Select
              label="Role"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v })}
              options={[
                { value: "admin", label: "Admin" },
                { value: "editor", label: "Editor" },
                { value: "client", label: "Client" },
              ]}
            />
            <Input
              label="Password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              type="password"
            />
          </div>
          <div className="mt-3">
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            >
              <Plus size={16} /> Create
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
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">
                    <button
                      onClick={() => deleteUser(u.email)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      title="Delete user"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
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

// ---- UI helpers ----
function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[42px] rounded-lg px-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
        required={label !== "Last name"}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[42px] rounded-lg px-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
