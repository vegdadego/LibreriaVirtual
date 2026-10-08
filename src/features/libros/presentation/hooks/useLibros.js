import { useState, useEffect, useCallback, useMemo } from 'react';
import { defaultLibroRepository } from '../../infrastructure/LibroApiRepository';
import { GetLibrosUseCase } from '../../application/GetLibrosUseCase';
import { CreateLibroUseCase } from '../../application/CreateLibroUseCase';
import { UpdateLibroUseCase } from '../../application/UpdateLibroUseCase';
import { DeleteLibroUseCase } from '../../application/DeleteLibroUseCase';

export function useLibros(repository = defaultLibroRepository) {
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todas');

  // Inyección de dependencias de Casos de Uso
  const getLibrosUseCase = useMemo(() => new GetLibrosUseCase(repository), [repository]);
  const createLibroUseCase = useMemo(() => new CreateLibroUseCase(repository), [repository]);
  const updateLibroUseCase = useMemo(() => new UpdateLibroUseCase(repository), [repository]);
  const deleteLibroUseCase = useMemo(() => new DeleteLibroUseCase(repository), [repository]);

  const fetchLibros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLibrosUseCase.execute();
      setLibros(data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar libros');
    } finally {
      setLoading(false);
    }
  }, [getLibrosUseCase]);

  useEffect(() => {
    fetchLibros();
  }, [fetchLibros]);

  const addLibro = async (libroData) => {
    try {
      const nuevo = await createLibroUseCase.execute(libroData);
      setLibros((prev) => [nuevo, ...prev]);
      return nuevo;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateLibro = async (id, libroData) => {
    try {
      const actualizado = await updateLibroUseCase.execute(id, libroData);
      setLibros((prev) => prev.map((l) => (l.id === id ? actualizado : l)));
      return actualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeLibro = async (id) => {
    try {
      await deleteLibroUseCase.execute(id);
      setLibros((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const filteredLibros = libros.filter((libro) => {
    const matchesSearch =
      libro.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      libro.autor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      libro.isbn?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategoria =
      selectedCategoria === 'Todas' || libro.categoria === selectedCategoria;

    return matchesSearch && matchesCategoria;
  });

  return {
    libros: filteredLibros,
    totalCount: libros.length,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategoria,
    setSelectedCategoria,
    categorias: repository.getCategorias ? repository.getCategorias() : ['Todas'],
    fetchLibros,
    addLibro,
    updateLibro,
    removeLibro
  };
}
