/**
 * OurCreatorsPage — public "/creators" grid page.
 *
 * The "show work" pillar: visitors land here, see every client we've
 * worked with (active + paused + inactive, except 'old' archives), click
 * a card to drill into that creator's `/c/<slug>` showcase.
 *
 * Pulls from /admin/agency/public/clients (60s edge cache). No auth.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Sparkles, Users2, ArrowRight, Youtube, Instagram } from "lucide-react";
import { AUTH_BASE } from "../config/constants";

function fmtCount(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function gradientFor(name) {
  const seed = [...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed * 137 % 360;
  return `linear-gradient(135deg, hsl(${hue} 75% 55%) 0%, hsl(${(hue + 50) % 360} 70% 45%) 100%)`;
}

export default function OurCreatorsPage() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${AUTH_BASE}/admin/agency/public/clients`)
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((j) => setList(j.clients || []))
      .catch((e) => setErr(String(e)));
  }, []);

  const totalReach = (list || []).reduce((s, c) => s + (c.reach || 0), 0);

  return (
    <>
      <Helmet>
        <title>Our Creators · Shinel Studios</title>
        <meta name="description" content="Every creator Shinel Studios has shipped work for — gaming, music, vlogs, and more. Browse the full roster, see the reach, click into the showcase." />
        <link rel="canonical" href="https://shinelstudios.in/creators" />
      </Helmet>

      <main className="min-h-screen bg-[var(--surface)] pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <header className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[var(--orange)] font-bold mb-3">
              <Sparkles size={12} /> Our Roster
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
              Creators we've shipped work for
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              {list ? (
                <>
                  <strong>{list.length} creators</strong> · combined reach of <strong>{fmtCount(totalReach)}</strong>. Click any card to see the full body of work.
                </>
              ) : "Pulling the roster…"}
            </p>
          </header>

          {/* Grid */}
          {err ? (
            <p className="text-center text-sm text-red-500">Couldn't load creators: {err}</p>
          ) : list === null ? (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="rounded-xl bg-[var(--surface-alt)] aspect-[4/5] animate-pulse" />
              ))}
            </ul>
          ) : list.length === 0 ? (
            <p className="text-center text-neutral-500">No public creators yet. Check back soon.</p>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/c/${c.slug}`}
                    className="group block rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-alt)] hover:border-[var(--orange)] hover:-translate-y-0.5 transition shadow-sm hover:shadow-lg"
                  >
                    {/* Banner / avatar */}
                    <div
                      className="aspect-[4/3] relative"
                      style={c.banner_url
                        ? { backgroundImage: `url(${c.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: gradientFor(c.name) }}
                    >
                      {c.avatar_url && (
                        <img
                          src={c.avatar_url}
                          alt=""
                          loading="lazy"
                          className="absolute bottom-2 left-2 w-12 h-12 rounded-full ring-2 ring-white object-cover"
                        />
                      )}
                      {c.status !== "active" && (
                        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-black/60 text-white">
                          {c.status === "paused" ? "Paused" : "Past Work"}
                        </span>
                      )}
                    </div>
                    {/* Body */}
                    <div className="p-3">
                      <div className="font-semibold text-sm truncate">{c.name}</div>
                      {c.tagline && <p className="text-xs text-neutral-500 truncate mt-0.5">{c.tagline}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                        {c.yt_handle && (
                          <span className="flex items-center gap-1">
                            <Youtube size={11} className="text-red-500" /> {fmtCount(c.yt_subscribers)}
                          </span>
                        )}
                        {c.ig_handle && (
                          <span className="flex items-center gap-1">
                            <Instagram size={11} className="text-pink-500" /> {fmtCount(c.ig_followers)}
                          </span>
                        )}
                        {!c.yt_handle && !c.ig_handle && (
                          <span>—</span>
                        )}
                        <span className="ml-auto flex items-center gap-0.5 text-[var(--orange)] opacity-0 group-hover:opacity-100 transition">
                          <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* CTA */}
          <section className="mt-16 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 bg-[var(--surface-alt)]">
            <Users2 size={28} className="text-[var(--orange)] mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">Want to be on this page?</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              We're picky about who we take on — but if your content is good and you're serious about scaling, let's talk.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-md bg-[var(--orange)] text-white hover:opacity-90"
            >
              Pitch your channel <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
