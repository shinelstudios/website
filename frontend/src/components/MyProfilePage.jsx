/**
 * MyProfilePage — self-serve profile editor for editors/artists/team.
 * Route: /me (protected)
 *
 * Scope:
 *   - Edit own bio / headline / avatar / showreel / skills / services / socials
 *   - Toggle per-work "visible on my public portfolio" flags
 *   - Preview public profile via /team/:slug?preview=1
 *
 * Never allows editing: email, role, password, slug (admin-only).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  Upload,
} from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { getAuth } from "../utils/auth";
import { authedFetch } from "../utils/tokenStore";
import MetaTags from "./MetaTags";
import {
  Section,
  Kicker,
  Eyebrow,
  Display,
  Lede,
  HairlineCard,
  RevealOnScroll,
  Img,
} from "../design";

const PRESET_SERVICES = [
  "Long-form editing",
  "Short-form editing",
  "YouTube thumbnails",
  "Logos",
  "Posts & banners",
  "Flex & cards",
  "Channel branding",
  "Motion graphics",
  "Color grading",
  "Sound design",
  "SEO & titles",
  "Channel strategy",
];

export default function MyProfilePage() {
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [profile, setProfile] = useState(null);
  const [work, setWork] = useState({ videos: [], thumbnails: [] });

  // --- Load profile + attributed work ---
  useEffect(() => {
    let alive = true;
    const email = (auth.email || "").toLowerCase();
    if (!email) { setLoading(false); return; }

    (async () => {
      try {
        // Resolve self-profile by local-part (server matches slug OR email OR local-part)
        const localPart = email.split("@")[0];
        const [pRes, vRes, tRes] = await Promise.all([
          fetch(`${AUTH_BASE}/profiles/${encodeURIComponent(localPart)}`),
          fetch(`${AUTH_BASE}/videos`),
          fetch(`${AUTH_BASE}/thumbnails`),
        ]);

        let p = null;
        if (pRes.ok) {
          const pData = await pRes.json();
          p = pData?.profile || null;
        }
        // If no profile record yet, seed from JWT claims so the form isn't blank.
        if (!p) {
          p = {
            email,
            slug: "",
            firstName: auth.firstName || "",
            lastName: auth.lastName || "",
            headline: "",
            bio: "",
            avatarUrl: "",
            showreelUrl: "",
            skills: "",
            experience: "",
            services: [],
            calendlyUrl: "",
            whatsappNumber: "",
            highlightVideoId: "",
            profilePublic: true,
            socials: {},
          };
        }

        const vData = vRes.ok ? await vRes.json() : { videos: [] };
        const tData = tRes.ok ? await tRes.json() : { thumbnails: [] };

        const myVids = (vData.videos || []).filter((v) => {
          const attr = String(v.attributedTo || "").toLowerCase();
          return attr === email || (p.slug && attr === p.slug.toLowerCase());
        });
        const myThumbs = (tData.thumbnails || []).filter((t) => {
          const attr = String(t.attributedTo || "").toLowerCase();
          return attr === email || (p.slug && attr === p.slug.toLowerCase());
        });

        if (!alive) return;
        setProfile(p);
        setWork({ videos: myVids, thumbnails: myThumbs });
      } catch (e) {
        if (alive) setSaveMsg({ type: "error", text: e.message || "Failed to load" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [auth.email, auth.firstName, auth.lastName]);

  const publicUrl = useMemo(() => {
    const slug = profile?.slug || (profile?.email ? profile.email.split("@")[0] : "");
    return slug ? `/team/${slug}` : "";
  }, [profile?.slug, profile?.email]);

  // --- Update helpers ---
  const update = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...patch }));
  }, []);

  const updateSocial = useCallback((key, val) => {
    setProfile((p) => ({ ...p, socials: { ...(p.socials || {}), [key]: val } }));
  }, []);

  const toggleService = useCallback((svc) => {
    setProfile((p) => {
      const cur = Array.isArray(p.services) ? p.services : [];
      const next = cur.includes(svc) ? cur.filter((s) => s !== svc) : [...cur, svc];
      return { ...p, services: next };
    });
  }, []);

  // --- Save profile ---
  const persistProfile = useCallback(async (overrides) => {
    const merged = overrides ? { ...profile, ...overrides } : profile;
    const res = await authedFetch(AUTH_BASE, `/profiles/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: merged.firstName,
        lastName: merged.lastName,
        headline: merged.headline,
        bio: merged.bio,
        avatarUrl: merged.avatarUrl,
        showreelUrl: merged.showreelUrl,
        skills: merged.skills,
        experience: merged.experience,
        services: merged.services,
        calendlyUrl: merged.calendlyUrl,
        whatsappNumber: merged.whatsappNumber,
        profilePublic: !!merged.profilePublic,
        highlightVideoId: merged.highlightVideoId,
        socials: merged.socials || {},
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
    return data;
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await persistProfile();
      setSaveMsg({ type: "success", text: "Profile saved." });
    } catch (e) {
      setSaveMsg({ type: "error", text: e.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }, [profile, persistProfile]);

  // --- Toggle work visibility ---
  const toggleVisibility = useCallback(async (type, id, nextVisible) => {
    // Optimistic update
    setWork((w) => ({
      videos: type === "video"
        ? w.videos.map((v) => v.id === id ? { ...v, isVisibleOnPersonal: nextVisible } : v)
        : w.videos,
      thumbnails: type === "thumbnail"
        ? w.thumbnails.map((t) => t.id === id ? { ...t, isVisibleOnPersonal: nextVisible } : t)
        : w.thumbnails,
    }));
    try {
      const res = await authedFetch(AUTH_BASE, `/profiles/me/work-visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, visible: nextVisible }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
    } catch (e) {
      // Rollback on failure
      setWork((w) => ({
        videos: type === "video"
          ? w.videos.map((v) => v.id === id ? { ...v, isVisibleOnPersonal: !nextVisible } : v)
          : w.videos,
        thumbnails: type === "thumbnail"
          ? w.thumbnails.map((t) => t.id === id ? { ...t, isVisibleOnPersonal: !nextVisible } : t)
          : w.thumbnails,
      }));
      setSaveMsg({ type: "error", text: e.message });
    }
  }, []);

  // --- Avatar upload + auto-persist ---
  // The old flow asked the user to click "Save" after upload to persist
  // the avatarUrl. People navigated away and lost it. Now: upload → set
  // local state → immediately PUT /profiles/me with the new avatarUrl
  // so the picture survives a page refresh without any extra click.
  const fileInputRef = useRef(null);
  const handleAvatarUpload = useCallback(async (file) => {
    if (!file) return;
    setSaveMsg({ type: "info", text: "Uploading avatar..." });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await authedFetch(AUTH_BASE, `/api/media/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      const newUrl = data.url || data.publicUrl || "";
      if (!newUrl) throw new Error("Upload succeeded but no URL returned");

      update({ avatarUrl: newUrl });
      // Auto-persist so the user doesn't have to click Save.
      try {
        await persistProfile({ avatarUrl: newUrl });
        setSaveMsg({ type: "success", text: "Avatar saved." });
      } catch (saveErr) {
        // Upload worked but persist failed — keep the local preview, ask
        // the user to retry Save manually.
        setSaveMsg({
          type: "error",
          text: `Avatar uploaded but save failed: ${saveErr.message}. Hit Save to retry.`,
        });
      }
    } catch (e) {
      setSaveMsg({ type: "error", text: e.message || "Upload failed" });
    }
  }, [update, persistProfile]);

  if (!auth.isAuthed) {
    return (
      <main className="min-h-svh grid place-items-center bg-[var(--surface)] p-6">
        <div className="surface-card p-8 text-center max-w-md">
          <Display size="md" className="mb-4">Sign in required</Display>
          <p className="mb-6" style={{ color: "var(--text-muted)" }}>
            Your profile editor is behind the login so only you can change it.
          </p>
          <Link to="/login?next=/me" className="btn-editorial">Sign in</Link>
        </div>
      </main>
    );
  }

  if (loading || !profile) {
    return (
      <main className="min-h-svh grid place-items-center bg-[var(--surface)]">
        <Loader2 className="animate-spin" style={{ color: "var(--orange)" }} size={32} />
      </main>
    );
  }

  // ?seed=1 → user was bounced here from /portfolio/<them> because no
  // profile record exists yet. Show a friendly banner explaining what's up.
  const wasSeeded = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("seed") === "1";

  return (
    <main className="min-h-svh bg-[var(--surface)] pb-24">
      <MetaTags title="My Profile — Shinel Studios" noindex />

      {wasSeeded && (
        <div
          className="container mx-auto px-4 md:px-6 pt-6"
          role="status"
          aria-live="polite"
        >
          <div
            className="rounded-2xl p-4 flex items-start gap-3 hairline"
            style={{
              background: "color-mix(in oklab, var(--orange) 8%, transparent)",
              borderColor: "color-mix(in oklab, var(--orange) 30%, transparent)",
            }}
          >
            <span className="text-xl" aria-hidden="true">👋</span>
            <div className="text-sm" style={{ color: "var(--text)" }}>
              <b>Set your portfolio up first.</b>{" "}
              <span style={{ color: "var(--text-muted)" }}>
                Add a name + bio + avatar, hit Save, and your public page at
                {" "}<code>/team/&lt;you&gt;</code> goes live instantly.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      <div
        className="sticky top-[var(--header-h)] z-20 hairline-b"
        style={{
          background: "color-mix(in oklab, var(--surface) 92%, transparent)",
          backdropFilter: "saturate(140%) blur(10px)",
          WebkitBackdropFilter: "saturate(140%) blur(10px)",
        }}
      >
        <div className="container mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Kicker>My Profile</Kicker>
            {profile.slug && (
              <span className="text-meta" style={{ color: "var(--text-muted)" }}>
                /team/{profile.slug}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {publicUrl && (
              <Link
                to={`${publicUrl}?preview=1`}
                target="_blank"
                className="btn-editorial-ghost"
              >
                Preview <ExternalLink size={14} />
              </Link>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-editorial disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
        {saveMsg && (
          <div
            className="container mx-auto px-4 md:px-6 py-2 text-sm flex items-center gap-2"
            style={{
              color: saveMsg.type === "error" ? "#DC2626" : saveMsg.type === "success" ? "#059669" : "var(--text-muted)",
            }}
          >
            {saveMsg.type === "error" ? <AlertCircle size={16} /> : saveMsg.type === "success" ? <Check size={16} /> : null}
            {saveMsg.text}
          </div>
        )}
      </div>

      <Section size="md">
        <RevealOnScroll>
          <div className="max-w-3xl">
            <Display as="h1" size="lg" className="mb-3">
              Your public portfolio
            </Display>
            <Lede>
              Everything here is visible at <span style={{ color: "var(--orange)" }}>/team/{profile.slug || "…"}</span>.
              Only you can edit this — admins can only unpublish you.
            </Lede>
          </div>
        </RevealOnScroll>
      </Section>

      {/* Identity */}
      <Section size="sm">
        <HairlineCard className="p-6 md:p-8">
          <Eyebrow className="mb-4">Identity</Eyebrow>

          <div className="grid md:grid-cols-[140px_1fr] gap-6 mb-6">
            <div>
              {profile.avatarUrl ? (
                <Img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  width={140}
                  height={140}
                  aspect="1/1"
                  className="rounded-full object-cover hairline"
                  style={{ width: 140, height: 140, objectFit: "cover" }}
                />
              ) : (
                <div
                  className="rounded-full hairline grid place-items-center text-display-md"
                  style={{
                    width: 140,
                    height: 140,
                    background: "var(--orange-soft)",
                    color: "var(--orange)",
                  }}
                >
                  {(profile.firstName || "·").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs flex items-center gap-1.5"
                style={{ color: "var(--orange)" }}
              >
                <Upload size={12} /> Upload photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="First name" value={profile.firstName} onChange={(v) => update({ firstName: v })} />
              <Field label="Last name" value={profile.lastName} onChange={(v) => update({ lastName: v })} />
              <Field
                className="sm:col-span-2"
                label="Headline (one line)"
                placeholder="e.g. Cinematic long-form editor for gaming creators"
                value={profile.headline}
                onChange={(v) => update({ headline: v })}
                maxLength={140}
              />
              <Field
                className="sm:col-span-2"
                label="Bio"
                multiline
                rows={4}
                placeholder="2–3 paragraphs about your style and experience"
                value={profile.bio}
                onChange={(v) => update({ bio: v })}
                maxLength={1500}
              />
              <Field
                className="sm:col-span-2"
                label="Skills (comma-separated)"
                placeholder="Premiere, After Effects, Figma, DaVinci Resolve"
                value={profile.skills}
                onChange={(v) => update({ skills: v })}
              />
              <Field
                label="Experience"
                placeholder="3 years / 500+ videos"
                value={profile.experience}
                onChange={(v) => update({ experience: v })}
              />
              <Field
                label="YouTube highlight video ID"
                placeholder="dQw4w9WgXcQ"
                value={profile.highlightVideoId}
                onChange={(v) => update({ highlightVideoId: v })}
              />
            </div>
          </div>

          <Field
            label="Showreel URL (YouTube / Vimeo)"
            placeholder="https://youtu.be/..."
            value={profile.showreelUrl}
            onChange={(v) => update({ showreelUrl: v })}
          />
        </HairlineCard>
      </Section>

      {/* Services offered */}
      <Section size="sm">
        <HairlineCard className="p-6 md:p-8">
          <Eyebrow className="mb-4">Services I offer</Eyebrow>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Pick the services you want on your public page. Clients will be able to inquire about these specifically.
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_SERVICES.map((svc) => {
              const active = (profile.services || []).includes(svc);
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleService(svc)}
                  className="text-sm px-3 py-1.5 rounded-full hairline transition-colors"
                  style={{
                    background: active ? "var(--orange)" : "transparent",
                    color: active ? "#fff" : "var(--text)",
                    borderColor: active ? "var(--orange)" : "var(--hairline)",
                  }}
                >
                  {svc}
                </button>
              );
            })}
          </div>
        </HairlineCard>
      </Section>

      {/* Socials + contact */}
      <Section size="sm">
        <HairlineCard className="p-6 md:p-8">
          <Eyebrow className="mb-4">Socials & contact</Eyebrow>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field icon={<Instagram size={16} />} label="Instagram URL" value={profile.socials?.instagram || ""} onChange={(v) => updateSocial("instagram", v)} />
            <Field icon={<Youtube size={16} />} label="YouTube URL" value={profile.socials?.youtube || ""} onChange={(v) => updateSocial("youtube", v)} />
            <Field icon={<Linkedin size={16} />} label="LinkedIn URL" value={profile.socials?.linkedin || ""} onChange={(v) => updateSocial("linkedin", v)} />
            <Field icon={<Twitter size={16} />} label="X / Twitter URL" value={profile.socials?.twitter || ""} onChange={(v) => updateSocial("twitter", v)} />
            <Field label="Behance URL" value={profile.socials?.behance || ""} onChange={(v) => updateSocial("behance", v)} />
            <Field label="Dribbble URL" value={profile.socials?.dribbble || ""} onChange={(v) => updateSocial("dribbble", v)} />
            <Field icon={<Globe size={16} />} label="Personal website" value={profile.socials?.website || ""} onChange={(v) => updateSocial("website", v)} />
            <Field label="Calendly URL" placeholder="https://calendly.com/..." value={profile.calendlyUrl} onChange={(v) => update({ calendlyUrl: v })} />
            <Field label="WhatsApp number" placeholder="+91…" value={profile.whatsappNumber} onChange={(v) => update({ whatsappNumber: v })} />
          </div>
        </HairlineCard>
      </Section>

      {/* Work visibility */}
      <Section size="sm">
        <HairlineCard className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <Eyebrow>Your work</Eyebrow>
            <span className="text-meta" style={{ color: "var(--text-muted)" }}>
              {work.videos.length} videos · {work.thumbnails.length} thumbnails
            </span>
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Toggle which pieces appear on your public portfolio. Pieces attributed to you
            by the admin show up here automatically.
          </p>

          {work.videos.length === 0 && work.thumbnails.length === 0 ? (
            <div className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
              No work attributed to you yet. Ask the admin to tag pieces with your email or slug in the inventory.
            </div>
          ) : (
            <div className="space-y-3">
              {work.videos.map((v) => (
                <WorkRow
                  key={`v-${v.id}`}
                  kind="Video"
                  title={v.title}
                  meta={v.category || v.kind || ""}
                  visible={v.isVisibleOnPersonal !== false}
                  onToggle={(next) => toggleVisibility("video", v.id, next)}
                />
              ))}
              {work.thumbnails.map((t) => (
                <WorkRow
                  key={`t-${t.id}`}
                  kind="Thumbnail"
                  title={t.title || t.filename}
                  meta={t.category || ""}
                  visible={t.isVisibleOnPersonal !== false}
                  onToggle={(next) => toggleVisibility("thumbnail", t.id, next)}
                />
              ))}
            </div>
          )}
        </HairlineCard>
      </Section>

      {/* Privacy */}
      <Section size="sm">
        <HairlineCard className="p-6 md:p-8">
          <Eyebrow className="mb-4">Privacy</Eyebrow>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.profilePublic !== false}
              onChange={(e) => update({ profilePublic: e.target.checked })}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Show my profile on /team</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                Uncheck to hide yourself from the public team directory. You'll still be
                reachable at your direct slug link.
              </div>
            </div>
          </label>
        </HairlineCard>
      </Section>
    </main>
  );
}

