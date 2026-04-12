// src/components/LazyImage.jsx
import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component
 * 
 * A performance-optimized image component with:
 * - Native lazy loading with IntersectionObserver fallback
 * - Blur-up placeholder effect
 * - Proper error handling
 * - Layout shift prevention
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text (required for accessibility)
 * @param {string} className - Additional CSS classes
 * @param {number} width - Image width (prevents layout shift)
 * @param {number} height - Image height (prevents layout shift)
 * @param {string} placeholder - Placeholder image (optional, defaults to blur)
 * @param {function} onLoad - Callback when image loads
 * @param {function} onError - Callback when image fails to load
 */
export default function LazyImage({
    src,
    alt,
    className = '',
    width,
    height,
    placeholder,
    onLoad,
    onError,
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);

    // IntersectionObserver for lazy loading fallback
    useEffect(() => {
        if (!imgRef.current) return;

        // Check if native lazy loading is supported
        if ('loading' in HTMLImageElement.prototype) {
            setIsInView(true);
            return;
        }

        // Fallback to IntersectionObserver for older browsers
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '50px', // Start loading 50px before entering viewport
            }
        );

        observer.observe(imgRef.current);

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, []);

    const handleLoad = (e) => {
        setIsLoaded(true);
        if (onLoad) onLoad(e);
    };

    const handleError = (e) => {
        setHasError(true);
        if (onError) onError(e);
    };

    // Aspect ratio box to prevent layout shift
    const aspectRatio = width && height ? (height / width) * 100 : null;

    return (
        <div
            ref={imgRef}
            className={`lazy-image-wrapper ${className}`}
            style={{
                position: 'relative',
                overflow: 'hidden',
                ...(aspectRatio && {
                    paddingBottom: `${aspectRatio}%`,
                    height: 0,
                }),
            }}
        >
            {/* Placeholder */}
            {!isLoaded && !hasError && (
                <div
                    className="lazy-image-placeholder"
                    style={{
                        position: aspectRatio ? 'absolute' : 'relative',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: aspectRatio ? '100%' : height || 'auto',
                        background: placeholder || 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                    }}
                />
            )}

            {/* Actual Image */}
            {(isInView || 'loading' in HTMLImageElement.prototype) && !hasError && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    width={width}
                    height={height}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        position: aspectRatio ? 'absolute' : 'relative',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: aspectRatio ? '100%' : 'auto',
                        objectFit: 'cover',
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out',
                    }}
                    {...props}
                />
            )}

            {/* Error State */}
            {hasError && (
                <div
                    className="lazy-image-error"
                    style={{
                        position: aspectRatio ? 'absolute' : 'relative',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: aspectRatio ? '100%' : height || 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f5f5',
                        color: '#999',
                        fontSize: '14px',
                    }}
                >
                    <span>Failed to load image</span>
                </div>
            )}

            <style jsx>{`
                @keyframes shimmer {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
                /* Webkit specific fix for shimmers */
                .lazy-image-placeholder {
                    -webkit-mask-image: linear-gradient(90deg, transparent, white, transparent);
                    mask-image: linear-gradient(90deg, transparent, white, transparent);
                }
            `}</style>
        </div>
    );
}
