import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_constants.dart';

class ApiException implements Exception {
  final int statusCode;
  final String? code;
  final String message;

  ApiException({
    required this.statusCode,
    this.code,
    required this.message,
  });

  @override
  String toString() => message;
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  String _baseUrl = ApiConstants.defaultBaseUrl;
  String? _token;

  String get baseUrl => _baseUrl;
  String? get token => _token;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('api_base_url');
    // Si no hay URL guardada o contiene la IP de Wi-Fi anterior, se establece la conexión por cable USB (127.0.0.1)
    if (savedUrl != null && !savedUrl.contains('192.168.1.81')) {
      _baseUrl = savedUrl;
    } else {
      _baseUrl = ApiConstants.defaultBaseUrl;
      await prefs.setString('api_base_url', _baseUrl);
    }
    _token = prefs.getString('auth_token');
  }

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', url);
  }

  Future<void> setToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token != null) {
      await prefs.setString('auth_token', token);
    } else {
      await prefs.remove('auth_token');
    }
  }

  Map<String, String> _headers([Map<String, String>? extra]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    if (extra != null) {
      headers.addAll(extra);
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParameters]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$_baseUrl$cleanPath';
    final uri = Uri.parse(fullUrl);
    if (queryParameters != null && queryParameters.isNotEmpty) {
      final stringParams = queryParameters.map(
        (key, value) => MapEntry(key, value?.toString() ?? ''),
      )..removeWhere((key, value) => value.isEmpty);
      return uri.replace(queryParameters: stringParams);
    }
    return uri;
  }

  dynamic _processResponse(http.Response response) {
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      body = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    String message = 'Ocurrió un error inesperado (${response.statusCode})';
    String? code;

    if (body is Map) {
      if (body['message'] != null) {
        message = body['message'].toString();
      } else if (body['detail'] != null) {
        message = body['detail'].toString();
      }
      code = body['code']?.toString();
    }

    throw ApiException(
      statusCode: response.statusCode,
      code: code,
      message: message,
    );
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final uri = _buildUri(path, query);
    try {
      final response = await http
          .get(uri, headers: _headers())
          .timeout(const Duration(seconds: 6));
      return _processResponse(response);
    } on SocketException {
      throw ApiException(
        statusCode: 503,
        message: 'No se pudo conectar al servidor ($uri). Asegúrate de iniciar el backend con "npm run server:dev".',
      );
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'El servidor tardó demasiado en responder ($uri). Verifica que el backend esté ejecutándose.',
      );
    }
  }

  Future<dynamic> post(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    try {
      final response = await http
          .post(
            uri,
            headers: _headers(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 8));
      return _processResponse(response);
    } on SocketException {
      throw ApiException(
        statusCode: 503,
        message: 'No se pudo conectar al servidor ($uri). Asegúrate de iniciar el backend con "npm run server:dev".',
      );
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'Tiempo de espera agotado al conectar al servidor ($uri).',
      );
    }
  }

  Future<dynamic> put(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    try {
      final response = await http
          .put(
            uri,
            headers: _headers(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 8));
      return _processResponse(response);
    } on SocketException {
      throw ApiException(
        statusCode: 503,
        message: 'No se pudo conectar al servidor ($uri). Asegúrate de iniciar el backend con "npm run server:dev".',
      );
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'Tiempo de espera agotado al conectar al servidor ($uri).',
      );
    }
  }

  Future<dynamic> delete(String path) async {
    final uri = _buildUri(path);
    try {
      final response = await http
          .delete(uri, headers: _headers())
          .timeout(const Duration(seconds: 8));
      return _processResponse(response);
    } on SocketException {
      throw ApiException(
        statusCode: 503,
        message: 'No se pudo conectar al servidor ($uri). Asegúrate de iniciar el backend con "npm run server:dev".',
      );
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'Tiempo de espera agotado al conectar al servidor ($uri).',
      );
    }
  }

  /// URL completa para descargar o ver la portada de un libro
  String getCoverUrl(String bookId) {
    return '$_baseUrl/books/$bookId/portada';
  }

  /// Subir archivo PDF a /books/stage
  Future<dynamic> stagePdf(File pdfFile) async {
    final uri = _buildUri(ApiConstants.stageBook);
    final request = http.MultipartRequest('POST', uri);
    if (_token != null) {
      request.headers['Authorization'] = 'Bearer $_token';
    }
    request.files.add(await http.MultipartFile.fromPath('pdf', pdfFile.path));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _processResponse(response);
  }

  /// Guardar libro con stage_id a /books/upload
  Future<dynamic> uploadWithStage({
    required String stageId,
    required String titulo,
    String? sinopsis,
    String? idioma,
    String? empresaEdicion,
    int? numeroEdicion,
    String? fechaPublicacion,
    List<String>? categorias,
    List<String>? autores,
    String? saga,
    int? numeroEnSaga,
    bool usarPortadaPdf = true,
    File? customCoverFile,
  }) async {
    final uri = _buildUri(ApiConstants.uploadBook);
    final request = http.MultipartRequest('POST', uri);
    if (_token != null) {
      request.headers['Authorization'] = 'Bearer $_token';
    }

    request.fields['stage_id'] = stageId;
    request.fields['titulo'] = titulo;
    if (sinopsis != null && sinopsis.isNotEmpty) request.fields['sinopsis'] = sinopsis;
    if (idioma != null && idioma.isNotEmpty) request.fields['idioma'] = idioma;
    if (empresaEdicion != null && empresaEdicion.isNotEmpty) {
      request.fields['empresa_edicion'] = empresaEdicion;
    }
    if (numeroEdicion != null) request.fields['numero_edicion'] = numeroEdicion.toString();
    if (fechaPublicacion != null && fechaPublicacion.isNotEmpty) {
      request.fields['fecha_publicacion'] = fechaPublicacion;
    }
    if (saga != null && saga.isNotEmpty) request.fields['saga'] = saga;
    if (numeroEnSaga != null) request.fields['numero_en_saga'] = numeroEnSaga.toString();

    if (categorias != null && categorias.isNotEmpty) {
      request.fields['categorias'] = jsonEncode(categorias);
    }
    if (autores != null && autores.isNotEmpty) {
      request.fields['autores'] = jsonEncode(autores);
    }

    if (customCoverFile != null) {
      request.files.add(
        await http.MultipartFile.fromPath('portada', customCoverFile.path),
      );
    } else if (usarPortadaPdf) {
      request.fields['usar_portada_pdf'] = '1';
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _processResponse(response);
  }
}
