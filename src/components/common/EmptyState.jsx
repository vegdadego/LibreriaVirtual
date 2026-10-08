import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  backendEndpoint,
}) {
  return (
    <div className="empty-state-box">
      {Icon && (
        <div className="empty-icon-wrap">
          <Icon size={32} />
        </div>
      )}
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      
      {backendEndpoint && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            Endpoint listo para conectar: <code className="code-pill">{backendEndpoint}</code>
          </span>
        </div>
      )}

      {actionLabel && (
        <Button onClick={onAction} icon={actionIcon} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
