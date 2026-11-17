import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/page_parser.dart';
import '../../models/book.dart';
import '../../models/page_content.dart';
import '../../providers/downloads_provider.dart';
import '../../providers/library_provider.dart';
import '../../providers/reader_settings_provider.dart';

class ReaderScreen extends StatefulWidget {
  final Book book;
  final int initialPage;

  const ReaderScreen({
    super.key,
    required this.book,
    this.initialPage = 1,
  });

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  late int _currentPage;
  BookPage? _pageData;
  bool _isLoading = true;
  String? _errorMessage;
  Timer? _progressDebounce;

  @override
  void initState() {
    super.initState();
    _currentPage = widget.initialPage;
    _loadPage(_currentPage);
  }

  @override
  void dispose() {
    _progressDebounce?.cancel();
    super.dispose();
  }

  Future<void> _loadPage(int page) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final downloads = context.read<DownloadsProvider>();
      // 1. Verificar si está en la base de datos sin conexión
      BookPage? localPage = await downloads.getDownloadedPage(widget.book.id, page);

      if (localPage != null) {
        if (!mounted) return;
        setState(() {
          _currentPage = page;
          _pageData = localPage;
          _isLoading = false;
        });
        _scheduleProgressSync(page);
        return;
      }

      // 2. Si no, consultar la API online
      final res = await ApiClient().get('/books/${widget.book.id}/paginas/$page');
      if (res['data'] is Map) {
        if (!mounted) return;
        setState(() {
          _currentPage = page;
          _pageData = BookPage.fromJson(res['data']);
          _isLoading = false;
        });
        _scheduleProgressSync(page);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _scheduleProgressSync(int page) {
    _progressDebounce?.cancel();
    _progressDebounce = Timer(const Duration(milliseconds: 900), () {
      if (mounted) {
        final total = _pageData?.totalPaginas ?? widget.book.totalPaginas;
        context.read<LibraryProvider>().updateReadingProgress(widget.book.id, page, total);
      }
    });
  }

  void _jumpToPageDialog() {
    final total = _pageData?.totalPaginas ?? widget.book.totalPaginas;
    final controller = TextEditingController(text: '$_currentPage');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ir a la página'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'Número de página (1 a $total)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final target = int.tryParse(controller.text);
              if (target != null && target >= 1 && target <= total) {
                Navigator.pop(ctx);
                _loadPage(target);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.darkAccent,
              foregroundColor: const Color(0xFF1C1815),
            ),
            child: const Text('Ir'),
          ),
        ],
      ),
    );
  }

  void _openSettingsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => const _ReaderSettingsModal(),
    );
  }

  Widget _buildBlock(PageBlock block, ReaderSettingsProvider settings, bool isDark) {
    final textStyle = (settings.isSerif
            ? GoogleFonts.playfairDisplay(fontSize: settings.fontSize)
            : GoogleFonts.outfit(fontSize: settings.fontSize))
        .copyWith(
      color: AppColors.readerInk,
      height: 1.6,
    );

    double spacing = 14.0;
    if (settings.paragraphSpacing == 'sin_espacio') spacing = 4.0;
    if (settings.paragraphSpacing == 'amplia') spacing = 22.0;

    switch (block.type) {
      case BlockType.heading:
        return Padding(
          padding: EdgeInsets.symmetric(vertical: spacing + 4),
          child: Text(
            block.text,
            style: GoogleFonts.playfairDisplay(
              fontSize: settings.fontSize + 4,
              fontWeight: FontWeight.bold,
              color: AppColors.readerInk,
            ),
          ),
        );

      case BlockType.margin:
        return Container(
          margin: EdgeInsets.symmetric(vertical: spacing),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.05),
            border: const Border(
              left: BorderSide(color: AppColors.readerInkSoft, width: 3),
            ),
          ),
          child: Text(
            block.text,
            style: textStyle.copyWith(
              fontSize: settings.fontSize - 2,
              fontStyle: FontStyle.italic,
              color: AppColors.readerInkSoft,
            ),
          ),
        );

      case BlockType.list:
        return Padding(
          padding: EdgeInsets.symmetric(vertical: spacing),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: block.listItems.map((item) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('•  ', style: textStyle.copyWith(fontWeight: FontWeight.bold)),
                    Expanded(child: Text(item, style: textStyle)),
                  ],
                ),
              );
            }).toList(),
          ),
        );

      case BlockType.table:
        return Container(
          margin: EdgeInsets.symmetric(vertical: spacing),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.readerEdge),
            borderRadius: BorderRadius.circular(4),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Table(
              defaultColumnWidth: const IntrinsicColumnWidth(),
              border: TableBorder.all(color: AppColors.readerEdge),
              children: block.tableRows.map((row) {
                return TableRow(
                  children: row.map((cell) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Text(cell, style: textStyle.copyWith(fontSize: settings.fontSize - 2)),
                    );
                  }).toList(),
                );
              }).toList(),
            ),
          ),
        );

      case BlockType.empty:
        return Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Text(
              block.text,
              textAlign: TextAlign.center,
              style: textStyle.copyWith(
                color: AppColors.readerInkSoft,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        );

      case BlockType.prose:
        return Padding(
          padding: EdgeInsets.only(bottom: spacing),
          child: Text(
            block.text,
            textAlign: TextAlign.justify,
            style: textStyle,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<ReaderSettingsProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final paperBg1 = isDark ? AppColors.darkPaperBg1 : AppColors.lightPaperBg1;
    final paperBg2 = isDark ? AppColors.darkPaperBg2 : AppColors.lightPaperBg2;

    final totalPages = _pageData?.totalPaginas ?? widget.book.totalPaginas;
    final blocks = PageParser.parsePage(_pageData?.texto ?? '');

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: Text(
          widget.book.titulo,
          style: GoogleFonts.playfairDisplay(fontSize: 16),
        ),
        actions: [
          // Botón para saltar directo a página
          TextButton(
            onPressed: _jumpToPageDialog,
            child: Text(
              'Pág. $_currentPage / $totalPages',
              style: const TextStyle(
                color: AppColors.darkAccent,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          // Botón de ajustes de lectura
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Ajustes de lectura',
            onPressed: () => _openSettingsModal(context),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Hoja de lectura con textura de papel
          SafeArea(
            child: Center(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                constraints: const BoxConstraints(maxWidth: 720),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [paperBg1, paperBg2],
                  ),
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.6 : 0.25),
                      offset: const Offset(0, 10),
                      blurRadius: 24,
                    ),
                  ],
                  border: Border.all(
                    color: isDark ? AppColors.readerEdge.withValues(alpha: 0.6) : AppColors.lightBorder,
                    width: 1.2,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Stack(
                    children: [
                      // Sombra del lomo izquierdo del libro
                      Positioned(
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 12,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.black.withValues(alpha: 0.2),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Contenido de la página
                      _isLoading
                          ? const Center(
                              child: CircularProgressIndicator(color: AppColors.darkWood1),
                            )
                          : _errorMessage != null
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.error_outline, size: 44, color: Colors.redAccent),
                                      const SizedBox(height: 12),
                                      Text(
                                        _errorMessage!,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(color: AppColors.readerInk),
                                      ),
                                      const SizedBox(height: 12),
                                      ElevatedButton(
                                        onPressed: () => _loadPage(_currentPage),
                                        child: const Text('Reintentar'),
                                      ),
                                    ],
                                  ),
                                )
                              : Column(
                                  children: [
                                    Expanded(
                                      child: SingleChildScrollView(
                                        padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 24),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          children: blocks.map((b) => _buildBlock(b, settings, isDark)).toList(),
                                        ),
                                      ),
                                    ),
                                    // Folio al pie de página
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 12, top: 4),
                                      child: Text(
                                        '- $_currentPage -',
                                        textAlign: TextAlign.center,
                                        style: GoogleFonts.playfairDisplay(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.readerInkSoft,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Capa de atenuación de brillo (dimmer)
          if (settings.brightness < 1.0)
            IgnorePointer(
              child: Container(
                color: Colors.black.withValues(alpha: 1.0 - settings.brightness),
              ),
            ),
        ],
      ),
      bottomNavigationBar: settings.showProgressBar
          ? Container(
              height: 60,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
                    tooltip: 'Página anterior',
                    onPressed: _currentPage > 1 && !_isLoading ? () => _loadPage(_currentPage - 1) : null,
                  ),
                  Expanded(
                    child: Slider(
                      value: _currentPage.toDouble().clamp(1.0, totalPages.toDouble()),
                      min: 1.0,
                      max: totalPages > 1 ? totalPages.toDouble() : 1.0,
                      activeColor: AppColors.darkAccent,
                      inactiveColor: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      onChanged: (val) {
                        final page = val.round();
                        if (page != _currentPage) {
                          _loadPage(page);
                        }
                      },
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.arrow_forward_ios_rounded, size: 20),
                    tooltip: 'Página siguiente',
                    onPressed:
                        _currentPage < totalPages && !_isLoading ? () => _loadPage(_currentPage + 1) : null,
                  ),
                ],
              ),
            )
          : null,
    );
  }
}

