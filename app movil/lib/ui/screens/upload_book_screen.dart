import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/library_provider.dart';

class UploadBookScreen extends StatefulWidget {
  const UploadBookScreen({super.key});

  @override
  State<UploadBookScreen> createState() => _UploadBookScreenState();
}

class _UploadBookScreenState extends State<UploadBookScreen> {
  File? _selectedPdf;
  String? _stageId;
  bool _isUploadingPdf = false;
  bool _isFinalizing = false;
  String? _statusText;
  String? _errorMessage;

  // Campos del formulario
  final _tituloCtrl = TextEditingController();
  final _autoresCtrl = TextEditingController();
  final _categoriasCtrl = TextEditingController();
  final _editorialCtrl = TextEditingController();
  final _sagaCtrl = TextEditingController();
  final _edicionCtrl = TextEditingController();
  final _sinopsisCtrl = TextEditingController();
  String _idioma = 'es';

  // Portada extraída por el servidor en base64
  String? _coverBase64;

  @override
  void dispose() {
    _tituloCtrl.dispose();
    _autoresCtrl.dispose();
    _categoriasCtrl.dispose();
    _editorialCtrl.dispose();
    _sagaCtrl.dispose();
    _edicionCtrl.dispose();
    _sinopsisCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAndStagePdf() async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );

    if (files.isEmpty || files.first.path == null) return;

    final file = File(files.first.path!);
    setState(() {
      _selectedPdf = file;
      _isUploadingPdf = true;
      _statusText = 'Subiendo y analizando PDF...';
      _errorMessage = null;
    });

    try {
      final res = await ApiClient().stagePdf(file);
      if (res['data'] is Map) {
        final data = res['data'];
        final stageId = data['stageId']?.toString();
        final analisis = data['analisis'] as Map<String, dynamic>?;
        final portada = data['portada'] as Map<String, dynamic>?;

        setState(() {
          _stageId = stageId;
          _isUploadingPdf = false;
          _statusText = 'PDF preparado con éxito';

          // Autocompletar sugerencias del servidor
          if (analisis != null) {
            if (analisis['titulo'] != null) {
              _tituloCtrl.text = analisis['titulo'].toString();
            }
            if (analisis['autores'] is List) {
              _autoresCtrl.text = (analisis['autores'] as List).join(', ');
            }
            if (analisis['categorias'] is List) {
              _categoriasCtrl.text = (analisis['categorias'] as List).join(', ');
            }
            if (analisis['empresa_edicion'] != null) {
              _editorialCtrl.text = analisis['empresa_edicion'].toString();
            }
            if (analisis['saga'] != null) {
              _sagaCtrl.text = analisis['saga'].toString();
            }
            if (analisis['numero_edicion'] != null) {
              _edicionCtrl.text = analisis['numero_edicion'].toString();
            }
            if (analisis['sinopsis'] != null) {
              _sinopsisCtrl.text = analisis['sinopsis'].toString();
            }
            if (analisis['idioma'] != null) {
              _idioma = analisis['idioma'].toString();
            }
          }

          if (portada != null && portada['base64'] != null) {
            _coverBase64 = portada['base64'].toString();
          }
        });
      }
    } catch (e) {
      setState(() {
        _isUploadingPdf = false;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _submitBook() async {
    if (_stageId == null || _tituloCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor sube un PDF y asigna un título')),
      );
      return;
    }

    setState(() {
      _isFinalizing = true;
      _errorMessage = null;
    });

    try {
      final categorias = _categoriasCtrl.text.isNotEmpty
          ? _categoriasCtrl.text.split(',').map((c) => c.trim()).where((c) => c.isNotEmpty).toList()
          : <String>[];
      final autores = _autoresCtrl.text.isNotEmpty
          ? _autoresCtrl.text.split(',').map((a) => a.trim()).where((a) => a.isNotEmpty).toList()
          : <String>[];

      await ApiClient().uploadWithStage(
        stageId: _stageId!,
        titulo: _tituloCtrl.text.trim(),
        sinopsis: _sinopsisCtrl.text.trim(),
        idioma: _idioma,
        empresaEdicion: _editorialCtrl.text.trim(),
        numeroEdicion: int.tryParse(_edicionCtrl.text.trim()),
        categorias: categorias,
        autores: autores,
        saga: _sagaCtrl.text.trim(),
        usarPortadaPdf: true,
      );

      if (mounted) {
        context.read<LibraryProvider>().loadMyBooks();
        context.read<LibraryProvider>().loadHomeData();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Libro publicado con éxito en la biblioteca!'),
            backgroundColor: AppColors.darkWood1,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() {
        _isFinalizing = false;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Subir Libro en PDF',
          style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Sección de selección de archivo
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
              ),
              child: Column(
                children: [
                  const Icon(Icons.picture_as_pdf_outlined, size: 48, color: AppColors.darkAccent),
                  const SizedBox(height: 10),
                  Text(
                    _selectedPdf != null
                        ? _selectedPdf!.path.split(Platform.pathSeparator).last
                        : 'Selecciona un libro en PDF con texto',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  if (_isUploadingPdf) ...[
                    const CircularProgressIndicator(color: AppColors.darkAccent),
                    const SizedBox(height: 8),
                    Text(_statusText ?? '', style: const TextStyle(fontSize: 12, color: AppColors.darkAccent)),
                  ] else ...[
                    ElevatedButton.icon(
                      onPressed: _pickAndStagePdf,
                      icon: const Icon(Icons.file_upload_outlined),
                      label: Text(_selectedPdf == null ? 'Elegir archivo PDF' : 'Cambiar PDF'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.darkAccent,
                        foregroundColor: const Color(0xFF1C1815),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
                ),
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent)),
              ),
            ],

            // Si ya se procesó el PDF, mostrar portada y formulario
            if (_stageId != null) ...[
              const SizedBox(height: 24),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Vista previa de portada
                  if (_coverBase64 != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.memory(
                        base64Decode(_coverBase64!),
                        width: 90,
                        height: 130,
                        fit: BoxFit.cover,
                      ),
                    ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Metadatos detectados',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'El servidor ha leído el texto y la primera página para sugerir los campos. Puedes corregirlos libremente.',
                          style: TextStyle(color: AppColors.darkTextSubtle, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Formulario
              TextField(
                controller: _tituloCtrl,
                decoration: const InputDecoration(
                  labelText: 'Título del libro *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _autoresCtrl,
                decoration: const InputDecoration(
                  labelText: 'Autores (separados por coma)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _categoriasCtrl,
                decoration: const InputDecoration(
                  labelText: 'Categorías (ej. Fantasía, Historia, Ciencia)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _editorialCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Editorial',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _edicionCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'N.º Edición',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _sagaCtrl,
                decoration: const InputDecoration(
                  labelText: 'Saga (opcional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _sinopsisCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Sinopsis o resumen',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: _isFinalizing ? null : _submitBook,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.darkAccent,
                  foregroundColor: const Color(0xFF1C1815),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _isFinalizing
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(color: Color(0xFF1C1815)),
                      )
                    : const Text(
                        'Publicar Libro en la Biblioteca',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ],
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
