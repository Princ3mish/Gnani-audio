import React, { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloud, AlertTriangle } from 'lucide-react';
import { uploadAudioNote } from '../api/notes';
import { ApiError } from '../api/client';

interface AudioUploaderProps {
  onSuccess?: () => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSelectedFileName(file.name);
    setIsUploading(true);

    try {
      await uploadAudioNote(file);
      setSelectedFileName(null);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          code: err.error_code,
          message: err.message,
        });
      } else if (err instanceof Error) {
        setError({
          code: 'UPLOAD_FAILED',
          message: err.message,
        });
      } else {
        setError({
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while uploading.',
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'rgba(124, 111, 224, 0.3)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: '2.75rem 1.5rem',
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(124, 111, 224, 0.08)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isDragging ? 'var(--shadow-glow)' : 'var(--shadow-soft)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4"
          onChange={onFileChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        {isUploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                border: '3px solid rgba(124, 111, 224, 0.2)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                Uploading audio note...
              </p>
              {selectedFileName && (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {selectedFileName}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(124, 111, 224, 0.12) 0%, rgba(236, 72, 153, 0.15) 100%)',
                border: '1px solid rgba(124, 111, 224, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '4px',
                boxShadow: '0 4px 12px rgba(124, 111, 224, 0.1)',
              }}
            >
              <UploadCloud size={30} strokeWidth={2} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Drag & drop your audio file here, or{' '}
                <span style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  browse
                </span>
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Supports MP3, WAV, M4A (Minimum 2 minutes duration, max 100 MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-failed-bg)',
            border: '1px solid var(--status-failed-border)',
            color: 'var(--status-failed-text)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)',
            animation: 'slideUp 0.25s ease',
          }}
        >
          <AlertTriangle size={18} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--status-failed-text)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.04em' }}>
              {error.code}:
            </strong>{' '}
            <span>{error.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
