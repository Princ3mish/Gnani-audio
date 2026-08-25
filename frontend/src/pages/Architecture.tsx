import { Layers } from 'lucide-react';

export default function Architecture() {
  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '1rem 0' }}>
      <div
        className="glass-card"
        style={{
          padding: '3rem 2rem',
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
          <Layers size={28} strokeWidth={2} />
        </div>
        <h1
          style={{
            margin: '0 0 10px 0',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          System Architecture
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Async pipeline architecture with Gnani 25s chunking, Celery background queue, and NVIDIA NIM LLM summarization.
        </p>
      </div>
    </div>
  );
}
