import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/book.dart';
import '../../models/folder.dart';
import '../../providers/folder_provider.dart';
import '../widgets/book_cover.dart';
import 'book_detail_screen.dart';

class CarpetaDetailScreen extends StatefulWidget {
  final Folder folder;

  const CarpetaDetailScreen({super.key, required this.folder});

  @override
  State<CarpetaDetailScreen> createState() => _CarpetaDetailScreenState();
}

class _CarpetaDetailScreenState extends State<CarpetaDetailScreen> {
  List<Book> _books = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBooks();
  }

  Future<void> _loadBooks() async {
    final folderProvider = context.read<FolderProvider>();
    final books = await folderProvider.getFolderBooks(widget.folder.id);
    if (mounted) {
      setState(() {
        _books = books;
        _isLoading = false;
      });
    }
  }

  void _confirmDeleteFolder() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Carpeta'),
        content: Text('¿Seguro que deseas eliminar la carpeta "${widget.folder.nombre}"? Los libros no se eliminarán.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await context.read<FolderProvider>().deleteFolder(widget.folder.id);
              if (ok && mounted) {
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.folder.nombre,
          style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
            tooltip: 'Eliminar carpeta',
            onPressed: _confirmDeleteFolder,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.darkAccent))
          : _books.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.folder_open, size: 54, color: AppColors.darkTextSubtle),
                      const SizedBox(height: 12),
                      const Text(
                        'Esta carpeta está vacía.',
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
                  itemCount: _books.length,
                  itemBuilder: (context, index) {
                    final book = _books[index];
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
