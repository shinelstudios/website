// src/components/ServiceSubcategoryPage.jsx
import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { findCategory, findItem, findSubcategory } from "../data/servicesConfig";
import { ChevronRight } from "lucide-react";

const WHATSAPP_NUMBER = "918968141585";
const wa = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export default function ServiceSubcategoryPage() {
  const { categoryKey, itemKey, subKey } = useParams();

  const category = findCategory(categoryKey);
  const item = findItem(categoryKey, itemKey);
  const sub = subKey ? findSubcategory(categoryKey, itemKey, subKey) : null;

  const meta = useMemo(() => {
    const title = sub
      ? `${sub.title} — ${item?.title} | Shinel Studios`
      : `${item?.title || "Service"} | Shinel Studios`;

    const brief = sub
      ? `Hi Shinel Studios! I want ${sub.title}.\n\nChannel:\nGoal:\nBudget:\nTimeline:\nReferences:`
      : `Hi Shinel Studios! I want ${item?.title}.\n\nChannel:\nGoal:\nBudget:\nTimeline:\nReferences:`;

    return { title, brief };
  }, [sub, item]);

  if (!category || !item) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10" style={{ color: "var(--text)" }}>
        <h1 className="text-2xl font-extrabold">Service not found</h1>
        <Link to="/work" style={{ color: "var(--orange)" }}>Go back</Link>
      </div>
    );
  }

  const ItemIcon = item.icon;

  // ✅ CASE A: No subKey -> show subcategory list
  if (!subKey) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {/* Breadcrumb */}
          <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            <Link to="/work" style={{ color: "var(--orange)" }}>Work</Link> <span> / </span>
            <Link to={category.categoryPath} style={{ color: "var(--orange)" }}>{category.title}</Link> <span> / </span>
            <span style={{ color: "var(--text)" }}>{item.title}</span>
          </div>

          {/* Header */}
          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
                style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
                aria-hidden
              >
                <ItemIcon size={18} style={{ color: "var(--orange)" }} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--text)" }}>
                  {item.title}
                </h1>
                <p className="mt-1 text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
                  {item.sub}
                </p>
              </div>

              <div className="ml-auto flex gap-2">
                <a
                  href={wa(meta.brief)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl px-4 py-2 text-sm font-bold border"
                  style={{ borderColor: "var(--border)", background: "rgba(232,80,2,0.10)", color: "var(--text)" }}
                >
                  Enquire on WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Subcategories */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(item.subcategories || []).map((sc) => {
              const SubIcon = sc.icon;
              return (
                <Link
                  key={sc.key}
                  to={sc.path} // ✅ /services/:categoryKey/:itemKey/:subKey
                  className="rounded-2xl border p-4 block"
                  style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                        style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
                      >
                        <SubIcon size={18} style={{ color: "var(--orange)" }} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold" style={{ color: "var(--text)" }}>
                          {sc.title}
                        </div>
                        {sc.sub && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {sc.sub}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--orange)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ✅ CASE B: Has subKey -> show detail (requires sub)
  if (!sub) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10" style={{ color: "var(--text)" }}>
        <h1 className="text-2xl font-extrabold">Service not found</h1>
        <Link to="/work" style={{ color: "var(--orange)" }}>Go back</Link>
      </div>
    );
  }

  const SubIcon = sub.icon;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          <Link to="/work" style={{ color: "var(--orange)" }}>Work</Link> <span> / </span>
          <Link to={category.categoryPath} style={{ color: "var(--orange)" }}>{category.title}</Link> <span> / </span>
          <Link to={item.path} style={{ color: "var(--orange)" }}>{item.title}</Link> <span> / </span>
          <span style={{ color: "var(--text)" }}>{sub.title}</span>
        </div>

        {/* Header */}
        <div
          className="rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
              style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
              aria-hidden
            >
              <SubIcon size={18} style={{ color: "var(--orange)" }} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--text)" }}>
                {sub.title}
              </h1>
              {sub.sub && (
                <p className="mt-1 text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
                  {sub.sub}
                </p>
              )}
            </div>

            <div className="ml-auto flex gap-2">
              <a
                href={wa(meta.brief)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-4 py-2 text-sm font-bold border"
                style={{ borderColor: "var(--border)", background: "rgba(232,80,2,0.10)", color: "var(--text)" }}
              >
                Enquire on WhatsApp
              </a>
            </div>
          </div>

          {/* Optional content fields if present */}
          {sub.description && (
            <div className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {sub.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
