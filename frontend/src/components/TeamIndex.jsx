/**
 * TeamIndex — public directory of Shinel team members.
 * Route: /team
 *
 * Each card links to the member's own public microsite at /team/:slug
 * (which reuses PortfolioPage under the hood — see App.jsx route).
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import MetaTags from "./MetaTags";
import {
  Section,
  Kicker,
  Eyebrow,
  Display,
  Lede,
  RevealOnScroll,
  HairlineCard,
  Img,
} from "../design";

function avatarFallback(firstName, lastName) {
  const f = (firstName || "").charAt(0).toUpperCase();
  const l = (lastName || "").charAt(0).toUpperCase();
  return `${f}${l}` || "··";
}

function roleLabel(role) {
  const r = String(role || "").toLowerCase().split(",")[0].trim();
  const map = {
    admin: "Founder",
    team: "Team",
    editor: "Video Editor",
    artist: "GFX Artist",
  };
  return map[r] || "Team";
}

export default function TeamIndex() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/team`);
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) throw new Error(data.error || "Failed to load team");
        setTeam(Array.isArray(data.team) ? data.team : []);
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load team");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="min-h-svh bg-[var(--surface)] relative">
      <MetaTags
        title="The Makers — Shinel Studios"
        description="Meet the editors and graphic artists behind Shinel Studios. Every creator has their own portfolio — hire them by name."
        url="https://www.shinelstudios.in/team"
      />

      {/* Hero */}
      <Section size="lg" className="pt-24 md:pt-32">
        <div className="max-w-3xl">
          <RevealOnScroll>
            <Kicker className="mb-6">The Makers</Kicker>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h1" size="xl" className="mb-6">
              The humans behind the craft.
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede>
              Every edit, thumbnail, and graphic on this site was made by a specific person.
              Hire the full studio — or work directly with the maker whose style fits yours.
            </Lede>
          </RevealOnScroll>
        </div>
      </Section>

      {/* Grid */}
      <Section size="lg" hairlineTop>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-card p-6 animate-pulse" style={{ minHeight: 280 }} />
            ))}
          </div>
        ) : err ? (
          <div className="surface-card p-8 text-center">
            <p style={{ color: "var(--text-muted)" }}>{err}</p>
          </div>
        ) : team.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <Sparkles className="mx-auto mb-4" style={{ color: "var(--orange)" }} size={24} />
            <Display size="sm" className="mb-2">No profiles yet</Display>
            <p style={{ color: "var(--text-muted)" }}>
              The team is setting up their personal pages. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((m, idx) => {
              const slug = m.slug || m.email?.split("@")[0] || "";
              const fullName = `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email || "Team member";
              const initials = avatarFallback(m.firstName, m.lastName);
              const skillsArr = String(m.skills || "")
                .split(/[,|]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 3);
              return (
                <RevealOnScroll key={slug || m.email || idx} delay={`${(idx % 6) * 60}ms`}>
                  <HairlineCard
                    as={Link}
                    to={`/team/${slug}`}
                    interactive
                    className="block p-6 group relative overflow-hidden"
                  >
                    {/* Breathing orange hairline — signature animation for /team */}
                    <span
                      aria-hidden="true"
                      className="breathe-hairline absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        border: "1.5px solid var(--orange)",
                        opacity: 0.35,
                      }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                          {m.avatarUrl ? (
                            <Img
                              src={m.avatarUrl}
                              alt={fullName}
                              width={56}
                              height={56}
                              aspect="1/1"
                              className="rounded-full object-cover hairline"
                              style={{ width: 56, height: 56, objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="rounded-full hairline grid place-items-center text-kicker"
                              style={{
                                width: 56,
                                height: 56,
                                background: "var(--orange-soft)",
                                color: "var(--orange)",
                                fontSize: 14,
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="text-eyebrow mb-1">{roleLabel(m.role)}</div>
                            <div className="text-display-sm">{fullName}</div>
                          </div>
                        </div>
                        <ArrowUpRight
                          size={18}
                          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          style={{ color: "var(--text-muted)" }}
                        />
                      </div>

                      {m.headline && (
                        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text)" }}>
                          {m.headline}
                        </p>
                      )}

                      {skillsArr.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skillsArr.map((s) => (
                            <span
                              key={s}
                              className="text-meta px-2.5 py-1 rounded-full hairline"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </HairlineCard>
                </RevealOnScroll>
              );
            })}
          </div>
        )}
      </Section>

      {/* Hire CTA band */}
      <Section size="md" tone="alt" hairlineTop>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Eyebrow className="mb-3">Can't decide who?</Eyebrow>
            <Display size="md" className="mb-3">Tell us your project — we'll route it.</Display>
            <p style={{ color: "var(--text-muted)", maxWidth: 520 }}>
              Share a few details and we'll match you with the maker whose style
              fits your project best. No sales calls, just a quick reply.
            </p>
          </div>
          <Link to="/contact" className="btn-editorial shrink-0">
            Start a project <ArrowUpRight size={16} />
          </Link>
        </div>
      </Section>
    </main>
  );
}
