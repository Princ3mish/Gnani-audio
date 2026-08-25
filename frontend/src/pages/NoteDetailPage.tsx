import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AudioNoteDetail, NoteStatus } from '../types/note';
import { getNoteDetail, getAudioUrl, retryTranscription, retrySummary } from '../api/notes';
import { StatusBadge } from '../components/StatusBadge';

const STAGES: { id: NoteStatus; label: string; icon: string }[] = [
  { id: 'UPLOADING', label: 'Uploading', icon: '📤' },
  { id: 'QUEUED', label: 'Queued', icon: '⏳' },
  { id: 'TRANSCRIBING', label: 'Transcribing', icon: '🎙️' },
  { id: 'SUMMARIZING', label: 'Summarizing', icon: '🤖' },
  { id: 'COMPLETED', label: 'Completed', icon: '✅' },
];

export const NoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<AudioNoteDetail | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const isPollingRef = useRef<boolean>(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDetail = useCallback(async (noteId: string) => {
    try {
      const data = await getNoteDetail(noteId);
      setNote(data);
      setError(null);
      return data;
    } catch (err: any) {
      console.error('Failed to fetch note detail:', err);
      setError(err?.message || 'Failed to load note details');
      return null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((noteId: string) => {
    stopPolling();
    isPollingRef.current = true;

    pollTimerRef.current = setInterval(async () => {
      if (!isPollingRef.current) return;
      const updated = await fetchDetail(noteId);
      if (updated && !['QUEUED', 'TRANSCRIBING', 'SUMMARIZING'].includes(updated.status)) {
        stopPolling();
      }
    }, 2500);
  }, [fetchDetail, stopPolling]);

  // Fetch audio playback URL when completed
  useEffect(() => {
    if (note && note.status === 'COMPLETED' && !audioUrl && id) {
      getAudioUrl(id)
        .then((res) => setAudioUrl(res.url))
        .catch((err) => console.warn('Failed to load audio playback URL:', err));
    }
  }, [note, audioUrl, id]);

  // Initial fetch and Polling effect
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetchDetail(id).then((initialNote) => {
      setLoading(false);

      if (!initialNote) return;

      const shouldPoll = ['QUEUED', 'TRANSCRIBING', 'SUMMARIZING'].includes(initialNote.status);
      if (shouldPoll) {
        startPolling(id);
      }
    });

    return () => {
      stopPolling();
    };
  }, [id, fetchDetail, startPolling, stopPolling]);

  const handleRetry = async () => {
    if (!id || !note) return;
    setRetrying(true);
    setRetryError(null);

    const hasTranscript = Boolean(note.transcript && note.transcript.trim().length > 0);

    try {
      if (hasTranscript) {
        await retrySummary(id);
      } else {
        await retryTranscription(id);
      }

      const newStatus: NoteStatus = hasTranscript ? 'SUMMARIZING' : 'QUEUED';
      setNote((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              error_code: null,
              error_message: null,
            }
          : null
      );

      // Immediately refetch and start polling loop
      await fetchDetail(id);
      startPolling(id);
    } catch (err: any) {
      console.error('Retry error:', err);
      setRetryError(err?.message || 'Failed to trigger retry operation.');
    } finally {
      setRetrying(false);
    }
  };

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

  const getActiveStageIndex = (status: NoteStatus): number => {
    switch (status) {
      case 'UPLOADING':
        return 0;
      case 'QUEUED':
        return 1;
      case 'TRANSCRIBING':
        return 2;
      case 'SUMMARIZING':
        return 3;
      case 'COMPLETED':
        return 4;
      case 'FAILED':
        return -1;
      default:
        return 0;
    }
  };

  const activeIndex = note ? getActiveStageIndex(note.status) : 0;
  const isProcessing = note && ['QUEUED', 'TRANSCRIBING', 'SUMMARIZING'].includes(note.status);
  const hasTranscript = note ? Boolean(note.transcript && note.transcript.trim().length > 0) : false;
  const retryBtnLabel = hasTranscript ? 'Retry Summarization' : 'Retry Transcription';

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '1.5rem 0' }}>
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
          ← Back to Notes List
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '14px',
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
              backdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '1.65rem', fontWeight: 700, color: '#f9fafb' }}>
                  {note.filename}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', color: '#9ca3af', fontSize: '0.9rem' }}>
                  <span>⏱️ Duration: {formatDuration(note.duration_seconds)}</span>
                  <span>•</span>
                  <span>📅 Created: {formatDate(note.created_at)}</span>
                  {isProcessing && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="pulsing-dot" /> Live processing...
                      </span>
                    </>
                  )}
                </div>
              </div>
              <StatusBadge status={note.status} />
            </div>

            {/* 5-Stage Horizontal Progress Indicator */}
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                {/* Connecting Progress Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '18px',
                    left: '5%',
                    right: '5%',
                    height: '3px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    zIndex: 0,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: note.status === 'FAILED' ? '#ef4444' : '#6366f1',
                      width: note.status === 'FAILED' ? '100%' : `${(Math.max(0, activeIndex) / (STAGES.length - 1)) * 100}%`,
                      transition: 'width 0.4s ease-in-out',
                    }}
                  />
                </div>

                {STAGES.map((stage, idx) => {
                  const isCompleted = activeIndex > idx || note.status === 'COMPLETED';
                  const isCurrent = activeIndex === idx && note.status !== 'FAILED';
                  const isFailed = note.status === 'FAILED';

                  let circleBg = 'rgba(31, 41, 55, 0.9)';
                  let circleBorder = '1px solid rgba(255, 255, 255, 0.2)';
                  let labelColor = '#6b7280';

                  if (isFailed) {
                    circleBg = 'rgba(239, 68, 68, 0.2)';
                    circleBorder = '2px solid #ef4444';
                    labelColor = '#f87171';
                  } else if (isCurrent) {
                    circleBg = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
                    circleBorder = '2px solid #818cf8';
                    labelColor = '#f3f4f6';
                  } else if (isCompleted) {
                    circleBg = '#312e81';
                    circleBorder = '2px solid #6366f1';
                    labelColor = '#c7d2fe';
                  }

                  return (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 1,
                        width: '70px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: circleBg,
                          border: circleBorder,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          boxShadow: isCurrent ? '0 0 12px rgba(99, 102, 241, 0.5)' : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {stage.icon}
                      </div>
                      <span
                        style={{
                          marginTop: '8px',
                          fontSize: '0.75rem',
                          fontWeight: isCurrent ? 600 : 400,
                          color: labelColor,
                          textAlign: 'center',
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FAILED ERROR BANNER WITH RETRY BUTTON */}
          {note.status === 'FAILED' && (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '16px',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#f87171', fontWeight: 600 }}>
                    Processing Failed
                  </h3>
                  {note.error_code && (
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#ef4444', fontFamily: 'monospace' }}>
                      Error Code: {note.error_code}
                    </p>
                  )}
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: '#fca5a5' }}>
                    {note.error_message || 'An error occurred during audio processing.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 18px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: retrying ? 'not-allowed' : 'pointer',
                        opacity: retrying ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {retrying ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '14px',
                              height: '14px',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                              borderTopColor: '#ffffff',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                          Triggering Retry...
                        </>
                      ) : (
                        <>
                          🔄 {retryBtnLabel}
                        </>
                      )}
                    </button>

                    {retryError && (
                      <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '4px' }}>
                        ⚠️ {retryError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROCESSING BANNER */}
          {isProcessing && (
            <div
              style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid rgba(129, 140, 248, 0.3)',
                  borderTopColor: '#818cf8',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', color: '#c7d2fe' }}>
                  Processing in Progress...
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>
                  Live status is updating automatically ({note.status.toLowerCase()}).
                </p>
              </div>
            </div>
          )}

          {/* CONTENT SECTION (WHEN COMPLETED OR IF TRANSCRIPT EXISTS) */}
          {(note.status === 'COMPLETED' || hasTranscript) && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Audio Playback Player */}
              {note.status === 'COMPLETED' && (
                <div
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                  }}
                >
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎵 Audio Playback
                  </h3>
                  {audioUrl ? (
                    <audio
                      controls
                      src={audioUrl}
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.875rem' }}>Loading playback audio link...</p>
                  )}
                </div>
              )}

              {/* AI Summary Block */}
              {note.summary && (
                <div
                  style={{
                    padding: '1.75rem',
                    backgroundColor: 'rgba(99, 102, 241, 0.04)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '16px',
                  }}
                >
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✨ AI Executive Summary
                  </h3>

                  {/* Summary Text */}
                  <p style={{ margin: '0 0 1.5rem 0', color: '#e0e7ff', fontSize: '1rem', lineHeight: '1.6' }}>
                    {note.summary.summary}
                  </p>

                  {/* Key Points */}
                  {note.summary.key_points && note.summary.key_points.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📌 Key Discussion Points
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '6px' }}>
                        {note.summary.key_points.map((pt, i) => (
                          <li key={i} style={{ color: '#d1d5db', fontSize: '0.925rem', lineHeight: '1.5' }}>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {note.summary.action_items && note.summary.action_items.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✅ Action Items
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '6px' }}>
                        {note.summary.action_items.map((item, i) => (
                          <li key={i} style={{ color: '#d1d5db', fontSize: '0.925rem', lineHeight: '1.5' }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Full Transcript Block */}
              {hasTranscript && (
                <div
                  style={{
                    padding: '1.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                  }}
                >
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📝 Full Speech Transcript
                  </h3>
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      color: '#d1d5db',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {note.transcript}
                  </div>
                </div>
              )}
            </div>
          )}
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
          <h3 style={{ margin: '0 0 8px 0', color: '#f3f4f6' }}>Note Not Found</h3>
          <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
            {error || `Audio note with ID '${id}' could not be located.`}
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
