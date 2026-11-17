import 'package:flutter/foundation.dart';
import '../core/network/api_client.dart';
import '../core/network/api_constants.dart';
import '../models/book.dart';

class LibraryProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  bool _isLoading = false;
  String? _errorMessage;

  List<Book> _catalog = [];
  List<Book> _continueReading = [];
  List<Book> _savedBooks = [];
  List<Book> _newArrivals = [];
  final Map<String, List<Book>> _categoryShelves = {};
  List<String> _categories = [];

  List<Book> _myBooks = [];
  Set<String> _savedBookIds = {};

  List<Book> _searchResults = [];
  bool _isSearching = false;
  String _currentSearchQuery = '';

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<Book> get catalog => _catalog;
  List<Book> get continueReading => _continueReading;
  List<Book> get savedBooks => _savedBooks;
  List<Book> get newArrivals => _newArrivals;
  Map<String, List<Book>> get categoryShelves => _categoryShelves;
  List<String> get categories => _categories;
  List<Book> get myBooks => _myBooks;
  Set<String> get savedBookIds => _savedBookIds;

  List<Book> get searchResults => _searchResults;
  bool get isSearching => _isSearching;
  String get currentSearchQuery => _currentSearchQuery;

  bool isBookSaved(String bookId) => _savedBookIds.contains(bookId);

  Future<void> loadHomeData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. Cargar catálogo general
      final res = await _api.get(ApiConstants.books, query: {'limit': 40});
      if (res['data'] is List) {
        _catalog = (res['data'] as List).map((b) => Book.fromJson(b)).toList();
        _newArrivals = _catalog.take(10).toList();
      }

      // 2. Si hay token, cargar estado personal (guardados y progreso)
      if (_api.token != null) {
        try {
          final stateRes = await _api.get(ApiConstants.myState);
          if (stateRes['data'] is Map) {
            final data = stateRes['data'];
            if (data['guardados'] is List) {
              _savedBookIds = Set<String>.from((data['guardados'] as List).map((id) => id.toString()));
            }
          }

          // Cargar libros guardados
          final savedRes = await _api.get(ApiConstants.mySaved);
          if (savedRes['data'] is List) {
            _savedBooks = (savedRes['data'] as List).map((b) => Book.fromJson(b)).toList();
          }

          // Cargar continuar leyendo
          final progRes = await _api.get(ApiConstants.myProgress);
          if (progRes['data'] is List) {
            _continueReading = (progRes['data'] as List).map((b) => Book.fromJson(b)).toList();
          }
        } catch (_) {
          // Si falla la consulta personal (sesión expirada o red), no rompemos el catálogo
        }
      }

      // 3. Cargar categorías y estantes temáticos
      try {
        final catRes = await _api.get(ApiConstants.categories);
        if (catRes['data'] is List) {
          _categories = (catRes['data'] as List).map((c) => c.toString()).toList();
          _categoryShelves.clear();

          // Agrupar del catálogo existente o pedir primeras categorías
          for (var cat in _categories.take(6)) {
            final inCatalog = _catalog.where((b) => b.categorias.contains(cat)).toList();
            if (inCatalog.isNotEmpty) {
              _categoryShelves[cat] = inCatalog;
            }
          }
        }
      } catch (_) {}

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> search(String query) async {
    _currentSearchQuery = query.trim();
    if (_currentSearchQuery.isEmpty) {
      _isSearching = false;
      _searchResults = [];
      notifyListeners();
      return;
    }

    _isSearching = true;
    notifyListeners();

    try {
      final res = await _api.get(ApiConstants.books, query: {'busqueda': _currentSearchQuery, 'limit': 30});
      if (res['data'] is List) {
        _searchResults = (res['data'] as List).map((b) => Book.fromJson(b)).toList();
      }
    } catch (_) {
      _searchResults = [];
    } finally {
      notifyListeners();
    }
  }

  void clearSearch() {
    _currentSearchQuery = '';
    _isSearching = false;
    _searchResults = [];
    notifyListeners();
  }

  Future<bool> toggleSaveBook(String bookId) async {
    if (_api.token == null) return false;

    final isSaved = _savedBookIds.contains(bookId);
    try {
      if (isSaved) {
        await _api.delete('${ApiConstants.mySaved}/$bookId');
        _savedBookIds.remove(bookId);
        _savedBooks.removeWhere((b) => b.id == bookId);
      } else {
        await _api.put('${ApiConstants.mySaved}/$bookId');
        _savedBookIds.add(bookId);
        // Buscar el libro en el catálogo para agregarlo a la lista de guardados local
        final book = _catalog.firstWhere((b) => b.id == bookId, orElse: () => Book(id: bookId, titulo: ''));
        if (book.titulo.isNotEmpty && !_savedBooks.any((b) => b.id == bookId)) {
          _savedBooks.insert(0, book);
        }
      }
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> updateReadingProgress(String bookId, int page, int totalPaginas) async {
    if (_api.token == null) return;
    try {
      await _api.put('${ApiConstants.myProgress}/$bookId', body: {'pagina': page});
      
      // Actualizar en continueReading
      final idx = _continueReading.indexWhere((b) => b.id == bookId);
      final calcProg = ((page / totalPaginas) * 100).round().clamp(0, 100);

      if (idx != -1) {
        final updated = _continueReading[idx].copyWith(leidas: page, progress: calcProg);
        _continueReading.removeAt(idx);
        _continueReading.insert(0, updated);
      } else {
        final b = _catalog.firstWhere((b) => b.id == bookId, orElse: () => Book(id: bookId, titulo: ''));
        if (b.titulo.isNotEmpty) {
          _continueReading.insert(0, b.copyWith(leidas: page, progress: calcProg));
        }
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadMyBooks() async {
    if (_api.token == null) return;
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _api.get(ApiConstants.myBooks, query: {'limit': 50});
      if (res['data'] is List) {
        _myBooks = (res['data'] as List).map((b) => Book.fromJson(b)).toList();
      }
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteBook(String bookId) async {
    try {
      await _api.delete('${ApiConstants.books}/$bookId');
      _myBooks.removeWhere((b) => b.id == bookId);
      _catalog.removeWhere((b) => b.id == bookId);
      _savedBooks.removeWhere((b) => b.id == bookId);
      _continueReading.removeWhere((b) => b.id == bookId);
      _savedBookIds.remove(bookId);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }
}
