import React, { useEffect, useState, useCallback } from 'react';
import { Headphones, RefreshCw, AlertCircle } from 'lucide-react';
import type { AudioNote } from '../types/note';
import { listNotes } from '../api/notes';
import { NoteListItem } from './NoteListItem';

interface NoteListProps {
  refreshTrigger?: number;
}

export const NoteList: React.FC<NoteListProps> = ({ refreshTrigger = 0 }) => {
  const [notes, setNotes] = useState<AudioNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotesList = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audio notes list.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotesList();
  }, [fetchNotesList, refreshTrigger]);

  if (loading) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            width: '36px',
            height: '36px',
            border: '3px solid rgba(124, 111, 224, 0.2)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '12px',
          }}
        />
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
          Loading audio notes...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--status-failed-bg)',
          border: '1px solid var(--status-failed-border)',
          color: 'var(--status-failed-text)',
          textAlign: 'center',
        }}
      >
        <AlertCircle size={28} style={{ margin: '0 auto 8px auto', display: 'block' }} />
        <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Error loading notes</p>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem' }}>{error}</p>
        <button
          onClick={() => fetchNotesList(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: 'var(--status-failed-text)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: '0 2px 6px rgba(190, 18, 60, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          border: '1px dashed rgba(124, 111, 224, 0.25)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <Headphones size={28} strokeWidth={2} />
        </div>
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>
          No notes yet — upload one to get started
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Uploaded audio notes will be processed, transcribed, and summarized automatically.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Recent Notes ({notes.length})
        </h3>
        <button
          onClick={() => fetchNotesList(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid var(--border-glass)',
            color: 'var(--primary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-soft)',
            transition: 'all 0.2s ease',
          }}
          disabled={isRefreshing}
        >
          <RefreshCw
            size={14}
            strokeWidth={2.5}
            style={{
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
          />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notes.map((note) => (
          <NoteListItem key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
};
