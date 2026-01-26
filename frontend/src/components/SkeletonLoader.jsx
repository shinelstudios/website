import React from 'react';
import { motion } from 'framer-motion';

/**
 * Skeleton Loader Component
 * Provides loading placeholders for content while data is being fetched
 */

const SkeletonLoader = ({
    type = 'card',
    count = 1,
    className = '',
    animate = true,
}) => {
    const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shouldAnimate = animate && !reduceMotion;

    const pulseAnimation = shouldAnimate
        ? {
            animate: {
                opacity: [0.5, 0.8, 0.5],
            },
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        }
        : {};

    const baseStyle = {
        background: 'linear-gradient(90deg, var(--surface-alt) 0%, rgba(232,80,2,0.05) 50%, var(--surface-alt) 100%)',
        backgroundSize: '200% 100%',
        borderRadius: '8px',
    };

    // Card skeleton (for case studies, testimonials, etc.)
    const CardSkeleton = () => (
        <motion.div
            className={`rounded-2xl overflow-hidden border ${className}`}
            style={{
                background: 'var(--surface-alt)',
                borderColor: 'var(--border)',
            }}
            {...pulseAnimation}
        >
            {/* Image placeholder */}
            <div
                className="aspect-video w-full"
                style={baseStyle}
            />

            {/* Content placeholder */}
            <div className="p-5 space-y-3">
                {/* Title */}
                <div
                    className="h-6 w-3/4 rounded"
                    style={baseStyle}
                />

                {/* Description lines */}
                <div
                    className="h-4 w-full rounded"
                    style={baseStyle}
                />
                <div
                    className="h-4 w-5/6 rounded"
                    style={baseStyle}
                />

                {/* Metrics/badges */}
                <div className="flex gap-2 mt-4">
                    <div
                        className="h-8 w-20 rounded-full"
                        style={baseStyle}
                    />
                    <div
                        className="h-8 w-24 rounded-full"
                        style={baseStyle}
                    />
                </div>
            </div>
        </motion.div>
    );

    // Text skeleton (for paragraphs, descriptions)
    const TextSkeleton = ({ lines = 3 }) => (
        <motion.div className={`space-y-2 ${className}`} {...pulseAnimation}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 rounded"
                    style={{
                        ...baseStyle,
                        width: i === lines - 1 ? '80%' : '100%',
                    }}
                />
            ))}
        </motion.div>
    );

    // Image skeleton
    const ImageSkeleton = ({ aspectRatio = 'video' }) => {
        const aspectClass = {
            video: 'aspect-video',
            square: 'aspect-square',
            portrait: 'aspect-[3/4]',
            wide: 'aspect-[21/9]',
        }[aspectRatio] || 'aspect-video';

        return (
            <motion.div
                className={`${aspectClass} w-full rounded-lg ${className}`}
                style={baseStyle}
                {...pulseAnimation}
            />
        );
    };

    // Avatar skeleton
    const AvatarSkeleton = ({ size = 'md' }) => {
        const sizeClass = {
            sm: 'w-8 h-8',
            md: 'w-12 h-12',
            lg: 'w-16 h-16',
            xl: 'w-24 h-24',
        }[size] || 'w-12 h-12';

        return (
            <motion.div
                className={`${sizeClass} rounded-full ${className}`}
                style={baseStyle}
                {...pulseAnimation}
            />
        );
    };

    // Button skeleton
    const ButtonSkeleton = () => (
        <motion.div
            className={`h-12 w-32 rounded-lg ${className}`}
            style={baseStyle}
            {...pulseAnimation}
        />
    );

    // List item skeleton
    const ListItemSkeleton = () => (
        <motion.div
            className={`flex items-center gap-3 p-4 rounded-lg ${className}`}
            style={{ background: 'var(--surface-alt)' }}
            {...pulseAnimation}
        >
            <AvatarSkeleton size="md" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded" style={baseStyle} />
                <div className="h-3 w-1/2 rounded" style={baseStyle} />
            </div>
        </motion.div>
    );

    // Testimonial skeleton
    const TestimonialSkeleton = () => (
        <motion.div
            className={`rounded-2xl overflow-hidden border ${className}`}
            style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
            }}
            {...pulseAnimation}
        >
            <ImageSkeleton aspectRatio="video" />
            <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                    <AvatarSkeleton size="md" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 rounded" style={baseStyle} />
                        <div className="h-3 w-1/4 rounded" style={baseStyle} />
                    </div>
                </div>
                <TextSkeleton lines={2} />
                <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full" style={baseStyle} />
                    <div className="h-6 w-20 rounded-full" style={baseStyle} />
                </div>
            </div>
        </motion.div>
    );

    // Process step skeleton
    const ProcessStepSkeleton = () => (
        <motion.div
            className={`p-6 rounded-2xl ${className}`}
            style={{
                background: 'var(--surface-alt)',
                border: '2px solid var(--border)',
            }}
            {...pulseAnimation}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl" style={baseStyle} />
                <div className="w-10 h-10 rounded-lg" style={baseStyle} />
            </div>
            <div className="h-5 w-2/3 rounded mb-2" style={baseStyle} />
            <TextSkeleton lines={3} />
        </motion.div>
    );

    // Select skeleton type
    const SkeletonComponent = {
        card: CardSkeleton,
        text: TextSkeleton,
        image: ImageSkeleton,
        avatar: AvatarSkeleton,
        button: ButtonSkeleton,
        listItem: ListItemSkeleton,
        testimonial: TestimonialSkeleton,
        processStep: ProcessStepSkeleton,
    }[type] || CardSkeleton;

    // Render multiple skeletons if count > 1
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonComponent key={i} />
            ))}
        </>
    );
};

/**
 * Skeleton Grid - Renders a grid of skeleton loaders
 */
export const SkeletonGrid = ({
    type = 'card',
    count = 4,
    columns = { sm: 1, md: 2, lg: 4 },
    gap = 6,
    className = '',
}) => {
    const gridClass = `grid gap-${gap} ${className}`;
    const colsClass = `grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg}`;

    return (
        <div className={`${gridClass} ${colsClass}`}>
            <SkeletonLoader type={type} count={count} />
        </div>
    );
};

/**
 * Section Skeleton - Full section loading state
 */
export const SectionSkeleton = ({ title = true, description = true, content = 'card', contentCount = 3 }) => {
    return (
        <div className="py-20">
            <div className="container mx-auto px-4">
                {/* Header skeleton */}
                <div className="text-center mb-12">
                    {title && (
                        <div className="flex justify-center mb-4">
                            <SkeletonLoader type="button" />
                        </div>
                    )}
                    {description && (
                        <div className="max-w-2xl mx-auto space-y-3">
                            <div className="h-10 w-2/3 mx-auto rounded" style={{
                                background: 'linear-gradient(90deg, var(--surface-alt) 0%, rgba(232,80,2,0.05) 50%, var(--surface-alt) 100%)',
                            }} />
                            <div className="h-6 w-3/4 mx-auto rounded" style={{
                                background: 'linear-gradient(90deg, var(--surface-alt) 0%, rgba(232,80,2,0.05) 50%, var(--surface-alt) 100%)',
                            }} />
                        </div>
                    )}
                </div>

                {/* Content skeleton */}
                <SkeletonGrid type={content} count={contentCount} />
            </div>
        </div>
    );
};

export default SkeletonLoader;
