import React from 'react';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--brand-border)',
        backgroundColor: 'var(--brand-darkBg)',
        marginTop: 'auto',
        padding: '2.5rem 1rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--brand-text-subtle)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontWeight: 700, color: 'var(--brand-text-muted)' }}>

        </p>
        <p>
          Plataforma para lectura de cómics, manhwas y mangas online con la mejor velocidad de carga y soporte multiplataforma.
        </p>
      </div>
    </footer>
  );
}
