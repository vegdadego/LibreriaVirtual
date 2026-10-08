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
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
      if (response && response.token) {
        storage.set(TOKEN_KEY, response.token);
        const userObj = new User(response.user || { email: credentials.email, rol: 'Bibliotecario' });
        storage.set(USER_KEY, userObj);
        return { token: response.token, user: userObj };
      }
      return response;
    } catch {
      // Fallback offline para desarrollo
      const demoUser = new User({
        id: 'usr_demo_1',
        nombre: 'Bibliotecario Principal',
        email: credentials.email || 'admin@bibliotech.com',
        rol: 'Administrador'
      });
      storage.set(TOKEN_KEY, 'demo_jwt_token_frontend');
      storage.set(USER_KEY, demoUser);
      return { token: 'demo_jwt_token_frontend', user: demoUser };
    }
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignorar si el backend no responde
    } finally {
      storage.remove(TOKEN_KEY);
      storage.remove(USER_KEY);
    }
  }

  getCurrentUser() {
    const raw = storage.get(USER_KEY);
    if (!raw) {
      return new User({
        id: 'usr_demo_1',
        nombre: 'Administrador Demo',
        email: 'admin@bibliotech.local',
        rol: 'Bibliotecario'
      });
    }
    return new User(raw);
  }
}

export const defaultAuthRepository = new AuthApiRepository();
