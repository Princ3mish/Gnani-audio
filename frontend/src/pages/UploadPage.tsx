import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AudioUploader } from '../components/AudioUploader';
import { NoteList } from '../components/NoteList';

export const UploadPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '0.5rem 0 3rem 0' }}>
      <div style={{ marginBottom: '2.25rem', textAlign: 'left' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '10px',
          }}
        >
          <Sparkles size={13} strokeWidth={2.5} />
          AI Speech-to-Text & Insights
        </div>
        <h1
          style={{
            margin: '0 0 10px 0',
            fontSize: '2.25rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '-0.03em',
          }}
        >
          Audio Notes Workspace
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.5' }}>
          Upload meeting recordings or voice memos to automatically generate high-precision transcriptions and AI summaries.
        </p>
      </div>

      <AudioUploader onSuccess={handleUploadSuccess} />
      
      <NoteList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default UploadPage;
