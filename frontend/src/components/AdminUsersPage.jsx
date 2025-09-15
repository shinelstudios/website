// src/components/AdminUsersPage.jsx
import React from "react";

export default function AdminUsersPage() {
  const [form, setForm] = React.useState({
    firstName: "", lastName: "", email: "", password: "", role: "client",
  });
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMsg(`✅ Added ${data.email}`);
      setForm({ firstName: "", lastName: "", email: "", password: "", role: "client" });
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally { setBusy(false); }
  };

  return (
    <section className="py-10" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
          Admin · Add User
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Create users without redeploying. Stored in KV.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {[
            ["firstName","First name"], ["lastName","Last name"], ["email","Email"], ["password","Password"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>{label}</label>
              <input
                type={k === "password" ? "password" : k === "email" ? "email" : "text"}
                className="w-full h-[44px] rounded-lg px-3"
                style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form[k]} onChange={(e) => onChange(k, e.target.value)}
                required={k !== "lastName"}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>Role</label>
            <select
              className="w-full h-[44px] rounded-lg px-3"
              style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
              value={form.role} onChange={(e) => onChange("role", e.target.value)}
            >
              <option value="client">Client</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit" disabled={busy}
            className="w-full rounded-xl py-3 font-semibold text-white"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            {busy ? "Adding…" : "Add user"}
          </button>

          {!!msg && <div className="text-sm" style={{ color: msg.startsWith("✅") ? "var(--success, #21c670)" : "var(--danger, #e64a2e)" }}>{msg}</div>}
        </form>
      </div>
    </section>
  );
}
