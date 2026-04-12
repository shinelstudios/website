import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing values
 * Useful for search inputs, window resize, etc.
 */
export const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Custom hook for throttling function calls
 * Useful for scroll handlers, resize handlers, etc.
 */
export const useThrottle = (callback, delay = 100) => {
    const lastRun = useRef(Date.now());

    return useCallback(
        (...args) => {
            const now = Date.now();
            if (now - lastRun.current >= delay) {
                callback(...args);
                lastRun.current = now;
            }
        },
        [callback, delay]
    );
};

/**
 * Custom hook for detecting element visibility with Intersection Observer
 */
export const useInView = (options = {}) => {
    const [isInView, setIsInView] = useState(false);
    const [hasBeenInView, setHasBeenInView] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const inView = entry.isIntersecting;
                setIsInView(inView);
                if (inView && !hasBeenInView) {
                    setHasBeenInView(true);
                }
            },
            {
                threshold: options.threshold || 0.1,
                rootMargin: options.rootMargin || '0px',
                ...options,
            }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [options.threshold, options.rootMargin, hasBeenInView]);

    return { ref, isInView, hasBeenInView };
};

/**
 * Custom hook for detecting reduced motion preference
 */
export const useReducedMotion = () => {
    return false;
};

/**
 * Custom hook for window size
 */
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
};

/**
 * Custom hook for scroll position
 */
export const useScrollPosition = () => {
    const [scrollPosition, setScrollPosition] = useState({
        x: 0,
        y: 0,
        scrollPercent: 0,
    });

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;
            const scrollHeight = document.documentElement.scrollHeight;
            const windowHeight = window.innerHeight;
            const scrollPercent = scrollY / (scrollHeight - windowHeight);

            setScrollPosition({
                x: scrollX,
                y: scrollY,
                scrollPercent: Math.min(Math.max(scrollPercent, 0), 1),
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial call

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return scrollPosition;
};

/**
 * Custom hook for local storage with JSON support
 */
export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.error(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, storedValue]
    );

    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
};

/**
 * Custom hook for media queries
 */
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e) => setMatches(e.matches);
        media.addEventListener('change', listener);

        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
};

/**
 * Custom hook for click outside detection
 */
export const useClickOutside = (callback) => {
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [callback]);

    return ref;
};

/**
 * Custom hook for keyboard shortcuts
 */
export const useKeyPress = (targetKey, callback) => {
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === targetKey) {
                callback(event);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [targetKey, callback]);
};

/**
 * Custom hook for async data fetching with loading and error states
 */
export const useAsync = (asyncFunction, immediate = true) => {
    const [status, setStatus] = useState('idle');
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const execute = useCallback(
        async (...params) => {
            setStatus('pending');
            setData(null);
            setError(null);

            try {
                const response = await asyncFunction(...params);
                setData(response);
                setStatus('success');
                return response;
            } catch (error) {
                setError(error);
                setStatus('error');
                console.error('useAsync error:', error);
                throw error;
            }
        },
        [asyncFunction]
    );

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return {
        execute,
        status,
        data,
        error,
        isIdle: status === 'idle',
        isPending: status === 'pending',
        isSuccess: status === 'success',
        isError: status === 'error',
    };
};

/**
 * Custom hook for previous value
 */
export const usePrevious = (value) => {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
};

/**
 * Custom hook for interval
 */
export const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

/**
 * Custom hook for timeout
 */
export const useTimeout = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay !== null) {
            const id = setTimeout(() => savedCallback.current(), delay);
            return () => clearTimeout(id);
        }
    }, [delay]);
};

/**
 * Custom hook for copy to clipboard
 */
export const useCopyToClipboard = () => {
    const [copiedText, setCopiedText] = useState(null);

    const copy = useCallback(async (text) => {
        if (!navigator?.clipboard) {
            console.warn('Clipboard not supported');
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            setCopiedText(null);
            return false;
        }
    }, []);

    return [copiedText, copy];
};

export default {
    useDebounce,
    useThrottle,
    useInView,
    useReducedMotion,
    useWindowSize,
    useScrollPosition,
    useLocalStorage,
    useMediaQuery,
    useClickOutside,
    useKeyPress,
    useAsync,
    usePrevious,
    useInterval,
    useTimeout,
    useCopyToClipboard,
};