class _ReaderSettingsModal extends StatelessWidget {
  const _ReaderSettingsModal();

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<ReaderSettingsProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      padding: const EdgeInsets.all(22),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Ajustes de Lectura',
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(height: 20),

            // Tamaño de fuente
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tamaño de letra:'),
                Text('${settings.fontSize.round()} pt', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            Slider(
              value: settings.fontSize,
              min: 14.0,
              max: 30.0,
              divisions: 8,
              activeColor: AppColors.darkAccent,
              onChanged: (v) => settings.setFontSize(v),
            ),

            // Tipografía Serif vs Sans
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tipografía:'),
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: true, label: Text('Serif')),
                    ButtonSegment(value: false, label: Text('Sans')),
                  ],
                  selected: {settings.isSerif},
                  onSelectionChanged: (set) => settings.toggleFontFamily(),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Brillo atenuado
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Brillo en pantalla:'),
                Text('${(settings.brightness * 100).round()}%',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            Slider(
              value: settings.brightness,
              min: 0.3,
              max: 1.0,
              activeColor: AppColors.darkAccent,
              onChanged: (v) => settings.setBrightness(v),
            ),

            // Mostrar barra de progreso inferior
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Barra de navegación inferior'),
              value: settings.showProgressBar,
              activeThumbColor: AppColors.darkAccent,
              onChanged: (_) => settings.toggleProgressBar(),
            ),
          ],
        ),
      ),
    );
  }
}
