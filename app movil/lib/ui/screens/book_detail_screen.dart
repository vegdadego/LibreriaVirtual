import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/book.dart';
import '../../providers/auth_provider.dart';
import '../../providers/downloads_provider.dart';
import '../../providers/library_provider.dart';
import '../widgets/add_to_folder_dialog.dart';
import '../widgets/book_cover.dart';
import '../widgets/book_login_dialog.dart';
import 'reader_screen.dart';

class BookDetailScreen extends StatelessWidget {
  final Book book;

  const BookDetailScreen({super.key, required this.book});

  void _openReader(BuildContext context, int page) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ReaderScreen(book: book, initialPage: page),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();
    final auth = context.watch<AuthProvider>();
    final downloads = context.watch<DownloadsProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final isSaved = library.isBookSaved(book.id);
    final isDownloaded = downloads.isDownloaded(book.id);
    final isDownloading = downloads.isDownloading(book.id);

    final startPage = book.leidas ?? 1;
    final hasContentStart = book.inicioContenido != null &&
        book.inicioContenido! > 1 &&
        (book.leidas == null || book.leidas! < book.inicioContenido!);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          book.titulo,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.playfairDisplay(fontSize: 18),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Portada en relieve
            Center(
              child: BookCover(
                id: book.id,
                titulo: book.titulo,
                tienePortada: book.tienePortada,
                width: 140,
                height: 205,
              ),
            ),
            const SizedBox(height: 16),

            // Título
            Text(
              book.titulo,
              textAlign: TextAlign.center,
              style: GoogleFonts.playfairDisplay(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkText : AppColors.lightText,
              ),
            ),
            const SizedBox(height: 6),

            // Autores
            if (book.autores.isNotEmpty)
              Text(
                book.autores.join(', '),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: isDark ? AppColors.darkAccent : AppColors.lightAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),

            const SizedBox(height: 10),

            // Categorías
            if (book.categorias.isNotEmpty)
              Wrap(
                spacing: 6,
                runSpacing: 6,
                alignment: WrapAlignment.center,
                children: book.categorias.map((cat) {
                  return Chip(
                    label: Text(
                      cat,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkPillText : AppColors.lightPillText,
                      ),
                    ),
                    backgroundColor: isDark ? AppColors.darkPill : AppColors.lightPill,
                    side: BorderSide.none,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                  );
                }).toList(),
              ),

            const SizedBox(height: 20),

            // Botón principal de lectura
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openReader(context, startPage),
                icon: const Icon(Icons.menu_book_rounded),
                label: Text(
                  book.leidas != null && book.leidas! > 1
                      ? 'Continuar en página ${book.leidas}'
                      : 'Comenzar a leer',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.darkAccent,
                  foregroundColor: const Color(0xFF1C1815),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),

            // Botón opcional: Ir al contenido
            if (hasContentStart) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _openReader(context, book.inicioContenido!),
                  icon: const Icon(Icons.fast_forward, size: 18),
                  label: Text('Ir al contenido (pág. ${book.inicioContenido})'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.darkAccent,
                    side: const BorderSide(color: AppColors.darkAccent),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Barra de acciones secundarias: Guardar, Carpeta, Descargar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // 1. Guardar
                IconButton(
                  tooltip: isSaved ? 'Guardado' : 'Guardar para más tarde',
                  icon: Icon(
                    isSaved ? Icons.bookmark : Icons.bookmark_border,
                    color: isSaved ? AppColors.darkAccent : null,
                  ),
                  onPressed: () {
                    if (!auth.isAuthenticated) {
                      showDialog(context: context, builder: (_) => const BookLoginDialog());
                    } else {
                      library.toggleSaveBook(book.id);
                    }
                  },
                ),

                // 2. Añadir a carpeta
                IconButton(
                  tooltip: 'Añadir a carpeta',
                  icon: const Icon(Icons.folder_open_outlined),
                  onPressed: () {
                    if (!auth.isAuthenticated) {
                      showDialog(context: context, builder: (_) => const BookLoginDialog());
                    } else {
                      showDialog(
                        context: context,
                        builder: (_) => AddToFolderDialog(book: book),
                      );
                    }
                  },
                ),

                // 3. Descargar offline
                if (isDownloading)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.darkAccent),
                  )
                else
                  IconButton(
                    tooltip: isDownloaded ? 'Descargado (sin conexión)' : 'Descargar para leer sin conexión',
                    icon: Icon(
                      isDownloaded ? Icons.download_done_rounded : Icons.download_rounded,
                      color: isDownloaded ? Colors.greenAccent : null,
                    ),
                    onPressed: () async {
                      if (isDownloaded) {
                        await downloads.removeDownload(book.id);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Descarga eliminada')),
                          );
                        }
                      } else {
                        final ok = await downloads.downloadBook(book);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(ok ? '¡Libro descargado para leer sin conexión!' : 'Error al descargar'),
                            ),
                          );
                        }
                      }
                    },
                  ),
              ],
            ),

            const Divider(height: 32),

            // Sinopsis
            if (book.sinopsis != null && book.sinopsis!.isNotEmpty) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Sinopsis',
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
                child: Text(
                  book.sinopsis!,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Ficha técnica
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Ficha técnica',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
              ),
              child: Column(
                children: [
                  _buildMetaTile('Total de páginas', '${book.totalPaginas} páginas', isDark),
                  if (book.editorial != null && book.editorial!.isNotEmpty)
                    _buildMetaTile('Editorial', book.editorial!, isDark),
                  if (book.fechaPublicacion != null && book.fechaPublicacion!.isNotEmpty)
                    _buildMetaTile('Fecha de publicación', book.fechaPublicacion!, isDark),
                  if (book.numeroEdicion != null)
                    _buildMetaTile('Edición', '${book.numeroEdicion}ª edición', isDark),
                  if (book.saga != null && book.saga!.isNotEmpty)
                    _buildMetaTile('Saga', '${book.saga} (${book.numeroEnSaga ?? 1})', isDark),
                  if (book.idioma != null && book.idioma!.isNotEmpty)
                    _buildMetaTile('Idioma', book.idioma!.toUpperCase(), isDark, isLast: true),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaTile(String label, String value, bool isDark, {bool isLast = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
              ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.darkTextSubtle, fontSize: 13.5)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        ],
      ),
    );
  }
}

extension BookMeta on Book {
  String? get editorial => empresaEdicion;
}
