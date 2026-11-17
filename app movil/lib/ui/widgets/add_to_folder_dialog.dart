import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/book.dart';
import '../../providers/folder_provider.dart';

class AddToFolderDialog extends StatefulWidget {
  final Book book;

  const AddToFolderDialog({super.key, required this.book});

  @override
  State<AddToFolderDialog> createState() => _AddToFolderDialogState();
}

class _AddToFolderDialogState extends State<AddToFolderDialog> {
  final _newFolderController = TextEditingController();
  bool _isCreating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FolderProvider>().loadFolders();
    });
  }

  @override
  void dispose() {
    _newFolderController.dispose();
    super.dispose();
  }

  void _handleCreateFolder() async {
    final name = _newFolderController.text.trim();
    if (name.isEmpty) return;

    final folderProvider = context.read<FolderProvider>();
    final ok = await folderProvider.createFolder(name, bookId: widget.book.id);
    if (ok) {
      _newFolderController.clear();
      setState(() => _isCreating = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Carpeta "$name" creada')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final folderProvider = context.watch<FolderProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1.5,
        ),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.folder_special_outlined, color: AppColors.darkAccent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Guardar en carpeta',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              widget.book.titulo,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                fontSize: 13,
              ),
            ),
            const Divider(height: 24),

            if (folderProvider.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(color: AppColors.darkAccent),
                ),
              )
            else if (folderProvider.folders.isEmpty && !_isCreating)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No tienes carpetas creadas.',
                    style: TextStyle(
                      color: isDark ? AppColors.darkTextSubtle : AppColors.lightTextSubtle,
                    ),
                  ),
                ),
              )
            else
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: folderProvider.folders.length,
                  itemBuilder: (context, index) {
                    final folder = folderProvider.folders[index];
                    final isInFolder = folder.libroIds.contains(widget.book.id);

                    return CheckboxListTile(
                      value: isInFolder,
                      title: Text(folder.nombre),
                      subtitle: Text('${folder.totalLibros} libros'),
                      activeColor: AppColors.darkAccent,
                      checkColor: const Color(0xFF1C1815),
                      onChanged: (val) async {
                        if (val == true) {
                          await folderProvider.addBookToFolder(folder.id, widget.book.id);
                        } else {
                          await folderProvider.removeBookFromFolder(folder.id, widget.book.id);
                        }
                      },
                    );
                  },
                ),
              ),

            const SizedBox(height: 12),

            if (_isCreating) ...[
              TextField(
                controller: _newFolderController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Nombre de la nueva carpeta',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => setState(() => _isCreating = false),
                    child: const Text('Cancelar'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _handleCreateFolder,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.darkAccent,
                      foregroundColor: const Color(0xFF1C1815),
                    ),
                    child: const Text('Crear y Guardar'),
                  ),
                ],
              ),
            ] else ...[
              OutlinedButton.icon(
                onPressed: () => setState(() => _isCreating = true),
                icon: const Icon(Icons.create_new_folder_outlined, size: 18),
                label: const Text('Nueva Carpeta'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.darkAccent,
                  side: const BorderSide(color: AppColors.darkAccent),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
