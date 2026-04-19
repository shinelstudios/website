/**
 * ContactPage — /contact
 *
 * Dedicated contact page (sitemap listed /contact but no route existed
 * before this file — typed or crawled URLs 404'd). Uses the design-system
 * editorial treatment.
 *
 * Three ways to reach Shinel:
 *   1. WhatsApp \u2014 instant reply during IST business hours
 *   2. Email \u2014 same-day response, for longer briefs / RFPs
 *   3. Inquiry form \u2014 routes to /leads endpoint, lands in admin queue
 *
 * The inquiry form reuses the existing worker POST /leads endpoint
 * (honeypot-protected, rate-limited 10/hr/IP). No new backend work.
 */
import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  Calendar,
  ArrowUpRight,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Shield,
  Award,
} from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import { AUTH_BASE, CONTACT } from "../config/constants";
import {
  Section,
  Kicker,
  Eyebrow,
  Display,
  Lede,
  HairlineCard,
  RevealOnScroll,
  GrainOverlay,
} from "../design";

const INTEREST_OPTIONS = [
  "Video editing (long-form)",
  "Shorts / Reels",
  "Thumbnails",
  "Branding",
  "Graphic design (logos, posters)",
  "Channel strategy / SEO",
  "Not sure yet",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    interests: [],
    website: "", // honeypot — bots fill this; humans leave empty
  });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const update = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);

  const toggleInterest = useCallback((value) => {
    setForm((f) => {
      const has = f.interests.includes(value);
      return {
        ...f,
        interests: has
          ? f.interests.filter((v) => v !== value)
          : [...f.interests, value],
      };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setStatus("loading");
      setErrorMsg("");
      try {
        const res = await fetch(`${AUTH_BASE}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            interests: form.interests,
            quizData: form.message ? { message: form.message } : null,
            website: form.website, // honeypot
            source: "contact-page",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Submission failed");
        setStatus("success");
        setForm({ name: "", email: "", message: "", interests: [], website: "" });
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Something went wrong. Please try WhatsApp instead.");
      }
    },
    [form]
  );

  const wa = `${CONTACT.whatsappUrl}?text=${encodeURIComponent(
    CONTACT.whatsappDefaultMessage || "Hi Shinel Studios — I'd like to start a project."
  )}`;
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    "Project inquiry — Shinel Studios"
  )}`;

  return (
    <main className="min-h-svh bg-[var(--surface)] relative">
      <MetaTags
        title="Contact — Shinel Studios | Start a Project"
        description="Reach Shinel Studios via WhatsApp, email, or the inquiry form. Replies inside 24 hours IST, no sales calls required."
        url="https://www.shinelstudios.in/contact"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />

      <GrainOverlay />

      {/* Hero */}
      <Section size="lg" className="pt-24 md:pt-32">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 md:gap-16 items-end">
          <div>
            <RevealOnScroll>
              <Kicker className="mb-6">Contact</Kicker>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h1" size="xl" className="mb-6">
                Let's start <span style={{ color: "var(--orange)" }}>something.</span>
              </Display>
            </RevealOnScroll>
            <RevealOnScroll delay="160ms">
              <Lede>
                Pick the channel that fits \u2014 WhatsApp for quick replies, email
                for longer briefs, or the form below for a scoped inquiry. Every
                message is read by a human and answered inside 24 hours IST. No
                sales calls, no drip sequences.
              </Lede>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay="240ms">
            <HairlineCard className="p-6 md:p-7">
              <Eyebrow className="mb-4">What to expect</Eyebrow>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <Clock size={16} style={{ color: "var(--orange)" }} />
                  <span>Reply within 24 h IST</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Shield size={16} style={{ color: "var(--orange)" }} />
                  <span>Scoped quote before any payment</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Award size={16} style={{ color: "var(--orange)" }} />
                  <span>Named editor / artist on every project</span>
                </li>
              </ul>
            </HairlineCard>
          </RevealOnScroll>
        </div>
      </Section>

      {/* Channel cards */}
      <Section size="md" hairlineTop>
        <div className="mb-8">
          <Eyebrow className="mb-3">Direct channels</Eyebrow>
          <Display size="md">Talk to us however you prefer.</Display>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <RevealOnScroll>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="block h-full"
            >
              <HairlineCard interactive className="p-6 h-full">
                <div
                  className="w-11 h-11 rounded-xl hairline grid place-items-center mb-5"
                  style={{ background: "var(--orange-soft)" }}
                >
                  <MessageCircle size={18} style={{ color: "var(--orange)" }} />
                </div>
                <Display size="sm" className="mb-2">WhatsApp</Display>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Fastest route. Usually a real human replies within an hour during IST business times.
                </p>
                <div className="flex items-center gap-2 text-kicker" style={{ color: "var(--orange)" }}>
                  {CONTACT.phoneFormatted} <ArrowUpRight size={14} />
                </div>
              </HairlineCard>
            </a>
          </RevealOnScroll>

          <RevealOnScroll delay="80ms">
            <a href={mailto} className="block h-full">
              <HairlineCard interactive className="p-6 h-full">
                <div
                  className="w-11 h-11 rounded-xl hairline grid place-items-center mb-5"
                  style={{ background: "var(--orange-soft)" }}
                >
                  <Mail size={18} style={{ color: "var(--orange)" }} />
                </div>
                <Display size="sm" className="mb-2">Email</Display>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Best for detailed briefs, RFPs, and attached references. Same-day reply on business days.
                </p>
                <div className="flex items-center gap-2 text-kicker truncate" style={{ color: "var(--orange)" }}>
                  {CONTACT.email} <ArrowUpRight size={14} />
                </div>
              </HairlineCard>
            </a>
          </RevealOnScroll>

          <RevealOnScroll delay="160ms">
            <a
              href="#inquiry-form"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="block h-full"
            >
              <HairlineCard interactive className="p-6 h-full">
                <div
                  className="w-11 h-11 rounded-xl hairline grid place-items-center mb-5"
                  style={{ background: "var(--orange-soft)" }}
                >
                  <Calendar size={18} style={{ color: "var(--orange)" }} />
                </div>
                <Display size="sm" className="mb-2">Inquiry form</Display>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Async-friendly. Drop your scope, we'll come back with a timeline + named team.
                </p>
                <div className="flex items-center gap-2 text-kicker" style={{ color: "var(--orange)" }}>
                  Jump to form <ArrowUpRight size={14} />
                </div>
              </HairlineCard>
            </a>
          </RevealOnScroll>
        </div>
      </Section>

      {/* Inquiry form */}
      <Section size="lg" tone="alt" hairlineTop id="inquiry-form">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-start">
          <div>
            <Eyebrow className="mb-3">Inquiry form</Eyebrow>
            <Display size="md" className="mb-4">
              Tell us <span style={{ color: "var(--orange)" }}>the shape</span> of your project.
            </Display>
            <Lede>
              The more you share up-front, the tighter our first reply. If you're unsure, just pick "Not sure yet" and drop a line \u2014 we'll guide.
            </Lede>
          </div>

          <form onSubmit={handleSubmit}>
            <HairlineCard tone="surface" className="p-6 md:p-8">
              <div className="grid gap-5">
                <Field
                  label="Your name"
                  required
                  value={form.name}
                  onChange={(v) => update({ name: v })}
                  autoComplete="name"
                  maxLength={120}
                />
                <Field
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(v) => update({ email: v })}
                  autoComplete="email"
                  maxLength={254}
                />

                <div>
                  <span className="text-eyebrow block mb-2.5">What are you thinking about?</span>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((opt) => {
                      const active = form.interests.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleInterest(opt)}
                          className="text-sm px-3 py-1.5 rounded-full hairline transition-colors"
                          style={{
                            background: active ? "var(--orange)" : "transparent",
                            color: active ? "#fff" : "var(--text)",
                            borderColor: active ? "var(--orange)" : "var(--hairline)",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field
                  label="Anything else? (optional)"
                  multiline
                  rows={4}
                  value={form.message}
                  onChange={(v) => update({ message: v })}
                  maxLength={2000}
                  placeholder="Links to references, channel URL, desired turnaround, budget range\u2026"
                />

                {/* Honeypot \u2014 hidden from humans, filled by bots */}
                <label className="hidden" aria-hidden="true">
                  Website (leave empty):
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => update({ website: e.target.value })}
                  />
                </label>

                {status === "success" && (
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      color: "#059669",
                    }}
                  >
                    <Check size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium mb-1">Got it \u2014 we'll reply within 24 h IST.</div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Check your email (and spam, just in case).
                      </div>
                    </div>
                  </div>
                )}

                {status === "error" && (
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{
                      background: "rgba(220,38,38,0.08)",
                      border: "1px solid rgba(220,38,38,0.25)",
                      color: "#DC2626",
                    }}
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium mb-1">Couldn't send.</div>
                      <div className="text-sm">{errorMsg}</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p className="text-meta" style={{ color: "var(--text-muted)" }}>
                    By submitting, you agree to our <Link to="/privacy" style={{ color: "var(--orange)" }}>privacy policy</Link>.
                  </p>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-editorial disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Sending
                      </>
                    ) : (
                      <>
                        Send inquiry <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </HairlineCard>
          </form>
        </div>
      </Section>
    </main>
  );
}

function Field({ label, value, onChange, multiline, rows = 2, className = "", required, ...rest }) {
  const Tag = multiline ? "textarea" : "input";
  const id = label?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label className={`block ${className}`}>
      <span className="text-eyebrow block mb-1.5">
        {label}
        {required && <span style={{ color: "var(--orange)" }}>*</span>}
      </span>
      <Tag
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? rows : undefined}
        required={required}
        className="w-full px-3.5 py-2.5 rounded-xl hairline bg-transparent text-[var(--text)] focus:outline-none focus:border-[var(--orange)] transition-colors"
        style={{ fontFamily: "inherit", fontSize: 15 }}
        {...rest}
      />
    </label>
  );
}
