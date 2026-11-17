import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/downloads_provider.dart';
import '../widgets/book_cover.dart';
import 'reader_screen.dart';

class DescargasScreen extends StatelessWidget {
  const DescargasScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final downloads = context.watch<DownloadsProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Descargas (Sin Conexión)',
          style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold),
        ),
      ),
      body: downloads.downloadedBooks.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.offline_pin_outlined, size: 64, color: AppColors.darkTextSubtle),
                    const SizedBox(height: 16),
                    Text(
                      'No tienes libros descargados',
                      style: GoogleFonts.playfairDisplay(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Descarga libros desde su ficha técnica para poder leerlos en cualquier lugar, incluso sin internet.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.darkTextSubtle),
                    ),
                  ],
                ),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: downloads.downloadedBooks.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final book = downloads.downloadedBooks[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  child: Row(
                    children: [
                      BookCover(
                        id: book.id,
                        titulo: book.titulo,
                        tienePortada: book.tienePortada,
                        width: 65,
                        height: 95,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ReaderScreen(book: book),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              book.titulo,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            if (book.autores.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                book.autores.join(', '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppColors.darkAccent, fontSize: 13),
                              ),
                            ],
                            const SizedBox(height: 6),
                            Text(
                              '${book.totalPaginas} páginas disponibles offline',
                              style: const TextStyle(color: AppColors.darkTextSubtle, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                        tooltip: 'Eliminar descarga',
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Eliminar descarga'),
                              content: Text('¿Deseas quitar "${book.titulo}" de tus descargas locales?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
                                ElevatedButton(
                                  onPressed: () {
                                    Navigator.pop(ctx);
                                    downloads.removeDownload(book.id);
                                  },
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                                  child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
