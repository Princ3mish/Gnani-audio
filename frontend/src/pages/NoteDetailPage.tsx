import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Calendar,
  Volume2,
  Sparkles,
  Pin,
  CheckSquare,
  FileText,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  UploadCloud,
  Mic,
  CheckCircle2,
} from 'lucide-react';
import type { AudioNoteDetail, NoteStatus } from '../types/note';
import { getNoteDetail, getAudioUrl, retryTranscription, retrySummary } from '../api/notes';
import { StatusBadge } from '../components/StatusBadge';

const STAGES: { id: NoteStatus; label: string; icon: (size: number) => React.ReactNode }[] = [
  { id: 'UPLOADING', label: 'Uploading', icon: (s) => <UploadCloud size={s} strokeWidth={2.2} /> },
  { id: 'QUEUED', label: 'Queued', icon: (s) => <Clock size={s} strokeWidth={2.2} /> },
  { id: 'TRANSCRIBING', label: 'Transcribing', icon: (s) => <Mic size={s} strokeWidth={2.2} /> },
  { id: 'SUMMARIZING', label: 'Summarizing', icon: (s) => <Sparkles size={s} strokeWidth={2.2} /> },
  { id: 'COMPLETED', label: 'Completed', icon: (s) => <CheckCircle2 size={s} strokeWidth={2.2} /> },
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
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '0.5rem 0 3rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--primary)',
            textDecoration: 'none',
            fontSize: '0.925rem',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-soft)',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Back to Notes List
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '3px solid rgba(124, 111, 224, 0.2)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '14px',
            }}
          />
          <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>Loading note details...</p>
        </div>
      ) : note ? (
        <div>
          {/* Header Card */}
          <div
            className="glass-card"
            style={{
              padding: '1.75rem 2rem',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 'var(--radius-xl)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h1
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {note.filename}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={14} style={{ color: 'var(--primary)' }} />
                    Duration: {formatDuration(note.duration_seconds)}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={14} style={{ color: 'var(--secondary-pink)' }} />
                    Created: {formatDate(note.created_at)}
                  </span>
                  {isProcessing && (
                    <>
                      <span>•</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="pulsing-dot" /> Live processing...
                      </span>
                    </>
                  )}
                </div>
              </div>
              <StatusBadge status={note.status} />
            </div>

            {/* 5-Stage Horizontal Progress Stepper */}
            <div style={{ marginTop: '2.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                {/* Connecting Progress Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '19px',
                    left: '5%',
                    right: '5%',
                    height: '4px',
                    backgroundColor: 'rgba(124, 111, 224, 0.12)',
                    borderRadius: '9999px',
                    zIndex: 0,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: note.status === 'FAILED' ? 'var(--status-failed-text)' : 'var(--primary-gradient)',
                      width: note.status === 'FAILED' ? '100%' : `${(Math.max(0, activeIndex) / (STAGES.length - 1)) * 100}%`,
                      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                {STAGES.map((stage, idx) => {
                  const isCompleted = activeIndex > idx || note.status === 'COMPLETED';
                  const isCurrent = activeIndex === idx && note.status !== 'FAILED';
                  const isFailed = note.status === 'FAILED';

                  let circleBg = '#FFFFFF';
                  let circleBorder = '2px solid #CBD5E1';
                  let circleColor = '#94A3B8';
                  let labelColor = 'var(--text-subtle)';
                  let circleShadow = 'none';

                  if (isFailed) {
                    circleBg = 'var(--status-failed-bg)';
                    circleBorder = '2px solid var(--status-failed-border)';
                    circleColor = 'var(--status-failed-text)';
                    labelColor = 'var(--status-failed-text)';
                  } else if (isCurrent) {
                    circleBg = 'var(--primary-gradient)';
                    circleBorder = '2px solid #FFFFFF';
                    circleColor = '#FFFFFF';
                    labelColor = 'var(--primary)';
                    circleShadow = '0 0 16px rgba(124, 111, 224, 0.45)';
                  } else if (isCompleted) {
                    circleBg = 'var(--primary)';
                    circleBorder = '2px solid var(--primary)';
                    circleColor = '#FFFFFF';
                    labelColor = 'var(--text-main)';
                  }

                  return (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 1,
                        width: '74px',
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: circleBg,
                          border: circleBorder,
                          color: circleColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: circleShadow,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {stage.icon(17)}
                      </div>
                      <span
                        style={{
                          marginTop: '8px',
                          fontSize: '0.75rem',
                          fontWeight: isCurrent ? 700 : 500,
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
              className="glass-card"
              style={{
                padding: '1.75rem',
                backgroundColor: 'var(--status-failed-bg)',
                border: '1px solid var(--status-failed-border)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--status-failed-text)',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--status-failed-text)', fontWeight: 700 }}>
                    Processing Failed
                  </h3>
                  {note.error_code && (
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: 'var(--status-failed-text)', fontFamily: 'monospace', fontWeight: 600 }}>
                      Error Code: {note.error_code}
                    </p>
                  )}
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
                    {note.error_message || 'An error occurred during audio processing.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '9px 20px',
                        backgroundColor: 'var(--status-failed-text)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: retrying ? 'not-allowed' : 'pointer',
                        opacity: retrying ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(190, 18, 60, 0.25)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {retrying ? (
                        <>
                          <div
                            style={{
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
                          <RefreshCw size={15} strokeWidth={2.5} />
                          {retryBtnLabel}
                        </>
                      )}
                    </button>

                    {retryError && (
                      <div style={{ color: 'var(--status-failed-text)', fontSize: '0.85rem', marginTop: '4px', fontWeight: 500 }}>
                        {retryError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IN-PROGRESS LIVE-FEELING DISPLAY (TRANSCRIBING / SUMMARIZING / QUEUED) */}
          {isProcessing && (
            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div
                className="glass-card"
                style={{
                  padding: '1.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(124, 111, 224, 0.25)',
                  borderRadius: 'var(--radius-xl)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--primary-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    {note.status === 'TRANSCRIBING' ? (
                      <Mic size={20} strokeWidth={2.5} />
                    ) : note.status === 'SUMMARIZING' ? (
                      <Sparkles size={20} strokeWidth={2.5} />
                    ) : (
                      <Clock size={20} strokeWidth={2.5} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {note.status === 'TRANSCRIBING'
                        ? 'Transcribing Audio in Progress...'
                        : note.status === 'SUMMARIZING'
                        ? 'Generating AI Summary & Action Items...'
                        : 'Audio Note Queued for Processing...'}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {note.status === 'TRANSCRIBING'
                        ? 'Applying Gnani 25s multi-chunk speech recognition pipeline.'
                        : note.status === 'SUMMARIZING'
                        ? 'Extracting executive summary, key discussion points, and action items.'
                        : 'Waiting for worker process to initiate speech transcription.'}
                    </p>
                  </div>
                </div>

                {/* Shimmer pulse placeholder bars */}
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div className="shimmer-loader" style={{ height: '18px', width: '92%' }} />
                  <div className="shimmer-loader" style={{ height: '18px', width: '100%' }} />
                  <div className="shimmer-loader" style={{ height: '18px', width: '75%' }} />
                </div>
              </div>
            </div>
          )}

          {/* CONTENT SECTION (WHEN COMPLETED OR IF TRANSCRIPT EXISTS) */}
          {(note.status === 'COMPLETED' || hasTranscript) && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Audio Playback Player */}
              {note.status === 'COMPLETED' && (
                <div
                  className="glass-card"
                  style={{
                    padding: '1.5rem 1.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '1.1rem',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                    }}
                  >
                    <Volume2 size={20} style={{ color: 'var(--primary)' }} />
                    Audio Playback
                  </h3>
                  {audioUrl ? (
                    <audio
                      controls
                      src={audioUrl}
                      style={{
                        width: '100%',
                        borderRadius: 'var(--radius-sm)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Loading playback audio link...
                    </p>
                  )}
                </div>
              )}

              {/* AI Summary Block */}
              {note.summary && (
                <div
                  className="glass-card"
                  style={{
                    padding: '1.85rem 2rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(236, 72, 153, 0.25)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 6px 24px -2px rgba(236, 72, 153, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--pink-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                      }}
                    >
                      <Sparkles size={18} strokeWidth={2.5} />
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      AI Executive Summary
                    </h3>
                  </div>

                  {/* Summary Text */}
                  <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '1.025rem', lineHeight: '1.65' }}>
                    {note.summary.summary}
                  </p>

                  {/* Key Points */}
                  {note.summary.key_points && note.summary.key_points.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(124, 111, 224, 0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124, 111, 224, 0.12)' }}>
                      <h4
                        style={{
                          margin: '0 0 10px 0',
                          fontSize: '0.85rem',
                          color: 'var(--primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Pin size={15} strokeWidth={2.5} />
                        Key Discussion Points
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '8px' }}>
                        {note.summary.key_points.map((pt, i) => (
                          <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.5' }}>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {note.summary.action_items && note.summary.action_items.length > 0 && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                      <h4
                        style={{
                          margin: '0 0 10px 0',
                          fontSize: '0.85rem',
                          color: '#059669',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckSquare size={15} strokeWidth={2.5} />
                        Action Items
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '8px' }}>
                        {note.summary.action_items.map((item, i) => (
                          <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.5' }}>
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
                  className="glass-card"
                  style={{
                    padding: '1.75rem 2rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderRadius: 'var(--radius-xl)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                      }}
                    >
                      <FileText size={18} strokeWidth={2.2} />
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                      }}
                    >
                      Full Speech Transcript
                    </h3>
                  </div>
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #E2E8F0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.95rem',
                      lineHeight: '1.7',
                      maxHeight: '320px',
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
          className="glass-card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 'var(--radius-xl)',
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
            <HelpCircle size={30} strokeWidth={2} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.2rem' }}>
            Note Not Found
          </h3>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            {error || `Audio note with ID '${id}' could not be located.`}
          </p>
          <Link
            to="/"
            style={{
              padding: '9px 20px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(124, 111, 224, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={16} />
            Return to Upload & Notes List
          </Link>
        </div>
      )}
    </div>
  );
};

export default NoteDetailPage;
