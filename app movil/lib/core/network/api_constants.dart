class ApiConstants {
  /// Conexión por cable USB (requiere activar depuración USB y ejecutar: adb reverse tcp:8000 tcp:8000):
  static const String usbBaseUrl = 'http://127.0.0.1:8000/api/v1';

  /// Conexión para Emulador de Android Studio:
  static const String emulatorBaseUrl = 'http://10.0.2.2:8000/api/v1';

  /// URL base predeterminada (por defecto cable USB local):
  static String get defaultBaseUrl => usbBaseUrl;

  // Endpoints principales
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';

  static const String books = '/books';
  static const String myBooks = '/books/mios';
  static const String categories = '/books/categorias';
  static const String stageBook = '/books/stage';
  static const String uploadBook = '/books/upload';

  static const String myState = '/me/estado';
  static const String mySaved = '/me/guardados';
  static const String myProgress = '/me/progreso';
  static const String myFolders = '/me/carpetas';
}
