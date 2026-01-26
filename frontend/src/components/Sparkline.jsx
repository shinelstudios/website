import React, { useMemo } from 'react';

/**
 * Premium SVG Sparkline Component
 * Renders a smooth trend line with gradient fill.
 */
const Sparkline = ({
    data = [],
    width = 120,
    height = 40,
    color = "#E85002",
    fillOpacity = 0.2,
    strokeWidth = 2,
    className = ""
}) => {
    // If no data or flat line, render empty state
    if (!data || data.length < 2) {
        return <div className={`w-[${width}px] h-[${height}px] opacity-20 bg-white/5 rounded ${className}`} />;
    }

    const points = useMemo(() => {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1; // avoid division by zero

        const stepX = width / (data.length - 1);

        return data.map((val, i) => {
            const x = i * stepX;
            // Invert Y axis because SVG 0,0 is top-left
            const normalizedY = ((val - min) / range);
            const y = height - (normalizedY * (height - strokeWidth * 2)) - strokeWidth;
            return `${x},${y}`;
        }).join(' ');
    }, [data, width, height, strokeWidth]);

    const fillPath = useMemo(() => {
        const first = points.split(' ')[0];
        const last = points.split(' ').pop();
        return `${points} L ${width},${height} L 0,${height} Z`;
    }, [points, width, height]);

    return (
        <svg
            width={width}
            height={height}
            className={`overflow-visible ${className}`}
            viewBox={`0 0 ${width} ${height}`}
        >
            <defs>
                <linearGradient id={`spark-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Fill Area */}
            <path
                d={`M ${fillPath}`}
                fill={`url(#spark-gradient-${color})`}
                stroke="none"
            />

            {/* Stroke Line */}
            <path
                d={`M ${points}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* End Dot */}
            <circle
                cx={points.split(' ').pop().split(',')[0]}
                cy={points.split(' ').pop().split(',')[1]}
                r={strokeWidth * 1.5}
                fill={color}
            />
        </svg>
    );
};

export default Sparkline;
