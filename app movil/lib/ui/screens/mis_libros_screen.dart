import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../models/book.dart';
import '../../providers/auth_provider.dart';
import '../../providers/library_provider.dart';
import '../widgets/book_cover.dart';
import '../widgets/book_login_dialog.dart';
import 'book_detail_screen.dart';
import 'upload_book_screen.dart';

class MisLibrosScreen extends StatefulWidget {
  const MisLibrosScreen({super.key});

  @override
  State<MisLibrosScreen> createState() => _MisLibrosScreenState();
}

class _MisLibrosScreenState extends State<MisLibrosScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LibraryProvider>().loadMyBooks();
    });
  }

  void _openEditDialog(Book book) {
    final titleCtrl = TextEditingController(text: book.titulo);
    final sinopsisCtrl = TextEditingController(text: book.sinopsis ?? '');
    final editorialCtrl = TextEditingController(text: book.empresaEdicion ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Editar Libro'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: editorialCtrl,
                decoration: const InputDecoration(labelText: 'Editorial'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: sinopsisCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Sinopsis'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              final lib = context.read<LibraryProvider>();
              try {
                await ApiClient().put('/books/${book.id}', body: {
                  'titulo': titleCtrl.text.trim(),
                  'sinopsis': sinopsisCtrl.text.trim(),
                  'empresa_edicion': editorialCtrl.text.trim(),
                });
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                }
                if (mounted) {
                  lib.loadMyBooks();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error al editar: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.darkAccent),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _openDeleteDialog(Book book) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Libro'),
        content: Text('¿Seguro que deseas eliminar definitivamente "${book.titulo}"? Esta acción borrará todas sus páginas y datos.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await context.read<LibraryProvider>().deleteBook(book.id);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(ok ? 'Libro eliminado' : 'Error al eliminar libro')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('Eliminar Definitivamente', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildNewBookButton(bool isDark) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const UploadBookScreen()),
        );
      },
      child: Container(
        width: 105,
        height: 155,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: AppColors.darkAccent,
            width: 1.5,
            style: BorderStyle.solid,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              offset: const Offset(2, 3),
              blurRadius: 6,
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.darkAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.add, color: AppColors.darkAccent, size: 28),
            ),
            const SizedBox(height: 10),
            Text(
              'Subir Libro',
              style: GoogleFonts.playfairDisplay(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: AppColors.darkAccent,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mis Libros')),
        body: Center(
          child: ElevatedButton(
            onPressed: () => showDialog(context: context, builder: (_) => const BookLoginDialog()),
            child: const Text('Iniciar Sesión'),
          ),
        ),
      );
    }

    if (!auth.user!.canUpload) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mis Libros')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Tu cuenta tiene el rol de Lector. La subida y administración de libros requiere una cuenta con rol Uploader o Administrador.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Mis Libros Subidos',
          style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: AppColors.darkAccent),
            tooltip: 'Subir nuevo libro en PDF',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const UploadBookScreen()),
              );
            },
          ),
        ],
      ),
      body: library.isLoading && library.myBooks.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.darkAccent))
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 0.52,
                crossAxisSpacing: 12,
                mainAxisSpacing: 14,
              ),
              itemCount: library.myBooks.length + 1,
              itemBuilder: (context, index) {
                // El primer elemento es el libro en blanco con botón (+)
                if (index == 0) {
                  return _buildNewBookButton(isDark);
                }

                final book = library.myBooks[index - 1];
                return Column(
                  children: [
                    Expanded(
                      child: Stack(
                        children: [
                          BookCover(
                            id: book.id,
                            titulo: book.titulo,
                            tienePortada: book.tienePortada,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => BookDetailScreen(book: book),
                                ),
                              );
                            },
                          ),
                          // Botones de acción flotantes: Editar y Borrar
                          Positioned(
                            top: 4,
                            right: 4,
                            child: Row(
                              children: [
                                GestureDetector(
                                  onTap: () => _openEditDialog(book),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.7),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.edit, size: 14, color: Colors.white),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                GestureDetector(
                                  onTap: () => _openDeleteDialog(book),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.7),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.delete, size: 14, color: Colors.redAccent),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      book.titulo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                );
              },
            ),
    );
  }
}
