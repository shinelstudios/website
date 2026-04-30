/**
 * Design system public surface. Import from `@/design` (or relative)
 * rather than reaching into individual files — keeps the surface area stable.
 */

export { default as Section } from "./ui/Section";
export { Kicker, Eyebrow, Display, Lede, Meta } from "./ui/Typography";
export { default as HairlineCard } from "./ui/HairlineCard";
export { default as RevealOnScroll } from "./ui/RevealOnScroll";
export { default as GrainOverlay } from "./ui/GrainOverlay";
export { default as VideoFrame } from "./ui/VideoFrame";
export { default as MarqueeRow } from "./ui/MarqueeRow";
export { default as Img } from "./ui/Img";

export { useReducedMotion } from "./hooks/useReducedMotion";
export { useDeviceCapabilities } from "./hooks/useDeviceCapabilities";
export { useInView } from "./hooks/useInView";

export { default as ScrollAurora } from "./animations/ScrollAurora";
export { default as ReadingProgress } from "./animations/ReadingProgress";
export { default as SpotlightSweep } from "./animations/SpotlightSweep";
export { default as NumberTickIn } from "./animations/NumberTickIn";

// Phase 2 creative-motion primitives (per-page signature animations)
export { default as MagneticButton } from "./animations/MagneticButton";
export { default as LetterFall } from "./animations/LetterFall";
export { default as MaskReveal } from "./animations/MaskReveal";
export { default as FieldFocusUnderline } from "./animations/FieldFocusUnderline";
export { default as CheckStamp } from "./animations/CheckStamp";
export { default as BorderDraw } from "./animations/BorderDraw";
export { default as ConstellationHover } from "./animations/ConstellationHover";

export * from "./motion";
