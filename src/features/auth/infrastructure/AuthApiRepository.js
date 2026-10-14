import { AuthRepository } from '../domain/repositories/AuthRepository';
import { User } from '../domain/models/User';
import apiClient from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../services/api/endpoints';
import { storage } from '../../../utils/storage';

const TOKEN_KEY = 'bibliotech_token';
const USER_KEY = 'bibliotech_user';

export class AuthApiRepository extends AuthRepository {
  async login(credentials) {
    try {
      const payload = {
        email: credentials.email || credentials.correo || credentials.username || credentials.nombre_usuario,
        password: credentials.password,
      };

      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, payload);

      if (response && response.token) {
        storage.set(TOKEN_KEY, response.token);
        const userObj = new User(response.user);
        storage.set(USER_KEY, userObj);
        return { token: response.token, user: userObj };
      }
      return response;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);

      if (response && response.token) {
        storage.set(TOKEN_KEY, response.token);
        const userObj = new User(response.user);
        storage.set(USER_KEY, userObj);
        return { token: response.token, user: userObj };
      }
      return response;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignorar si el servidor está apagado
    } finally {
      storage.remove(TOKEN_KEY);
      storage.remove(USER_KEY);
    }
  }

  getCurrentUser() {
    const raw = storage.get(USER_KEY);
    if (!raw) return null;
    return new User(raw);
  }
}

export const defaultAuthRepository = new AuthApiRepository();
