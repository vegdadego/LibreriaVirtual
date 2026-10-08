import React, { useState } from 'react';

export default function CommentsSection({ comments, onAddComment }) {
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(inputText.trim());
      setInputText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--brand-cardBg)',
        border: '1px solid var(--brand-border)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-text)' }}>
        Comentarios de la Comunidad
      </h3>

      {/* Formulario para publicar comentario */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.85rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#000',
            flexShrink: 0,
          }}
        >
          U
        </div>

        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <textarea
            rows="2"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu comentario sobre este manhwa..."
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--brand-border)',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--brand-text)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div>
            <button
              type="submit"
              disabled={submitting || !inputText.trim()}
              className="gold-gradient"
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                opacity: !inputText.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? 'Publicando...' : 'Comentar'}
            </button>
          </div>
        </div>
      </form>

      {/* Lista de comentarios */}
      <div
        style={{
          borderTop: '1px solid var(--brand-border)',
          paddingTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {comments.map((comment) => (
          <div key={comment.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              {comment.avatarInitial || comment.author?.charAt(0) || 'U'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--brand-text)' }}>{comment.author}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--brand-text-subtle)' }}>
                  {comment.timeAgo}
                </span>
              </div>
              <p style={{ color: 'var(--brand-text-muted)', lineHeight: 1.45 }}>{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
