import React from 'react';
import { ExternalLink, FolderOpen, AlertTriangle } from 'lucide-react';

export default function DriveEmbed({ folderId = "1a2b3c4d5e" }) {
    // In a real app, folderId would come from the user's project data

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                <FolderOpen size={32} />
            </div>

            <h3 className="text-2xl font-bold mb-4">Access Project Assets</h3>
            <p className="text-[var(--text-muted)] mb-8 max-w-lg mx-auto leading-relaxed">
                We use Google Drive for secure file sharing. You can upload raw footage and download final deliverables directly here.
            </p>

            <div className="p-4 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)] mb-8 flex items-start gap-3 text-left max-w-lg mx-auto">
                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-sm mb-1">Privacy Notice</h4>
                    <p className="text-xs text-[var(--text-muted)]">Only you and your assigned editor have access to this folder. All files are encrypted at rest by Google.</p>
                </div>
            </div>

            <a
                href={`https://drive.google.com/drive/u/0/folders/${folderId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20"
            >
                Open Google Drive <ExternalLink size={18} />
            </a>
        </div>
    );
}
