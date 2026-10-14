import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { defaultAuthRepository } from '../../infrastructure/AuthApiRepository';
import { LoginUseCase } from '../../application/LoginUseCase';
import { RegisterUseCase } from '../../application/RegisterUseCase';
import { LogoutUseCase } from '../../application/LogoutUseCase';
import { GetCurrentUserUseCase } from '../../application/GetCurrentUserUseCase';

const AuthContext = createContext(null);

export function AuthProvider({ children, repository = defaultAuthRepository }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginUseCase = useMemo(() => new LoginUseCase(repository), [repository]);
  const registerUseCase = useMemo(() => new RegisterUseCase(repository), [repository]);
  const logoutUseCase = useMemo(() => new LogoutUseCase(repository), [repository]);
  const getCurrentUserUseCase = useMemo(() => new GetCurrentUserUseCase(repository), [repository]);

  useEffect(() => {
    try {
      const currentUser = getCurrentUserUseCase.execute();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUserUseCase]);

  const login = async (credentials) => {
    const response = await loginUseCase.execute(credentials);
    setUser(response.user);
    return response;
  };

  const register = async (userData) => {
    const response = await registerUseCase.execute(userData);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await logoutUseCase.execute();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
