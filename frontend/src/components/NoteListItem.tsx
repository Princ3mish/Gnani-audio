import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AudioNote } from '../types/note';
import { StatusBadge } from './StatusBadge';

interface NoteListItemProps {
  note: AudioNote;
}

export const NoteListItem: React.FC<NoteListItemProps> = ({ note }) => {
  const navigate = useNavigate();

  const formatDuration = (seconds: number | null): string => {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      className="note-item-row"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
          }}
        >
          🎵
        </div>
        <div style={{ minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: '#f3f4f6',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {note.filename}
          </h4>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '4px',
              fontSize: '0.825rem',
              color: '#9ca3af',
            }}
          >
            <span>⏱️ {formatDuration(note.duration_seconds)}</span>
            <span>•</span>
            <span>📅 {formatDate(note.created_at)}</span>
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginLeft: '16px' }}>
        <StatusBadge status={note.status} />
      </div>
    </div>
  );
};
