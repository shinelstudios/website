import { useEffect } from "react";

// (This component is small and can be defined in the main homepage file,
// but for true modularity, here it is)

export const SeoSchema = () => {
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://shinelstudiosofficial.com";
    const logoUrl = `${origin}/assets/logo_light.png`; // Make sure this path is correct

    const faq = [
      { q: "What services does Shinel Studios offer?", a: "We specialize in video editing, thumbnail design, SEO & marketing, and comprehensive content strategy." },
      { q: "How long does a typical project take?", a: "Thumbnails in 24–48 hours; longer edits may take 1–2 weeks depending on scope." },
      { q: "Do you work with small creators?", a: "Yes, we tailor packages for creators and brands of all sizes." },
      { q: "What's included in content strategy?", a: "Research, competitor analysis, planning, schedules, and performance optimization." },
      { q: "How do you ensure quality?", a: "Multi-stage QA with client reviews and revisions until approval." },
    ];

    const ld = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Shinel Studios",
        "url": origin,
        "logo": logoUrl,
        "sameAs": [
          "https://www.instagram.com/shinel.studios/",
          "https://www.linkedin.com/company/shinel-studios/",
          "https://linktr.ee/ShinelStudios"
        ],
        "contactPoint": [{
          "@type": "ContactPoint",
          "contactType": "customer support",
          "email": "hello@shinelstudiosofficial.com",
          "areaServed": "IN",
          "availableLanguage": ["en", "hi"]
        }]
      },
      // ... (other schema objects: WebSite, Service, FAQPage) ...
    ];

    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify(ld);
    document.head.appendChild(s);
    return () => {
      if (document.head.contains(s)) {
          document.head.removeChild(s);
      }
    };
  }, []);
  return null;
};