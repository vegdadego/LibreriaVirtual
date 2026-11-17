import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/library_provider.dart';
import '../widgets/book_cover.dart';
import '../widgets/book_login_dialog.dart';
import 'book_detail_screen.dart';

class GuardadosScreen extends StatelessWidget {
  const GuardadosScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();
    final auth = context.watch<AuthProvider>();

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Guardados')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.bookmark_border_rounded, size: 64, color: AppColors.darkAccent),
                const SizedBox(height: 16),
                Text(
                  'Inicia sesión para ver tus guardados',
                  style: GoogleFonts.playfairDisplay(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Guarda libros para leerlos más tarde y sincronizarlos en todos tus dispositivos.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.darkTextSubtle),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () {
                    showDialog(context: context, builder: (_) => const BookLoginDialog());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkAccent,
                    foregroundColor: const Color(0xFF1C1815),
                  ),
                  child: const Text('Iniciar Sesión'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Guardados para más tarde',
          style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold),
        ),
      ),
      body: library.savedBooks.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.bookmarks_outlined, size: 54, color: AppColors.darkTextSubtle),
                  const SizedBox(height: 12),
                  const Text(
                    'No tienes libros guardados todavía.',
                    style: TextStyle(color: AppColors.darkTextSubtle, fontSize: 15),
                  ),
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 0.58,
                crossAxisSpacing: 14,
                mainAxisSpacing: 16,
              ),
              itemCount: library.savedBooks.length,
              itemBuilder: (context, index) {
                final book = library.savedBooks[index];
                return GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => BookDetailScreen(book: book),
                      ),
                    );
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: BookCover(
                          id: book.id,
                          titulo: book.titulo,
                          tienePortada: book.tienePortada,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        book.titulo,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
