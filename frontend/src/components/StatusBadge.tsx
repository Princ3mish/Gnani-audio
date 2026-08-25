import React from 'react';
import { Clock, Mic, Sparkles, CheckCircle2, AlertTriangle, UploadCloud } from 'lucide-react';
import type { NoteStatus } from '../types/note';

interface StatusBadgeProps {
  status: NoteStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (st: string) => {
    switch (st.toUpperCase()) {
      case 'COMPLETED':
        return {
          color: 'var(--status-completed-text)',
          bg: 'var(--status-completed-bg)',
          border: 'var(--status-completed-border)',
          label: 'Completed',
          icon: <CheckCircle2 size={13} strokeWidth={2.5} />,
        };
      case 'TRANSCRIBING':
        return {
          color: 'var(--status-transcribing-text)',
          bg: 'var(--status-transcribing-bg)',
          border: 'var(--status-transcribing-border)',
          label: 'Transcribing',
          icon: <Mic size={13} strokeWidth={2.5} />,
        };
      case 'SUMMARIZING':
        return {
          color: 'var(--status-summarizing-text)',
          bg: 'var(--status-summarizing-bg)',
          border: 'var(--status-summarizing-border)',
          label: 'Summarizing',
          icon: <Sparkles size={13} strokeWidth={2.5} />,
        };
      case 'QUEUED':
        return {
          color: 'var(--status-queued-text)',
          bg: 'var(--status-queued-bg)',
          border: 'var(--status-queued-border)',
          label: 'Queued',
          icon: <Clock size={13} strokeWidth={2.5} />,
        };
      case 'UPLOADING':
        return {
          color: '#2563EB',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          label: 'Uploading',
          icon: <UploadCloud size={13} strokeWidth={2.5} />,
        };
      case 'FAILED':
        return {
          color: 'var(--status-failed-text)',
          bg: 'var(--status-failed-bg)',
          border: 'var(--status-failed-border)',
          label: 'Failed',
          icon: <AlertTriangle size={13} strokeWidth={2.5} />,
        };
      default:
        return {
          color: 'var(--text-muted)',
          bg: '#F1F5F9',
          border: '#E2E8F0',
          label: st,
          icon: <Clock size={13} strokeWidth={2.5} />,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        letterSpacing: '0.02em',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
