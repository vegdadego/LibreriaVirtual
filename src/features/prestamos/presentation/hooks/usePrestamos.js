import { useState, useEffect, useCallback, useMemo } from 'react';
import { defaultPrestamoRepository } from '../../infrastructure/PrestamoApiRepository';
import { GetPrestamosUseCase } from '../../application/GetPrestamosUseCase';
import { RegistrarPrestamoUseCase } from '../../application/RegistrarPrestamoUseCase';
import { DevolverLibroUseCase } from '../../application/DevolverLibroUseCase';

export function usePrestamos(repository = defaultPrestamoRepository) {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Inyección de casos de uso
  const getPrestamosUseCase = useMemo(() => new GetPrestamosUseCase(repository), [repository]);
  const registrarPrestamoUseCase = useMemo(() => new RegistrarPrestamoUseCase(repository), [repository]);
  const devolverLibroUseCase = useMemo(() => new DevolverLibroUseCase(repository), [repository]);

  const fetchPrestamos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrestamosUseCase.execute();
      setPrestamos(data || []);
    } catch (err) {
      setError(err.message || 'Error al obtener préstamos');
    } finally {
      setLoading(false);
    }
  }, [getPrestamosUseCase]);

  useEffect(() => {
    fetchPrestamos();
  }, [fetchPrestamos]);

  const registrarPrestamo = async (prestamoData) => {
    try {
      const nuevo = await registrarPrestamoUseCase.execute(prestamoData);
      setPrestamos((prev) => [nuevo, ...prev]);
      return nuevo;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const devolverLibro = async (id) => {
    try {
      await devolverLibroUseCase.execute(id);
      setPrestamos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, estado: 'DEVUELTO', fechaDevolucionReal: new Date().toISOString().split('T')[0] } : p
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const filteredPrestamos = prestamos.filter((p) => {
    if (filterEstado === 'TODOS') return true;
    return p.estado === filterEstado;
  });

  return {
    prestamos: filteredPrestamos,
    totalCount: prestamos.length,
    activosCount: prestamos.filter((p) => p.estado === 'ACTIVO').length,
    vencidosCount: prestamos.filter((p) => p.estado === 'VENCIDO').length,
    loading,
    error,
    filterEstado,
    setFilterEstado,
    registrarPrestamo,
    devolverLibro,
    fetchPrestamos
  };
}
