import React from 'react';
import type { NoteStatus } from '../types/note';

interface StatusBadgeProps {
  status: NoteStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (st: string) => {
    switch (st.toUpperCase()) {
      case 'COMPLETED':
        return {
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: 'Completed',
        };
      case 'TRANSCRIBING':
        return {
          color: '#8b5cf6',
          bg: 'rgba(139, 92, 246, 0.12)',
          border: 'rgba(139, 92, 246, 0.3)',
          label: 'Transcribing',
        };
      case 'SUMMARIZING':
        return {
          color: '#06b6d4',
          bg: 'rgba(6, 182, 212, 0.12)',
          border: 'rgba(6, 182, 212, 0.3)',
          label: 'Summarizing',
        };
      case 'QUEUED':
        return {
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          label: 'Queued',
        };
      case 'UPLOADING':
        return {
          color: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.12)',
          border: 'rgba(59, 130, 246, 0.3)',
          label: 'Uploading',
        };
      case 'FAILED':
        return {
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          label: 'Failed',
        };
      default:
        return {
          color: '#9ca3af',
          bg: 'rgba(156, 163, 175, 0.12)',
          border: 'rgba(156, 163, 175, 0.3)',
          label: st,
        };
    }
  };

  const style = getStatusStyles(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.025em',
        color: style.color,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.color,
          boxShadow: `0 0 6px ${style.color}`,
        }}
      />
      {style.label}
    </span>
  );
};
