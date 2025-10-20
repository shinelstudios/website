// In Home.jsx or App.jsx (where your hero lives)
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
// [NEW] Imported icons for chips
import {
  Image,
  FileText,
  Scroll,
  Mic,
  Users,
  Wand2,
  ArrowRight,
} from "lucide-react";

// [NEW] Animation variants for the whole hero
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Staggers all direct children
    },
  },
};

// [NEW] Stagger variant for the headline words
const headlineVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // Staggers the words
    },
  },
};

// [NEW] Variant for each word in the headline
const wordVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

// [NEW] Standard fade-in-up variant for all other items
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function Hero() {
  // [NEW] Updated chips to include icons
  const chips = [
    { text: "AI Thumbnails", icon: Image },
    { text: "Auto Transcriptions", icon: FileText },
    { text: "Script Drafts", icon: Scroll },
    { text: "Voice Generation (opt-in)", icon: Mic },
    { text: "Consent-First Face Swap", icon: Users },
    { text: "Style-Matched Transitions", icon: Wand2 },
  ];

  const headline1 = "AI-Powered Visuals That Stop the Scroll.";

  return (
    <section
      id="home"
      className="relative min-h-[90vh] md:min-h-screen flex flex-col items-center justify-center text-center bg-gradient-to-b from-black via-zinc-900 to-black text-white px-6 overflow-hidden" // [NEW] Added relative & overflow-hidden
      aria-label="Shinel Studios hero"
    >
      {/* [NEW] Animated background gradients */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-radial-gradient from-orange-500/10 to-transparent blur-[80px] animate-[pulseSlow_8s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-radial-gradient from-orange-400/10 to-transparent blur-[80px] animate-[pulseSlow_10s_ease-in-out_infinite_alternate_2s]" />
      </div>

      {/* [NEW] Stagger container for all content */}
      <motion.div
        className="relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* [MODIFIED] Headline split into animated parts */}
        <motion.h1
          className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight"
          variants={headlineVariants} // This staggers the <span> tags
        >
          {headline1.split(" ").map((word, i) => (
            <motion.span
              key={i}
              className="inline-block"
              variants={wordVariant}
            >
              {word}
              {/* Add a space back in */}
              {i < headline1.split(" ").length - 1 ? "\u00A0" : ""}
            </motion.span>
          ))}
          <br />
          <motion.span
            className="text-orange-400"
            variants={itemVariant} // This animates as one block
          >
            Data-Driven Edits That Hook Viewers.
          </motion.span>
        </motion.h1>

        {/* [MODIFIED] Subhead with new copy */}
        <motion.p
          variants={itemVariant}
          className="text-base md:text-xl text-gray-300/90 max-w-2xl mb-6"
        >
          We blend cutting-edge AI for speed with the irreplaceable touch of
          human creativity. Get your content to market faster, smarter, and
          with more impact.
        </motion.p>

        {/* AI capability chips */}
        <motion.div
          variants={itemVariant}
          className="mb-8 flex flex-wrap items-center justify-center gap-2"
          aria-label="AI capabilities"
        >
          {chips.map((chip) => (
            <span
              key={chip.text}
              className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm flex items-center gap-1.5"
            >
              <chip.icon size={12} className="text-orange-400" />
              {chip.text}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          variants={itemVariant}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            className="relative bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-lg overflow-hidden group" // [NEW] Added group
            aria-label="Get a free AI content audit"
          >
            {/* [MODIFIED] Slower shimmer */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 translate-x-[-100%] animate-[shimmer_3s_ease-in-out_2s_infinite]"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 50%, rgba(255,255,255,0) 100%)",
                filter: "blur(6px)",
              }}
            />
            Get Free AI Audit
            <ArrowRight size={18} className="ml-2 -translate-x-1 group-hover:translate-x-0 transition-transform" />
          </Button>

          {/* [MODIFIED] Glassmorphism button */}
          <Button
            variant="outline"
            className="border-white/20 bg-white/10 text-gray-200 px-6 py-3 rounded-xl text-lg backdrop-blur-sm hover:bg-white/20 hover:text-white"
            asChild
          >
            <a href="#work" aria-label="See our recent work">
              See Our Work
            </a>
          </Button>
        </motion.div>

        {/* Small reassurance / policy note */}
        <motion.p
          variants={itemVariant}
          className="mt-4 text-xs text-gray-400/80 max-w-xl"
        >
          Face-swap & voice generation are offered only with creator consent
          and platform-policy compliance.
        </motion.p>
      </motion.div>

      {/* local shimmer & background pulse keyframes */}
      <style>{`
        @keyframes shimmer { 
          0% { transform: translateX(-120%); } 
          100% { transform: translateX(220%); } 
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.25; }
        }
        .bg-radial-gradient {
          background-image: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-to));
        }
      `}</style>
    </section>
  );
}