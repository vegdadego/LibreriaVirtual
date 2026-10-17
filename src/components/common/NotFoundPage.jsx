import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import PageState from './PageState';

/**
 * Pantalla para rutas que no existen.
 *
 * @returns {JSX.Element}
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <PageState
      icon={Compass}
      title="Página no encontrada"
      description="La dirección no existe o cambió de lugar."
      actionLabel="Ir al inicio"
      onAction={() => navigate('/')}
    />
  );
}
