import 'package:flutter/foundation.dart';
import '../core/network/api_client.dart';
import '../core/storage/local_database.dart';
import '../models/book.dart';
import '../models/page_content.dart';

class DownloadsProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  final LocalDatabase _localDb = LocalDatabase();

  List<Book> _downloadedBooks = [];
  final Set<String> _downloadedIds = {};
  final Set<String> _downloadingIds = {};
  bool _isLoading = false;

  List<Book> get downloadedBooks => _downloadedBooks;
  bool get isLoading => _isLoading;

  bool isDownloaded(String bookId) => _downloadedIds.contains(bookId);
  bool isDownloading(String bookId) => _downloadingIds.contains(bookId);

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    _downloadedBooks = await _localDb.getDownloadedBooks();
    _downloadedIds.clear();
    for (var b in _downloadedBooks) {
      _downloadedIds.add(b.id);
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> downloadBook(Book book) async {
    if (_downloadedIds.contains(book.id) || _downloadingIds.contains(book.id)) {
      return true;
    }

    _downloadingIds.add(book.id);
    notifyListeners();

    try {
      // 1. Obtener todas las páginas del libro
      final res = await _api.get('/books/${book.id}/texto');
      if (res['data'] is Map && res['data']['paginas'] is List) {
        final pages = res['data']['paginas'] as List;
        
        // 2. Guardar en SQLite local
        await _localDb.saveBookWithPages(book, pages);

        _downloadedIds.add(book.id);
        _downloadedBooks = await _localDb.getDownloadedBooks();
      }
      _downloadingIds.remove(book.id);
      notifyListeners();
      return true;
    } catch (e) {
      _downloadingIds.remove(book.id);
      notifyListeners();
      return false;
    }
  }

  Future<void> removeDownload(String bookId) async {
    await _localDb.removeBook(bookId);
    _downloadedIds.remove(bookId);
    _downloadedBooks.removeWhere((b) => b.id == bookId);
    notifyListeners();
  }

  Future<BookPage?> getDownloadedPage(String bookId, int pagina) async {
    return await _localDb.getDownloadedPage(bookId, pagina);
  }
}
