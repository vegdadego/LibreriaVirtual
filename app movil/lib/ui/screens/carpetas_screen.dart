import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/folder.dart';
import '../../providers/auth_provider.dart';
import '../../providers/folder_provider.dart';
import '../widgets/book_cover.dart';
import '../widgets/book_login_dialog.dart';
import 'carpeta_detail_screen.dart';

class CarpetasScreen extends StatefulWidget {
  const CarpetasScreen({super.key});

  @override
  State<CarpetasScreen> createState() => _CarpetasScreenState();
}

class _CarpetasScreenState extends State<CarpetasScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FolderProvider>().loadFolders();
    });
  }

  void _showCreateDialog() {
    final controller = TextEditingController();
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nueva Carpeta'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Nombre de la carpeta',
                hintText: 'Ej. Libros favoritos de fantasía',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                Navigator.pop(ctx);
                await context.read<FolderProvider>().createFolder(
                      name,
                      description: descController.text.trim(),
                    );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.darkAccent,
              foregroundColor: const Color(0xFF1C1815),
            ),
            child: const Text('Crear'),
          ),
        ],
      ),
    );
  }

  Widget _buildFolderMosaic(Folder folder, bool isDark) {
    if (folder.previews.isEmpty) {
      return Container(
        color: isDark ? AppColors.darkBg : AppColors.lightBg,
        child: const Center(
          child: Icon(Icons.folder_open_outlined, size: 40, color: AppColors.darkTextSubtle),
        ),
      );
    }

    return Container(
      color: isDark ? AppColors.darkBg : AppColors.lightBg,
      padding: const EdgeInsets.all(6),
      child: GridView.count(
        crossAxisCount: 2,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
        children: folder.previews.take(4).map((p) {
          return BookCover(
            id: p.id,
            titulo: p.titulo,
            tienePortada: p.tienePortada,
            width: 45,
            height: 65,
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final folderProvider = context.watch<FolderProvider>();
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mis Carpetas')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.folder_special_outlined, size: 64, color: AppColors.darkAccent),
                const SizedBox(height: 16),
                Text(
                  'Inicia sesión para gestionar tus carpetas',
                  style: GoogleFonts.playfairDisplay(fontSize: 18, fontWeight: FontWeight.bold),
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
          'Carpetas',
          style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.create_new_folder_outlined),
            tooltip: 'Nueva Carpeta',
            onPressed: _showCreateDialog,
          ),
        ],
      ),
      body: folderProvider.isLoading && folderProvider.folders.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.darkAccent))
          : folderProvider.folders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.folder_off_outlined, size: 54, color: AppColors.darkTextSubtle),
                      const SizedBox(height: 12),
                      const Text(
                        'Aún no tienes carpetas creadas.',
                        style: TextStyle(color: AppColors.darkTextSubtle, fontSize: 15),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _showCreateDialog,
                        icon: const Icon(Icons.add),
                        label: const Text('Crear mi primera carpeta'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.darkAccent,
                          foregroundColor: const Color(0xFF1C1815),
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.85,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: folderProvider.folders.length,
                  itemBuilder: (context, index) {
                    final folder = folderProvider.folders[index];
                    return GestureDetector(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CarpetaDetailScreen(folder: folder),
                          ),
                        );
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              offset: const Offset(0, 4),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                                child: _buildFolderMosaic(folder, isDark),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    folder.nombre,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${folder.totalLibros} libros',
                                    style: const TextStyle(
                                      color: AppColors.darkTextSubtle,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
