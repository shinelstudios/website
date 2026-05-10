/**
 * FinancePanel — embedded inside OpsCockpit. Pulls /admin/agency/finance/summary.
 *
 * Shows:
 *  - This-month totals: freelance paid, salary commitment, total outflow, pending
 *  - Per-client cost breakdown (this month)
 *  - Per-editor payouts (this month)
 *  - Outstanding payments (completed/posted but not yet 'paid')
 *  - Salary editors with their monthly figure
 */
import React, { useEffect, useState, useCallback } from "react";
import { IndianRupee, RefreshCw, AlertCircle, Users, Briefcase } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

function authedFetch(path, opts = {}) {
  const token = getAccessToken();
  return fetch(`${AUTH_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    credentials: "include",
  });
}

export default function FinancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`/admin/agency/finance/summary`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <section className="rounded-xl border border-red-500/30 bg-red-500/5 text-red-500 p-4 text-sm flex items-center gap-2">
        <AlertCircle size={14} /> Finance load failed: {error}
      </section>
    );
  }
  if (!data) {
    return (
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-4 text-xs text-neutral-500">
        Loading finance…
      </section>
    );
  }

  const { totals = {}, by_client = [], by_editor = [], salary_editors = [], pending_payments = [], month, paid_this_month_count } = data;

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-5">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <IndianRupee size={15} className="text-emerald-500" />
          Finance · {month}
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 disabled:opacity-50 inline-flex items-center gap-1"
          title="Refresh finance"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Freelance paid (this month)" value={fmtINR(totals.freelance_paid_this_month)} sub={`${paid_this_month_count} payments`} accent="text-emerald-600" />
        <Stat label="Salary commitment" value={fmtINR(totals.salary_monthly)} sub={`${salary_editors.length} salaried`} accent="text-blue-600" />
        <Stat label="Total outflow (month)" value={fmtINR(totals.total_outflow_this_month)} accent="text-[var(--orange)]" />
        <Stat label="Pending freelance" value={fmtINR(totals.freelance_pending)} sub={`${pending_payments.length} pending`} accent="text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Per client */}
        <div className="rounded-lg border border-neutral-100 dark:border-neutral-900 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-neutral-600">
            <Users size={12} /> Per client (this month)
          </div>
          {by_client.length === 0 ? (
            <p className="text-[11px] text-neutral-500">No payments this month yet.</p>
          ) : (
            <div className="space-y-1">
              {by_client.map((c) => (
                <div key={c.client_id} className="flex items-center justify-between text-xs bg-[var(--surface)] rounded px-2 py-1.5 border border-neutral-100 dark:border-neutral-900">
                  <div className="min-w-0 truncate">{c.client_name}</div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-[10px] text-neutral-500">{c.count}×</span>
                    <span className="font-semibold text-emerald-600">{fmtINR(c.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per editor */}
        <div className="rounded-lg border border-neutral-100 dark:border-neutral-900 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-neutral-600">
            <Briefcase size={12} /> Per editor (this month)
          </div>
          {by_editor.length === 0 ? (
            <p className="text-[11px] text-neutral-500">No editor payouts this month yet.</p>
          ) : (
            <div className="space-y-1">
              {by_editor.map((e) => (
                <div key={e.editor_id} className="flex items-center justify-between text-xs bg-[var(--surface)] rounded px-2 py-1.5 border border-neutral-100 dark:border-neutral-900">
                  <div className="min-w-0 truncate">{e.editor_name}</div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-[10px] text-neutral-500">{e.count}×</span>
                    <span className="font-semibold text-emerald-600">{fmtINR(e.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Salary editors strip */}
      {salary_editors.length > 0 && (
        <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Salaried editors (monthly)</div>
          <div className="flex flex-wrap gap-2">
            {salary_editors.map((e) => (
              <div key={e.id} className="text-xs bg-[var(--surface)] rounded px-2 py-1 border border-blue-500/20">
                <span className="font-semibold">{e.name}</span> · <span className="text-blue-600">{fmtINR(e.monthly_salary_inr)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending payouts */}
      {pending_payments.length > 0 && (
        <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-yellow-700 mb-2">
            Pending freelance payouts ({pending_payments.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {pending_payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs bg-[var(--surface)] rounded px-2 py-1.5 border border-yellow-500/20">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.title}</div>
                  <div className="text-[10px] text-neutral-500">
                    {p.client_name || "—"} · {p.editor_name || "—"} · {p.status}
                  </div>
                </div>
                <span className="font-semibold text-yellow-700 whitespace-nowrap ml-2">{fmtINR(p.editor_payment_inr)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-neutral-500 mt-2">Move a project to <strong>paid</strong> on the kanban once you've paid the editor — it'll move out of this list.</div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--surface)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent || ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}
