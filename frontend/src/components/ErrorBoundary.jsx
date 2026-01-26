import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState(prevState => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1,
        }));

        // Send error to analytics/monitoring service if available
        try {
            if (window.dispatchEvent) {
                window.dispatchEvent(
                    new CustomEvent('analytics', {
                        detail: {
                            ev: 'error_boundary_triggered',
                            error: error.toString(),
                            componentStack: errorInfo.componentStack,
                            errorCount: this.state.errorCount + 1,
                        },
                    })
                );
            }
        } catch (e) {
            console.error('Failed to log error to analytics:', e);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            const { fallback, showDetails = false } = this.props;

            // Use custom fallback if provided
            if (fallback) {
                return typeof fallback === 'function'
                    ? fallback(this.state.error, this.handleReset)
                    : fallback;
            }

            // Default fallback UI
            return (
                <div
                    className="min-h-screen flex items-center justify-center p-4"
                    style={{ background: 'var(--surface)' }}
                >
                    <motion.div
                        className="max-w-md w-full p-8 rounded-2xl text-center"
                        style={{
                            background: 'var(--surface-alt)',
                            border: '2px solid var(--border)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Error Icon */}
                        <motion.div
                            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{
                                background: 'rgba(232, 80, 2, 0.1)',
                                color: 'var(--orange)',
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        >
                            <AlertTriangle size={32} />
                        </motion.div>

                        {/* Error Message */}
                        <h2
                            className="text-2xl font-bold mb-2 font-['Poppins']"
                            style={{ color: 'var(--text)' }}
                        >
                            Oops! Something went wrong
                        </h2>

                        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                            We encountered an unexpected error. Don't worry, your data is safe.
                            {this.state.errorCount > 2 && (
                                <span className="block mt-2 text-xs">
                                    This error has occurred {this.state.errorCount} times.
                                    Please try refreshing the page or contact support.
                                </span>
                            )}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <motion.button
                                onClick={this.handleReset}
                                className="px-6 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(90deg, var(--orange), #ff9357)',
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </motion.button>

                            <motion.button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                                style={{
                                    border: '2px solid var(--border)',
                                    color: 'var(--text)',
                                    background: 'var(--surface)',
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Home size={18} />
                                Go Home
                            </motion.button>
                        </div>

                        {/* Error Details (Development Only) */}
                        {(showDetails || process.env.NODE_ENV === 'development') && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary
                                    className="cursor-pointer text-xs font-semibold mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Error Details (for developers)
                                </summary>
                                <div
                                    className="p-3 rounded-lg text-xs font-mono overflow-auto max-h-40"
                                    style={{
                                        background: 'rgba(0,0,0,0.05)',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <div className="mb-2">
                                        <strong>Error:</strong> {this.state.error.toString()}
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Component Stack:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Support Link */}
                        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                            Need help?{' '}
                            <a
                                href="mailto:hello@shinelstudiosofficial.com"
                                className="font-semibold"
                                style={{ color: 'var(--orange)' }}
                            >
                                Contact Support
                            </a>
                        </p>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component to wrap any component with error boundary
 * @param {React.Component} Component - Component to wrap
 * @param {Object} errorBoundaryProps - Props to pass to ErrorBoundary
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
    return function WithErrorBoundaryComponent(props) {
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
};

export default ErrorBoundary;
