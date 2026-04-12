import React from 'react';

/**
 * Premium Shimmering Skeleton Loader
 * Used for building UI placeholders that feel high-end
 */
const Skeleton = ({ width, height, circle, className = "", style = {} }) => {
    return (
        <div
            className={`skeleton-shimmer bg-white/[0.03] overflow-hidden relative ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                ...style
            }}
        >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 skeleton-glow" />

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes skeleton-loading {
                    0% { transform: translate3d(-100%, 0, 0); }
                    100% { transform: translate3d(100%, 0, 0); }
                }
                @-webkit-keyframes skeleton-loading {
                    0% { -webkit-transform: translate3d(-100%, 0, 0); }
                    100% { -webkit-transform: translate3d(100%, 0, 0); }
                }
                .skeleton-shimmer {
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transform: translate3d(0,0,0);
                    -webkit-transform: translate3d(0,0,0);
                }
                .skeleton-glow {
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.03) 50%,
                        transparent 100%
                    );
                    animation: skeleton-loading 1.5s infinite;
                    -webkit-animation: skeleton-loading 1.5s infinite;
                }
            `}} />
        </div>
    );
};

export default Skeleton;
