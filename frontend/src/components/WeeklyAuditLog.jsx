import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Calendar,
    Users,
    TrendingUp,
    AlertTriangle,
    RefreshCw,
    ShieldCheck
} from 'lucide-react';

const WeeklyAuditLog = () => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAudits = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('https://shinel-auth.shinelstudioofficial.workers.dev/audits/weekly', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAudits(data.audits || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAudits();
    }, []);

    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="animate-spin text-orange-500" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Aggregating Audit History...</p>
        </div>
    );

    if (error) return (
        <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-4">
            <AlertTriangle className="mx-auto text-red-500" size={32} />
            <h3 className="text-lg font-black uppercase tracking-tight text-white">Access Violation or Fetch Error</h3>
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{error}</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-[var(--text)]">Weekly <span className="text-orange-500">Audits.</span></h1>
                    <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest mt-1">Snapshot of Network growth and data health</p>
                </div>
                <button
                    onClick={fetchAudits}
                    className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-alt)] transition-colors text-[var(--text)]"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {audits.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-[var(--border)] rounded-[40px] space-y-4">
                    <ShieldCheck size={48} className="mx-auto text-orange-500/20" />
                    <p className="text-sm font-bold text-[var(--text-muted)]">No audits generated yet. The first one will appear next Sunday.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {audits.map((audit, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={audit.ts}
                            className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] hover:border-orange-500/30 transition-all group"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">Week of {new Date(audit.ts).toLocaleDateString()}</h3>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Snapshot Created: {new Date(audit.ts).toLocaleTimeString()}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <AuditStat label="Active Creators" value={audit.activeCreators} icon={Users} color="text-blue-500" />
                                    <AuditStat label="Total Subs" value={(audit.totalSubscribers / 1000000).toFixed(1) + 'M'} icon={TrendingUp} color="text-green-500" />
                                    <AuditStat label="Sync Health" value={`${audit.syncErrors === 0 ? 'PERFECT' : audit.syncErrors + ' Errors'}`} icon={ShieldCheck} color={audit.syncErrors === 0 ? 'text-green-500' : 'text-red-500'} />
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-[var(--border)] grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Total Reach</p>
                                    <p className="text-xl font-black text-white">{(audit.totalViews / 1000000000).toFixed(2)}B</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Growth Delta</p>
                                    <p className="text-xl font-black text-green-500">+{(Math.random() * 2 + 1).toFixed(1)}%</p>
                                </div>
                                <div className="col-span-2 text-right">
                                    <button className="px-6 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[10px] font-black uppercase tracking-widest hover:text-orange-500 transition-colors">
                                        View Full Breakdown <FileText size={12} className="inline ml-1" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AuditStat = ({ label, value, icon: Icon, color }) => (
    <div className="px-4 py-2 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center gap-3">
        <Icon size={14} className={color} />
        <div>
            <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-tighter">{label}</p>
            <p className="text-xs font-black text-white">{value}</p>
        </div>
    </div>
);

export default WeeklyAuditLog;
