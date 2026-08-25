import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AudioNote } from '../types/note';
import { getNote } from '../api/notes';
import { StatusBadge } from '../components/StatusBadge';

export const NoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<AudioNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    getNote(id)
      .then((data) => {
        setNote(data);
      })
      .catch((err) => {
        console.warn('Note detail call notice:', err);
        setError('Note details endpoint not fully available yet on backend.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const formatDuration = (seconds: number | null): string => {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#818cf8',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          ← Back to Notes
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '12px',
            }}
          />
          <p style={{ color: '#9ca3af', margin: 0 }}>Loading note details...</p>
        </div>
      ) : note ? (
        <div>
          {/* Header Card */}
          <div
            style={{
              padding: '1.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '1.6rem', fontWeight: 700, color: '#f9fafb' }}>
                  {note.filename}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#9ca3af', fontSize: '0.9rem' }}>
                  <span>⏱️ Duration: {formatDuration(note.duration_seconds)}</span>
                  <span>•</span>
                  <span>📅 Created: {formatDate(note.created_at)}</span>
                </div>
              </div>
              <StatusBadge status={note.status} />
            </div>
          </div>

          {/* Placeholders for Player, Transcript, and Summary (Section 8) */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Audio Player Placeholder */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#e5e7eb' }}>🎵 Audio Playback</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Audio player controls will be rendered here upon transcription pipeline integration.
              </p>
            </div>

            {/* Transcript Placeholder */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#e5e7eb' }}>📝 Transcript</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Transcript text placeholder — pending background processing worker completion.
              </p>
            </div>

            {/* Summary Placeholder */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#e5e7eb' }}>✨ AI Summary</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                AI-generated executive summary and key action items will appear here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>ℹ️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#f3f4f6' }}>Note ID: {id}</h3>
          <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
            {error || 'Single note details API endpoint not available yet.'}
          </p>
          <Link
            to="/"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Return to Upload & Notes List
          </Link>
        </div>
      )}
    </div>
  );
};

export default NoteDetailPage;
