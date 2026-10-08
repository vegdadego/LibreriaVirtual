import React from 'react';
import { Calendar } from 'lucide-react';

export default function ChapterList({ chapters, onSelectChapter }) {
  if (!chapters || chapters.length === 0) {
    return <p style={{ color: 'var(--brand-text-muted)' }}>No hay capítulos disponibles.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {chapters.map((chap) => (
        <div
          key={chap.num}
          onClick={() => onSelectChapter(chap.num)}
          className="chapter-row"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="chapter-dot" />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: 'var(--brand-text)',
                  marginBottom: '2px',
                }}
              >
                {chap.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--brand-text-subtle)' }}>
                {chap.scanGroup}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--brand-text-muted)',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              padding: '0.35rem 0.65rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--brand-border)',
            }}
          >
            <Calendar size={13} style={{ color: 'var(--brand-text-subtle)' }} />
            <span>{chap.timeAgo}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
