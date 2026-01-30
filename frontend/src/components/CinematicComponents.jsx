import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, ANIMATIONS } from '../config/constants';

/**
 * Film Strip Timeline Component
 * Cinematic timeline showing the production process
 */
export const FilmStripTimeline = ({ steps = [] }) => {
    const [activeStep, setActiveStep] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <div className="relative py-8 overflow-hidden">
            {/* Film strip background */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    background: COLORS.filmStrip,
                }}
            />

            {/* Timeline container */}
            <div className="relative flex items-center justify-between max-w-4xl mx-auto px-4">
                {steps.map((step, index) => (
                    <React.Fragment key={index}>
                        {/* Step frame */}
                        <motion.div
                            className="relative flex flex-col items-center cursor-pointer"
                            onClick={() => setActiveStep(index)}
                            initial={ANIMATIONS.fadeIn.initial}
                            animate={ANIMATIONS.fadeIn.animate}
                            transition={{ delay: index * 0.1 }}
                        >
                            {/* Frame number */}
                            <motion.div
                                className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center mb-2 border-2"
                                style={{
                                    background: activeStep === index ? COLORS.gold : COLORS.slate,
                                    borderColor: activeStep === index ? COLORS.gold : COLORS.silver,
                                    color: activeStep === index ? COLORS.filmNoir : COLORS.silver,
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="text-2xl font-bold">{index + 1}</span>
                            </motion.div>

                            {/* Step label */}
                            <div className="text-center">
                                <div
                                    className="text-sm md:text-base font-semibold mb-1"
                                    style={{ color: activeStep === index ? COLORS.gold : 'var(--text)' }}
                                >
                                    {step.title}
                                </div>
                                <div
                                    className="text-xs"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {step.duration}
                                </div>
                            </div>

                            {/* Active indicator */}
                            {activeStep === index && (
                                <motion.div
                                    className="absolute -bottom-2 left-1/2 w-2 h-2 rounded-full"
                                    style={{ background: COLORS.gold }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [1, 1.5, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                            )}
                        </motion.div>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div className="flex-1 h-0.5 mx-2" style={{ background: COLORS.silver, opacity: 0.3 }} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step description */}
            <motion.div
                key={activeStep}
                className="mt-8 text-center max-w-2xl mx-auto px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <p style={{ color: 'var(--text-muted)' }}>
                    {steps[activeStep]?.description}
                </p>
            </motion.div>
        </div>
    );
};

/**
 * Metric Counter Component
 * Animated number counter for stats
 */
export const MetricCounter = ({ value, suffix = '', prefix = '', duration = 2 }) => {
    const [count, setCount] = React.useState(0);
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [isVisible]);

    React.useEffect(() => {
        if (!isVisible) return;

        const target = typeof value === 'string' ? parseFloat(value) : value;
        const increment = target / (duration * 60); // 60fps
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, 1000 / 60);

        return () => clearInterval(timer);
    }, [isVisible, value, duration]);

    return (
        <span ref={ref} className="font-bold tabular-nums">
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
};

/**
 * Before/After Slider Component
 * Interactive comparison slider for showcasing improvements
 */
export const BeforeAfterSlider = ({ before, after, alt = 'Comparison' }) => {
    const [sliderPosition, setSliderPosition] = React.useState(50);
    const [isDragging, setIsDragging] = React.useState(false);
    const containerRef = React.useRef(null);

    const handleMove = React.useCallback((clientX) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        setSliderPosition(Math.min(Math.max(percentage, 0), 100));
    }, []);

    const handleMouseMove = React.useCallback((e) => {
        if (!isDragging) return;
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const handleTouchMove = React.useCallback((e) => {
        if (!isDragging) return;
        handleMove(e.touches[0].clientX);
    }, [isDragging, handleMove]);

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => setIsDragging(false));
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', () => setIsDragging(false));
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', () => setIsDragging(false));
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', () => setIsDragging(false));
        };
    }, [isDragging, handleMouseMove, handleTouchMove]);

    return (
        <div
            ref={containerRef}
            className="relative aspect-video overflow-hidden rounded-xl cursor-ew-resize select-none"
            style={{ touchAction: 'none' }}
        >
            {/* After image (full) */}
            <img
                src={after}
                alt={`${alt} - After`}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />

            {/* Before image (clipped) */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
            >
                <img
                    src={before}
                    alt={`${alt} - Before`}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ width: `${(100 / sliderPosition) * 100}%` }}
                    draggable={false}
                />
            </div>

            {/* Slider handle */}
            <div
                className="absolute top-0 bottom-0 w-1 cursor-ew-resize"
                style={{
                    left: `${sliderPosition}%`,
                    background: COLORS.gold,
                    transform: 'translate3d(-50%, 0, 0)',
                    WebkitTransform: 'translate3d(-50%, 0, 0)',
                    zIndex: 1,
                    perspective: 1000,
                    backfaceVisibility: 'hidden'
                }}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
            >
                {/* Handle circle */}
                <div
                    className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                        background: COLORS.gold,
                        transform: 'translate3d(-50%, -50%, 0)',
                        WebkitTransform: 'translate3d(-50%, -50%, 0)',
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 19l-7-7 7-7" stroke={COLORS.filmNoir} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 19l7-7-7-7" stroke={COLORS.filmNoir} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                BEFORE
            </div>
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{ background: COLORS.gold, color: COLORS.filmNoir }}>
                AFTER
            </div>
        </div>
    );
};

/**
 * Swipeable Carousel Component
 * Mobile-optimized carousel with swipe gestures
 */
export const SwipeableCarousel = ({ items = [], renderItem }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [touchStart, setTouchStart] = React.useState(0);
    const [touchEnd, setTouchEnd] = React.useState(0);

    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
        if (isRightSwipe && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <div className="relative">
            {/* Carousel container */}
            <div
                className="overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <motion.div
                    className="flex"
                    animate={{ x: `-${currentIndex * 100}%` }}
                    style={{
                        transform: 'translate3d(0,0,0)',
                        WebkitTransform: 'translate3d(0,0,0)',
                        perspective: 1000,
                        backfaceVisibility: 'hidden'
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    {items.map((item, index) => (
                        <div key={index} className="w-full flex-shrink-0 px-2">
                            {renderItem(item, index)}
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-4">
                {items.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{
                            background: index === currentIndex ? COLORS.gold : COLORS.silver,
                            opacity: index === currentIndex ? 1 : 0.3,
                            width: index === currentIndex ? '24px' : '8px',
                        }}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Navigation arrows (desktop) */}
            <div className="hidden md:block">
                {currentIndex > 0 && (
                    <button
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        aria-label="Previous slide"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
                {currentIndex < items.length - 1 && (
                    <button
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        aria-label="Next slide"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>
        </div >
    );
};

/**
 * Urgency Indicator Component
 * Shows limited availability to create urgency
 */
export const UrgencyIndicator = ({ slotsLeft = 3, nextAvailable = 'Feb 1' }) => {
    return (
        <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
                background: 'rgba(220, 20, 60, 0.1)',
                border: '1px solid rgba(220, 20, 60, 0.3)',
                color: COLORS.crimson,
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                🔥
            </motion.div>
            <span>Only {slotsLeft} slots left • Next available: {nextAvailable}</span>
        </motion.div>
    );
};

export default {
    FilmStripTimeline,
    MetricCounter,
    BeforeAfterSlider,
    SwipeableCarousel,
    UrgencyIndicator,
};
