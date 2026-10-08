import { useState, useEffect, useCallback, useMemo } from 'react';
import { defaultUsuarioRepository } from '../../infrastructure/UsuarioApiRepository';
import { GetUsuariosUseCase } from '../../application/GetUsuariosUseCase';
import { CreateUsuarioUseCase } from '../../application/CreateUsuarioUseCase';
import { UpdateUsuarioUseCase } from '../../application/UpdateUsuarioUseCase';
import { DeleteUsuarioUseCase } from '../../application/DeleteUsuarioUseCase';

export function useUsuarios(repository = defaultUsuarioRepository) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Inyección de casos de uso
  const getUsuariosUseCase = useMemo(() => new GetUsuariosUseCase(repository), [repository]);
  const createUsuarioUseCase = useMemo(() => new CreateUsuarioUseCase(repository), [repository]);
  const updateUsuarioUseCase = useMemo(() => new UpdateUsuarioUseCase(repository), [repository]);
  const deleteUsuarioUseCase = useMemo(() => new DeleteUsuarioUseCase(repository), [repository]);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsuariosUseCase.execute();
      setUsuarios(data || []);
    } catch (err) {
      setError(err.message || 'Error al obtener usuarios');
    } finally {
      setLoading(false);
    }
  }, [getUsuariosUseCase]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const addUsuario = async (userData) => {
    try {
      const nuevo = await createUsuarioUseCase.execute(userData);
      setUsuarios((prev) => [nuevo, ...prev]);
      return nuevo;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateUsuario = async (id, userData) => {
    try {
      const actualizado = await updateUsuarioUseCase.execute(id, userData);
      setUsuarios((prev) => prev.map((u) => (u.id === id ? actualizado : u)));
      return actualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeUsuario = async (id) => {
    try {
      await deleteUsuarioUseCase.execute(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.nombre?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.documento?.toLowerCase().includes(query)
    );
  });

  return {
    usuarios: filteredUsuarios,
    totalCount: usuarios.length,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    addUsuario,
    updateUsuario,
    removeUsuario,
    fetchUsuarios
  };
}
