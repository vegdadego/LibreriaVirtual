import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../../models/book.dart';
import '../../models/page_content.dart';

class LocalDatabase {
  static final LocalDatabase _instance = LocalDatabase._internal();
  factory LocalDatabase() => _instance;
  LocalDatabase._internal();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDB();
    return _db!;
  }

  Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'biblioteca_offline.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE downloaded_books (
            id TEXT PRIMARY KEY,
            titulo TEXT,
            autores TEXT,
            categorias TEXT,
            sinopsis TEXT,
            total_paginas INTEGER,
            tiene_portada INTEGER,
            fecha_descarga TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE downloaded_pages (
            libro_id TEXT,
            pagina INTEGER,
            texto TEXT,
            PRIMARY KEY (libro_id, pagina)
          )
        ''');
      },
    );
  }

  Future<void> saveBookWithPages(Book book, List<dynamic> pages) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.insert(
        'downloaded_books',
        {
          'id': book.id,
          'titulo': book.titulo,
          'autores': book.autores.join(', '),
          'categorias': book.categorias.join(', '),
          'sinopsis': book.sinopsis ?? '',
          'total_paginas': book.totalPaginas,
          'tiene_portada': book.tienePortada ? 1 : 0,
          'fecha_descarga': DateTime.now().toIso8601String(),
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      for (var page in pages) {
        final pageNum = page['pagina'] is int ? page['pagina'] : int.tryParse(page['pagina']?.toString() ?? '1') ?? 1;
        final texto = page['texto']?.toString() ?? '';
        await txn.insert(
          'downloaded_pages',
          {
            'libro_id': book.id,
            'pagina': pageNum,
            'texto': texto,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<List<Book>> getDownloadedBooks() async {
    final db = await database;
    final res = await db.query('downloaded_books', orderBy: 'fecha_descarga DESC');
    return res.map((row) {
      final autoresStr = row['autores']?.toString() ?? '';
      final categoriasStr = row['categorias']?.toString() ?? '';
      return Book(
        id: row['id'] as String,
        titulo: row['titulo'] as String,
        autores: autoresStr.isNotEmpty ? autoresStr.split(', ') : [],
        categorias: categoriasStr.isNotEmpty ? categoriasStr.split(', ') : [],
        sinopsis: row['sinopsis']?.toString(),
        totalPaginas: row['total_paginas'] as int? ?? 0,
        tienePortada: (row['tiene_portada'] as int? ?? 0) == 1,
      );
    }).toList();
  }

  Future<BookPage?> getDownloadedPage(String bookId, int pagina) async {
    final db = await database;
    final res = await db.query(
      'downloaded_pages',
      where: 'libro_id = ? AND pagina = ?',
      whereArgs: [bookId, pagina],
    );

    if (res.isEmpty) return null;

    final bookRes = await db.query(
      'downloaded_books',
      columns: ['titulo', 'total_paginas'],
      where: 'id = ?',
      whereArgs: [bookId],
    );

    final titulo = bookRes.isNotEmpty ? bookRes.first['titulo'] as String : '';
    final totalPaginas = bookRes.isNotEmpty ? bookRes.first['total_paginas'] as int : 1;

    return BookPage(
      libroId: bookId,
      titulo: titulo,
      pagina: pagina,
      texto: res.first['texto'] as String,
      totalPaginas: totalPaginas,
      anterior: pagina > 1 ? pagina - 1 : null,
      siguiente: pagina < totalPaginas ? pagina + 1 : null,
    );
  }

  Future<bool> isBookDownloaded(String bookId) async {
    final db = await database;
    final res = await db.query(
      'downloaded_books',
      columns: ['id'],
      where: 'id = ?',
      whereArgs: [bookId],
    );
    return res.isNotEmpty;
  }

  Future<void> removeBook(String bookId) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('downloaded_pages', where: 'libro_id = ?', whereArgs: [bookId]);
      await txn.delete('downloaded_books', where: 'id = ?', whereArgs: [bookId]);
    });
  }
}
