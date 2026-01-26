import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Progressive Image Component
 * Loads images with blur-up effect for better perceived performance
 */
const ProgressiveImage = ({
    src,
    placeholder,
    alt = '',
    className = '',
    style = {},
    onLoad,
    onError,
    loading = 'lazy',
    aspectRatio,
    objectFit = 'cover',
    ...props
}) => {
    const [imgSrc, setImgSrc] = useState(placeholder || src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        // Create a new image to preload
        const img = new Image();

        img.onload = () => {
            setImgSrc(src);
            setIsLoading(false);
            onLoad?.();
        };

        img.onerror = (error) => {
            setHasError(true);
            setIsLoading(false);
            onError?.(error);
            console.error(`Failed to load image: ${src}`, error);
        };

        // Start loading the full-size image
        img.src = src;

        // Cleanup
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src, onLoad, onError]);

    // Error fallback
    if (hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-200 ${className}`}
                style={{
                    ...style,
                    aspectRatio: aspectRatio || 'auto',
                }}
            >
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
            </div>
        );
    }

    return (
        <motion.img
            ref={imgRef}
            src={imgSrc}
            alt={alt}
            className={className}
            style={{
                ...style,
                objectFit,
                aspectRatio: aspectRatio || 'auto',
            }}
            loading={loading}
            initial={{ opacity: 0 }}
            animate={{
                opacity: isLoading ? 0.7 : 1,
                filter: isLoading ? 'blur(10px)' : 'blur(0px)',
            }}
            transition={{
                opacity: { duration: 0.3 },
                filter: { duration: 0.5 },
            }}
            {...props}
        />
    );
};

/**
 * Lazy Image Component with Intersection Observer
 * Only loads images when they're about to enter the viewport
 */
export const LazyImage = ({
    src,
    placeholder,
    alt = '',
    className = '',
    threshold = 0.1,
    rootMargin = '50px',
    ...props
}) => {
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, [threshold, rootMargin]);

    return (
        <div ref={imgRef}>
            {isInView ? (
                <ProgressiveImage
                    src={src}
                    placeholder={placeholder}
                    alt={alt}
                    className={className}
                    {...props}
                />
            ) : (
                <div
                    className={className}
                    style={{
                        background: 'var(--surface-alt)',
                        aspectRatio: props.aspectRatio || 'auto',
                    }}
                />
            )}
        </div>
    );
};

/**
 * Background Image Component with Progressive Loading
 */
export const ProgressiveBackgroundImage = ({
    src,
    placeholder,
    className = '',
    style = {},
    children,
    ...props
}) => {
    const [bgImage, setBgImage] = useState(placeholder || '');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const img = new Image();

        img.onload = () => {
            setBgImage(src);
            setIsLoading(false);
        };

        img.onerror = () => {
            setIsLoading(false);
            console.error(`Failed to load background image: ${src}`);
        };

        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src]);

    return (
        <motion.div
            className={className}
            style={{
                ...style,
                backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                filter: isLoading ? 'blur(10px)' : 'blur(0px)',
            }}
            transition={{
                filter: { duration: 0.5 },
            }}
            {...props}
        >
            {children}
        </motion.div>
    );
};

/**
 * Generate a tiny placeholder image (LQIP - Low Quality Image Placeholder)
 * This creates a base64 encoded SVG with a gradient based on the image colors
 */
export const generatePlaceholder = (width = 40, height = 40, colors = ['#E85002', '#ff9357']) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
    </svg>
  `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export default ProgressiveImage;
