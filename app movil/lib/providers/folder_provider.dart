import 'package:flutter/foundation.dart';
import '../core/network/api_client.dart';
import '../core/network/api_constants.dart';
import '../models/folder.dart';
import '../models/book.dart';

class FolderProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  List<Folder> _folders = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Folder> get folders => _folders;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadFolders() async {
    if (_api.token == null) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.get(ApiConstants.myFolders);
      if (res['data'] is List) {
        _folders = (res['data'] as List).map((f) => Folder.fromJson(f)).toList();
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createFolder(String name, {String? description, String? bookId}) async {
    try {
      final body = <String, dynamic>{
        'nombre': name.trim(),
      };
      if (description != null && description.isNotEmpty) {
        body['descripcion'] = description.trim();
      }
      if (bookId != null && bookId.isNotEmpty) {
        body['libro_id'] = bookId;
      }

      await _api.post(ApiConstants.myFolders, body: body);
      await loadFolders();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteFolder(String folderId) async {
    try {
      await _api.delete('${ApiConstants.myFolders}/$folderId');
      _folders.removeWhere((f) => f.id == folderId);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addBookToFolder(String folderId, String bookId) async {
    try {
      await _api.put('${ApiConstants.myFolders}/$folderId/libros/$bookId');
      await loadFolders();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> removeBookFromFolder(String folderId, String bookId) async {
    try {
      await _api.delete('${ApiConstants.myFolders}/$folderId/libros/$bookId');
      await loadFolders();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<List<Book>> getFolderBooks(String folderId) async {
    try {
      final res = await _api.get('${ApiConstants.myFolders}/$folderId');
      if (res['data'] is Map && res['data']['libros'] is List) {
        return (res['data']['libros'] as List).map((b) => Book.fromJson(b)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
