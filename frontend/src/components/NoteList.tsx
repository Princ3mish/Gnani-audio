import React, { useEffect, useState, useCallback } from 'react';
import type { AudioNote } from '../types/note';
import { listNotes } from '../api/notes';
import { NoteListItem } from './NoteListItem';

interface NoteListProps {
  refreshTrigger?: number;
}

export const NoteList: React.FC<NoteListProps> = ({ refreshTrigger = 0 }) => {
  const [notes, setNotes] = useState<AudioNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotesList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audio notes list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotesList();
  }, [fetchNotesList, refreshTrigger]);

  if (loading) {
    return (
      <div style={{ padding: '2rem 0', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '12px',
          }}
        />
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>Loading audio notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#f87171',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Error loading notes</p>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>{error}</p>
        <button
          onClick={fetchNotesList}
          style={{
            marginTop: '12px',
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
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
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          color: '#9ca3af',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎧</div>
        <h3 style={{ margin: '0 0 4px 0', color: '#e5e7eb', fontWeight: 600 }}>No notes yet — upload one to get started</h3>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          Uploaded audio notes will be processed, transcribed, and summarized automatically.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#f9fafb' }}>
          Recent Notes ({notes.length})
        </h3>
        <button
          onClick={fetchNotesList}
          style={{
            background: 'none',
            border: 'none',
            color: '#818cf8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          🔄 Refresh
        </button>
      </div>
      <div>
        {notes.map((note) => (
          <NoteListItem key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
};