// -------- local form primitives ---------------------------------------------

function Field({ label, value, onChange, multiline, rows = 2, icon, className = "", ...rest }) {
  const Tag = multiline ? "textarea" : "input";
  const id = label?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label className={`block ${className}`}>
      <span className="text-eyebrow block mb-1.5 flex items-center gap-1.5">
        {icon}{label}
      </span>
      <Tag
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? rows : undefined}
        className="w-full px-3.5 py-2.5 rounded-xl hairline bg-transparent text-[var(--text)] focus:outline-none focus:border-[var(--orange)] transition-colors"
        style={{ fontFamily: "inherit", fontSize: 15 }}
        {...rest}
      />
    </label>
  );
}

function WorkRow({ kind, title, meta, visible, onToggle }) {
  return (
    <div className="flex items-center justify-between py-2.5 hairline-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-eyebrow">{kind}</span>
          <span style={{ color: "var(--text-muted)" }}>·</span>
          <span className="text-meta" style={{ color: "var(--text-muted)" }}>{meta}</span>
        </div>
        <div className="font-medium truncate">{title}</div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!visible)}
        className="shrink-0 ml-4 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hairline transition-colors"
        style={{
          background: visible ? "var(--orange-soft)" : "transparent",
          color: visible ? "var(--orange)" : "var(--text-muted)",
          borderColor: visible ? "color-mix(in oklab, var(--orange) 30%, transparent)" : "var(--hairline)",
        }}
      >
        {visible ? <Eye size={13} /> : <EyeOff size={13} />}
        {visible ? "Visible" : "Hidden"}
      </button>
    </div>
  );
}
