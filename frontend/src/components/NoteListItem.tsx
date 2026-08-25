import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileAudio, Clock, Calendar, ChevronRight } from 'lucide-react';
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
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(124, 111, 224, 0.12)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '10px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(124, 111, 224, 0.04)',
      }}
      className="note-item-row"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(124, 111, 224, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)',
            border: '1px solid rgba(124, 111, 224, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            flexShrink: 0,
          }}
        >
          <FileAudio size={20} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-main)',
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
              gap: '14px',
              marginTop: '5px',
              fontSize: '0.825rem',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} strokeWidth={2} style={{ color: 'var(--primary)' }} />
              {formatDuration(note.duration_seconds)}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} strokeWidth={2} style={{ color: 'var(--secondary-pink)' }} />
              {formatDate(note.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
        <StatusBadge status={note.status} />
        <ChevronRight size={18} style={{ color: 'var(--text-subtle)' }} />
      </div>
    </div>
  );
};
