import React, { useState } from 'react';
import { AudioUploader } from '../components/AudioUploader';
import { NoteList } from '../components/NoteList';

export const UploadPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 700, color: '#ffffff' }}>
          Audio Notes Workspace
        </h1>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '1rem' }}>
          Upload meeting recordings or voice memos to automatically generate transcriptions & summaries.
        </p>
      </div>

      <AudioUploader onSuccess={handleUploadSuccess} />
      
      <NoteList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default UploadPage;
