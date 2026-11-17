enum BlockType {
  prose,
  heading,
  list,
  table,
  margin,
  empty,
}

class PageBlock {
  final BlockType type;
  final String text;
  final List<String> listItems;
  final List<List<String>> tableRows;

  PageBlock({
    required this.type,
    this.text = '',
    this.listItems = const [],
    this.tableRows = const [],
  });
}

class PageParser {
  /// Analiza el texto de una página y devuelve bloques tipográficos estructurados
  static List<PageBlock> parsePage(String rawText) {
    if (rawText.trim().isEmpty) {
      return [
        PageBlock(
          type: BlockType.empty,
          text: 'Esta página no contiene texto legible (puede tratarse de una ilustración o portada).',
        ),
      ];
    }

    final rawParagraphs = rawText.split(RegExp(r'\n\s*\n'));
    final List<PageBlock> blocks = [];

    for (var para in rawParagraphs) {
      final trimmed = para.trim();
      if (trimmed.isEmpty) continue;

      // 1. Detección de notas de margen: [[margen]] texto
      if (trimmed.startsWith('[[margen]]')) {
        final content = trimmed.replaceFirst('[[margen]]', '').trim();
        blocks.add(PageBlock(type: BlockType.margin, text: content));
        continue;
      }

      final lines = trimmed.split('\n').map((l) => l.trim()).toList();

      // 2. Detección de tablas Markdown (| col1 | col2 |)
      final isTable = lines.length >= 2 &&
          lines.every((l) => l.startsWith('|') && l.endsWith('|'));
      if (isTable) {
        final List<List<String>> rows = [];
        for (var line in lines) {
          // Ignorar fila de separación |---|---|
          if (line.replaceAll(RegExp(r'[\s\|\-]'), '').isEmpty) continue;
          final cells = line
              .split('|')
              .map((c) => c.trim())
              .where((c) => c.isNotEmpty)
              .toList();
          if (cells.isNotEmpty) {
            rows.add(cells);
          }
        }
        if (rows.isNotEmpty) {
          blocks.add(PageBlock(type: BlockType.table, tableRows: rows));
          continue;
        }
      }

      // 3. Detección de listas (viñetas •, -, * o números 1., 1))
      final isList = lines.every((l) =>
          RegExp(r'^([\u2022\-\*]|\d+[\.\)])\s+').hasMatch(l));
      if (isList && lines.isNotEmpty) {
        final items = lines.map((l) {
          return l.replaceFirst(RegExp(r'^([\u2022\-\*]|\d+[\.\)])\s+'), '');
        }).toList();
        blocks.add(PageBlock(type: BlockType.list, listItems: items));
        continue;
      }

      // 4. Detección de títulos (cortos, mayúsculas o tamaño especial)
      final isShortHeading = lines.length == 1 &&
          trimmed.length < 65 &&
          (trimmed == trimmed.toUpperCase() && trimmed.length > 3 ||
              trimmed.startsWith('# '));
      if (isShortHeading) {
        final headingText = trimmed.replaceFirst(RegExp(r'^#+\s*'), '');
        blocks.add(PageBlock(type: BlockType.heading, text: headingText));
        continue;
      }

      // 5. Prosa habitual (líneas unidas en un párrafo continuo)
      final joinedProse = lines.join(' ');
      blocks.add(PageBlock(type: BlockType.prose, text: joinedProse));
    }

    return blocks;
  }
}
