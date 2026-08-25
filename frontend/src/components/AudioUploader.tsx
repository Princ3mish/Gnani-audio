import React, { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}`,
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
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
                width: '40px',
                height: '40px',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#f3f4f6' }}>Uploading audio note...</p>
              {selectedFileName && (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>{selectedFileName}</p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                marginBottom: '4px',
              }}
            >
              🎙️
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#f9fafb' }}>
                Drag & drop your audio file here, or <span style={{ color: '#818cf8', textDecoration: 'underline' }}>browse</span>
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                Supports MP3, WAV, M4A (Minimum 2 minutes duration, max 100 MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
          <div>
            <strong style={{ color: '#ef4444', textTransform: 'lowercase' }}>{error.code}:</strong>{' '}
            {error.message}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
