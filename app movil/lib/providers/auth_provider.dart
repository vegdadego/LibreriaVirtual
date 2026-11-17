import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/api_client.dart';
import '../core/network/api_constants.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  User? _user;
  bool _isLoading = false;
  String? _errorMessage;

  User? get user => _user;
  bool get isAuthenticated => _user != null && _api.token != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    await _api.init();
    final prefs = await SharedPreferences.getInstance();
    final savedUserId = prefs.getString('user_id');
    final savedUsername = prefs.getString('user_name');
    final savedEmail = prefs.getString('user_email');
    final savedRole = prefs.getString('user_role');

    if (_api.token != null && savedUserId != null && savedUsername != null) {
      _user = User(
        id: savedUserId,
        nombreUsuario: savedUsername,
        correo: savedEmail ?? '',
        tipoUsuario: savedRole ?? 'lector',
      );
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.post(
        ApiConstants.login,
        body: {
          'email': identifier.trim(),
          'password': password,
        },
      );

      final token = res['token']?.toString();
      final userData = res['user'] as Map<String, dynamic>?;

      if (token != null && userData != null) {
        await _api.setToken(token);
        _user = User.fromJson(userData);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_id', _user!.id);
        await prefs.setString('user_name', _user!.nombreUsuario);
        await prefs.setString('user_email', _user!.correo);
        await prefs.setString('user_role', _user!.tipoUsuario);

        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw ApiException(statusCode: 400, message: 'Respuesta inválida del servidor');
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(
    String username,
    String email,
    String password,
    String role,
  ) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.post(
        ApiConstants.register,
        body: {
          'nombre_usuario': username.trim(),
          'correo': email.trim(),
          'password': password,
          'tipo_usuario': role,
        },
      );

      final token = res['token']?.toString();
      final userData = res['user'] as Map<String, dynamic>?;

      if (token != null && userData != null) {
        await _api.setToken(token);
        _user = User.fromJson(userData);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_id', _user!.id);
        await prefs.setString('user_name', _user!.nombreUsuario);
        await prefs.setString('user_email', _user!.correo);
        await prefs.setString('user_role', _user!.tipoUsuario);

        _isLoading = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _api.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_id');
    await prefs.remove('user_name');
    await prefs.remove('user_email');
    await prefs.remove('user_role');

    _user = null;
    notifyListeners();
  }
}
