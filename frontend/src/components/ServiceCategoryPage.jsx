// src/pages/ServiceCategoryPage.jsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import { services, findCategory } from "../data/servicesConfig";
import { ChevronRight } from "lucide-react";

export default function ServiceCategoryPage() {
  const { categoryKey } = useParams();
  const category = findCategory(categoryKey);

  if (!category) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10" style={{ color: "var(--text)" }}>
        <h1 className="text-2xl font-extrabold">Category not found</h1>
        <Link to="/work" style={{ color: "var(--orange)" }}>Go back</Link>
      </div>
    );
  }

  const Icon = category.icon;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start gap-3">
          <div
            className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
            style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
          >
            <Icon size={18} style={{ color: "var(--orange)" }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--text)" }}>
              {category.title}
            </h1>
            <p className="mt-1 text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
              {category.tagline}
            </p>
            <div className="mt-3">
              <Link to="/work" style={{ color: "var(--orange)" }}>← Back to Work</Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {category.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.path}
                className="rounded-2xl border p-4 block"
                style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                      style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
                    >
                      <ItemIcon size={18} style={{ color: "var(--orange)" }} />
                    </div>
                    <div>
                      <div className="font-extrabold" style={{ color: "var(--text)" }}>{item.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</div>
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
