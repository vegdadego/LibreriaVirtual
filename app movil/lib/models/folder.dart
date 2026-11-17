class FolderPreviewBook {
  final String id;
  final String titulo;
  final bool tienePortada;

  FolderPreviewBook({
    required this.id,
    required this.titulo,
    this.tienePortada = false,
  });

  factory FolderPreviewBook.fromJson(Map<String, dynamic> json) {
    return FolderPreviewBook(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      titulo: json['titulo']?.toString() ?? '',
      tienePortada: json['tiene_portada'] == true,
    );
  }
}

class Folder {
  final String id;
  final String nombre;
  final String? descripcion;
  final int totalLibros;
  final List<String> libroIds;
  final List<FolderPreviewBook> previews;

  Folder({
    required this.id,
    required this.nombre,
    this.descripcion,
    this.totalLibros = 0,
    this.libroIds = const [],
    this.previews = const [],
  });

  factory Folder.fromJson(Map<String, dynamic> json) {
    List<FolderPreviewBook> parsedPreviews = [];
    if (json['previews'] is List) {
      parsedPreviews = (json['previews'] as List)
          .map((p) => FolderPreviewBook.fromJson(p as Map<String, dynamic>))
          .toList();
    }

    List<String> parsedIds = [];
    if (json['libro_ids'] is List) {
      parsedIds = (json['libro_ids'] as List).map((id) => id.toString()).toList();
    }

    return Folder(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? 'Carpeta sin nombre',
      descripcion: json['descripcion']?.toString(),
      totalLibros: json['total_libros'] is int ? json['total_libros'] : int.tryParse(json['total_libros']?.toString() ?? '0') ?? 0,
      libroIds: parsedIds,
      previews: parsedPreviews,
    );
  }
}
