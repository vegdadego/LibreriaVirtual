import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../models/book.dart';
import 'book_cover.dart';

class ShelfWidget extends StatelessWidget {
  final String? title;
  final List<Book> books;
  final Function(Book) onSelectBook;
  final Widget? leading;

  const ShelfWidget({
    super.key,
    this.title,
    required this.books,
    required this.onSelectBook,
    this.leading,
  });

  Widget _buildReadingProgress(Book book) {
    if (book.progress == null && book.leidas == null) return const SizedBox.shrink();

    final hasPages = book.leidas != null && book.totalPaginas > 0;
    final faltan = hasPages ? (book.totalPaginas - book.leidas!).clamp(0, 9999) : null;
    final progress = book.progress ?? 0;

    return Container(
      width: 110,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xE61C1815),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(2),
          bottomRight: Radius.circular(5),
        ),
        border: Border(
          top: BorderSide(
            color: AppColors.darkAccent.withValues(alpha: 0.5),
            width: 1,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                hasPages ? '${book.leidas}/${book.totalPaginas}' : '$progress%',
                style: const TextStyle(
                  color: AppColors.darkText,
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (faltan != null)
                Text(
                  'Faltan $faltan',
                  style: const TextStyle(
                    color: AppColors.darkTextSubtle,
                    fontSize: 8.5,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 3),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: (progress / 100).clamp(0.0, 1.0),
              minHeight: 3.5,
              backgroundColor: AppColors.darkBorder,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.darkAccent),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final wood1 = isDark ? AppColors.darkWood1 : AppColors.lightWood1;
    final wood2 = isDark ? AppColors.darkWood2 : AppColors.lightWood2;

    if (books.isEmpty && leading == null) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 18,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkAccent : AppColors.lightAccent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  title!,
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkText : AppColors.lightText,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
        Stack(
          alignment: Alignment.bottomCenter,
          children: [
            // Repisa de madera física (Wooden plank)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 16,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      wood1,
                      wood2,
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.4),
                      offset: const Offset(0, 4),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: Container(
                  height: 2,
                  color: Colors.white.withValues(alpha: 0.2), // Borde iluminado superior
                ),
              ),
            ),
            // Fila de libros de pie sobre la madera
            Container(
              height: 188,
              padding: const EdgeInsets.only(bottom: 12),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: (leading != null ? 1 : 0) + books.length,
                separatorBuilder: (context, index) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  if (leading != null && index == 0) {
                    return Align(
                      alignment: Alignment.bottomCenter,
                      child: leading!,
                    );
                  }

                  final book = books[index - (leading != null ? 1 : 0)];
                  return Align(
                    alignment: Alignment.bottomCenter,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        BookCover(
                          id: book.id,
                          titulo: book.titulo,
                          tienePortada: book.tienePortada,
                          width: 110,
                          height: 162,
                          onTap: () => onSelectBook(book),
                        ),
                        if (book.progress != null || book.leidas != null)
                          _buildReadingProgress(book),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
