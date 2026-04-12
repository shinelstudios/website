import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import MetaTags from './MetaTags';

const NotFound = () => {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 relative overflow-hidden bg-white dark:bg-black">
            <MetaTags
                title="Page Not Found"
                description="The page you are looking for does not exist."
                noIndex={true}
            />

            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--orange)] opacity-5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 flex justify-center"
                >
                    <div className="w-24 h-24 rounded-3xl bg-[rgba(232,80,2,0.1)] flex items-center justify-center text-[var(--orange)]">
                        <Search size={48} strokeWidth={1.5} />
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-6xl font-bold font-['Poppins'] mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--text)] to-[var(--text-muted)]"
                >
                    404
                </motion.h1>

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-xl font-semibold mb-3"
                    style={{ color: 'var(--text)' }}
                >
                    Lost in the Studio?
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mb-10"
                    style={{ color: 'var(--text-muted)' }}
                >
                    The page you're looking for was moved, renamed, or perhaps never existed in the first place.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link
                        to="/"
                        className="btn-brand w-full sm:w-auto"
                    >
                        <Home size={18} />
                        Back to Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="btn-ghost w-full sm:w-auto"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
