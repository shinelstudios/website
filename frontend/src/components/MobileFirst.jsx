import React from 'react';
import { motion } from 'framer-motion';
import { BREAKPOINTS, SPACING } from '../config/constants';

/**
 * Responsive Container Component
 * Mobile-first container with proper padding and max-width
 */
export const Container = ({
    children,
    className = '',
    maxWidth = 'wide',
    padding = true,
    ...props
}) => {
    const maxWidths = {
        mobile: `${BREAKPOINTS.mobile}px`,
        tablet: `${BREAKPOINTS.tablet}px`,
        desktop: `${BREAKPOINTS.desktop}px`,
        wide: `${BREAKPOINTS.wide}px`,
        ultraWide: `${BREAKPOINTS.ultraWide}px`,
        full: '100%',
    };

    return (
        <div
            className={`mx-auto ${padding ? 'px-4 sm:px-6 lg:px-8' : ''} ${className}`}
            style={{
                maxWidth: maxWidths[maxWidth] || maxWidths.wide,
                width: '100%',
            }}
            {...props}
        >
            {children}
        </div>
    );
};

/**
 * Section Component
 * Standardized section with consistent spacing
 */
export const Section = ({
    children,
    className = '',
    background = 'transparent',
    paddingY = 'lg',
    id,
    ...props
}) => {
    const paddingClasses = {
        none: '',
        sm: 'py-8 md:py-12',
        md: 'py-12 md:py-16',
        lg: 'py-16 md:py-20 lg:py-24',
        xl: 'py-20 md:py-28 lg:py-32',
    };

    return (
        <section
            id={id}
            className={`relative ${paddingClasses[paddingY]} ${className}`}
            style={{ background }}
            {...props}
        >
            {children}
        </section>
    );
};

/**
 * Grid Component
 * Responsive grid with mobile-first breakpoints
 */
export const Grid = ({
    children,
    cols = { mobile: 1, tablet: 2, desktop: 3 },
    gap = 'md',
    className = '',
    ...props
}) => {
    const gapClasses = {
        sm: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8',
        xl: 'gap-12',
    };

    return (
        <div
            className={`grid ${gapClasses[gap]} ${className}`}
            style={{
                gridTemplateColumns: `repeat(${cols.mobile}, 1fr)`,
            }}
            {...props}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
        @media (min-width: ${BREAKPOINTS.tablet}px) {
          div {
            grid-template-columns: repeat(${cols.tablet || cols.mobile}, 1fr);
          }
        }
        @media (min-width: ${BREAKPOINTS.desktop}px) {
          div {
            grid-template-columns: repeat(${cols.desktop || cols.tablet || cols.mobile}, 1fr);
          }
        }
      `}} />
            {children}
        </div>
    );
};

/**
 * Card Component
 * Mobile-first card with touch-friendly interactions
 */
export const Card = ({
    children,
    className = '',
    variant = 'default',
    interactive = false,
    onClick,
    ...props
}) => {
    const variants = {
        default: {
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
        },
        cinematic: {
            background: 'linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)',
            border: '1px solid rgba(192, 192, 192, 0.1)',
        },
        glass: {
            background: 'rgba(26, 26, 26, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
        },
    };

    const Component = interactive ? motion.div : 'div';
    const motionProps = interactive
        ? {
            whileHover: { y: -4 },
            whileTap: { scale: 0.98 },
            transition: { duration: 0.2 },
        }
        : {};

    return (
        <Component
            className={`rounded-xl overflow-hidden ${interactive ? 'cursor-pointer' : ''} ${className}`}
            style={{
                ...variants[variant],
                minHeight: '44px', // Touch-friendly minimum
            }}
            onClick={onClick}
            {...motionProps}
            {...props}
        >
            {children}
        </Component>
    );
};

/**
 * Button Component
 * Touch-optimized button with variants
 */
export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    onClick,
    className = '',
    ...props
}) => {
    const variants = {
        primary: {
            background: 'linear-gradient(90deg, var(--orange), #ff9357)',
            color: '#fff',
            border: 'none',
        },
        secondary: {
            background: 'rgba(0,0,0,0)',
            color: 'var(--text)',
            border: '2px solid var(--border)',
        },
        ghost: {
            background: 'rgba(0,0,0,0)',
            color: 'var(--orange)',
            border: 'none',
        },
        cinematic: {
            background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
            color: '#0A0A0A',
            border: 'none',
        },
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <motion.button
            className={`
        rounded-lg font-semibold transition-all
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
            style={{
                ...variants[variant],
                minHeight: '44px', // Touch-friendly
                minWidth: '44px',
            }}
            whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
            whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
            onClick={onClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </motion.button>
    );
};

/**
 * Badge Component
 * Small label for categories, tags, metrics
 */
export const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    ...props
}) => {
    const variants = {
        default: {
            background: 'rgba(232, 80, 2, 0.1)',
            color: 'var(--orange)',
            border: '1px solid rgba(232, 80, 2, 0.2)',
        },
        success: {
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.2)',
        },
        gold: {
            background: 'rgba(212, 175, 55, 0.1)',
            color: '#D4AF37',
            border: '1px solid rgba(212, 175, 55, 0.2)',
        },
        silver: {
            background: 'rgba(192, 192, 192, 0.1)',
            color: '#C0C0C0',
            border: '1px solid rgba(192, 192, 192, 0.2)',
        },
    };

    const sizes = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full font-semibold ${sizes[size]} ${className}`}
            style={variants[variant]}
            {...props}
        >
            {children}
        </span>
    );
};

/**
 * Heading Component
 * Responsive typography with mobile-first sizing
 */
export const Heading = ({
    children,
    level = 2,
    className = '',
    gradient = false,
    align = 'left',
    ...props
}) => {
    const Tag = `h${level}`;

    const sizes = {
        1: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
        2: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
        3: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
        4: 'text-lg sm:text-xl md:text-2xl',
        5: 'text-base sm:text-lg md:text-xl',
        6: 'text-sm sm:text-base md:text-lg',
    };

    const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <Tag
            className={`
        font-bold font-['Poppins']
        ${sizes[level]}
        ${alignClasses[align]}
        ${gradient ? 'bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent' : ''}
        ${className}
      `}
            style={!gradient ? { color: 'var(--text)' } : {}}
            {...props}
        >
            {children}
        </Tag>
    );
};

/**
 * Text Component
 * Responsive body text
 */
export const Text = ({
    children,
    size = 'md',
    className = '',
    muted = false,
    ...props
}) => {
    const sizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
    };

    return (
        <p
            className={`${sizes[size]} ${className}`}
            style={{ color: muted ? 'var(--text-muted)' : 'var(--text)' }}
            {...props}
        >
            {children}
        </p>
    );
};

export default {
    Container,
    Section,
    Grid,
    Card,
    Button,
    Badge,
    Heading,
    Text,
};
