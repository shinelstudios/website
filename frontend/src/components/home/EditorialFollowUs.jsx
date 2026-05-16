/**
 * EditorialFollowUs — homepage "Follow the studio" strip.
 *
 * No live Instagram embed. Three account cards with handle + description
 * + Follow button that opens the IG profile in a new tab. Zero infra,
 * zero cost, zero token rotation. Per the user's pick — Instagram's
 * embed/Graph API costs are real (paid widgets, OAuth refresh, Meta
 * API breakage), and a clean Follow strip drives the same outcome
 * (followers + brand surface) with none of the maintenance burden.
 *
 * Avatars are optional in the data model; missing avatars render a
 * brand-orange Instagram-icon placeholder. Drop PNGs in
 * `frontend/src/assets/instagram/` and wire via constants.js to swap.
 */
import React from "react";
import { Instagram, ArrowUpRight } from "lucide-react";
import { Kicker, Display, RevealOnScroll, MagneticButton } from "../../design";
import { INSTAGRAM_ACCOUNTS } from "../../config/constants";

const track = (ev, detail = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } }));
  } catch { /* analytics is best-effort */ }
};

function AccountAvatar({ avatar, accent, handle }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${handle} avatar`}
        width={72}
        height={72}
        loading="lazy"
        decoding="async"
        className="w-[72px] h-[72px] rounded-full object-cover"
        style={{
          border: `2px solid ${accent || "var(--orange)"}`,
          boxShadow: `0 4px 18px ${accent || "var(--orange)"}33`,
        }}
      />
    );
  }
  return (
    <div
      className="w-[72px] h-[72px] rounded-full grid place-items-center"
      style={{
        background: `linear-gradient(135deg, ${accent || "var(--orange)"}, #ff9357)`,
        color: "#fff",
        boxShadow: `0 4px 18px ${accent || "var(--orange)"}33`,
      }}
      aria-hidden="true"
    >
      <Instagram size={28} strokeWidth={2.25} />
    </div>
  );
}

export default function EditorialFollowUs() {
  return (
    <section
      className="relative py-20 md:py-28"
      style={{ background: "var(--surface)" }}
      aria-labelledby="follow-headline"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <RevealOnScroll>
            <Kicker>On Instagram</Kicker>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h2" size="xl" id="follow-headline" className="mt-3">
              Three accounts.{" "}
              <span style={{ color: "var(--orange)", fontStyle: "italic" }}>
                One studio.
              </span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <p
              className="mt-4 text-base md:text-lg leading-relaxed mx-auto"
              style={{ color: "var(--text-muted)", maxWidth: "560px" }}
            >
              Different angles, same studio. Pick the feed that fits how you
              want to follow along.
            </p>
          </RevealOnScroll>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {INSTAGRAM_ACCOUNTS.map((account, i) => (
            <RevealOnScroll key={account.handle} delay={`${200 + i * 80}ms`}>
              <article
                className="h-full rounded-2xl p-6 flex flex-col items-center text-center transition-transform hover:-translate-y-1"
                style={{
                  background: "var(--surface-alt)",
                  border: "1px solid var(--hairline, var(--border))",
                }}
              >
                <AccountAvatar
                  avatar={account.avatar}
                  accent={account.accent}
                  handle={account.handle}
                />

                <div className="mt-4">
                  <p
                    className="text-[11px] font-black uppercase tracking-[0.18em]"
                    style={{ color: "var(--orange)" }}
                  >
                    {account.title}
                  </p>
                  <p
                    className="mt-1 text-lg md:text-xl font-bold"
                    style={{
                      color: "var(--text)",
                      fontFamily: "'Outfit Variable', 'Outfit', sans-serif",
                    }}
                  >
                    @{account.handle}
                  </p>
                </div>

                <p
                  className="mt-3 text-sm leading-relaxed flex-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {account.description}
                </p>

                <div className="mt-5 w-full">
                  <MagneticButton strength={5} block>
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        track("cta_click_instagram_follow", {
                          handle: account.handle,
                        })
                      }
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
                      style={{
                        background: `linear-gradient(135deg, ${account.accent || "var(--orange)"}, #ff9357)`,
                        boxShadow: `0 4px 14px ${account.accent || "var(--orange)"}40`,
                      }}
                      aria-label={`Follow @${account.handle} on Instagram`}
                    >
                      <Instagram size={14} aria-hidden="true" />
                      Follow
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  </MagneticButton>
                </div>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
