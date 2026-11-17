import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/cover_color.dart';

class BookCover extends StatelessWidget {
  final String id;
  final String titulo;
  final bool tienePortada;
  final double width;
  final double height;
  final VoidCallback? onTap;

  const BookCover({
    super.key,
    required this.id,
    required this.titulo,
    required this.tienePortada,
    this.width = 110,
    this.height = 165,
    this.onTap,
  });

  Widget _buildFallback() {
    final bgColor = CoverColor.getColorForTitle(titulo);
    return Container(
      width: width,
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(5),
          bottomRight: Radius.circular(5),
          topLeft: Radius.circular(2),
          bottomLeft: Radius.circular(2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.45),
            offset: const Offset(4, 5),
            blurRadius: 8,
          ),
        ],
      ),
      child: Center(
        child: Text(
          titulo,
          maxLines: 5,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.playfairDisplay(
            color: const Color(0xFFF8F4EF),
            fontSize: width > 130 ? 14 : 11.5,
            fontWeight: FontWeight.bold,
            height: 1.25,
            shadows: const [
              Shadow(
                color: Colors.black54,
                offset: Offset(1, 1),
                blurRadius: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final coverUrl = ApiClient().getCoverUrl(id);

    Widget content = tienePortada
        ? ClipRRect(
            borderRadius: const BorderRadius.only(
              topRight: Radius.circular(5),
              bottomRight: Radius.circular(5),
              topLeft: Radius.circular(2),
              bottomLeft: Radius.circular(2),
            ),
            child: Image.network(
              coverUrl,
              width: width,
              height: height,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => _buildFallback(),
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return Container(
                  width: width,
                  height: height,
                  color: AppColors.darkCardBg,
                  child: const Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.darkAccent),
                    ),
                  ),
                );
              },
            ),
          )
        : _buildFallback();

    // Efecto skeuomorphic: lomo a la izquierda y borde de páginas a la derecha
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: const BorderRadius.only(
            topRight: Radius.circular(5),
            bottomRight: Radius.circular(5),
            topLeft: Radius.circular(2),
            bottomLeft: Radius.circular(2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              offset: const Offset(3, 4),
              blurRadius: 7,
            ),
          ],
        ),
        child: Stack(
          children: [
            content,
            // Sombra del lomo (spine ridge)
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 10,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0x77000000),
                      Color(0x33000000),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            // Canto de páginas a la derecha
            Positioned(
              right: 0,
              top: 0,
              bottom: 0,
              width: 3.5,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Color(0x44D8CFBA),
                      Color(0x99D8CFBA),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
