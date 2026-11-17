class Book {
  final String id;
  final String titulo;
  final List<String> autores;
  final List<String> categorias;
  final String? sinopsis;
  final int totalPaginas;
  final bool tienePortada;
  final int? inicioContenido;
  final String? empresaEdicion;
  final String? fechaPublicacion;
  final int? numeroEdicion;
  final String? saga;
  final int? numeroEnSaga;
  final String? idioma;

  // Campos calculados o de progreso personal
  final int? leidas;
  final int? progress; // 0 - 100

  Book({
    required this.id,
    required this.titulo,
    this.autores = const [],
    this.categorias = const [],
    this.sinopsis,
    this.totalPaginas = 0,
    this.tienePortada = false,
    this.inicioContenido,
    this.empresaEdicion,
    this.fechaPublicacion,
    this.numeroEdicion,
    this.saga,
    this.numeroEnSaga,
    this.idioma,
    this.leidas,
    this.progress,
  });

  factory Book.fromJson(Map<String, dynamic> json) {
    // Autores puede venir como lista de objetos [{"nombre": "..."}] o lista de strings
    List<String> parsedAutores = [];
    if (json['autores'] is List) {
      for (final a in json['autores']) {
        if (a is Map && a['nombre'] != null) {
          parsedAutores.add(a['nombre'].toString());
        } else if (a != null) {
          parsedAutores.add(a.toString());
        }
      }
    }

    // Categorias como lista de strings
    List<String> parsedCategorias = [];
    if (json['categorias'] is List) {
      parsedCategorias = (json['categorias'] as List).map((c) => c.toString()).toList();
    }

    final id = json['_id']?.toString() ?? json['id']?.toString() ?? json['libro_id']?.toString() ?? '';
    final totalPaginas = json['total_paginas'] is int ? json['total_paginas'] as int : (int.tryParse(json['total_paginas']?.toString() ?? '') ?? 0);
    final leidas = json['pagina_actual'] is int ? json['pagina_actual'] as int : (int.tryParse(json['pagina_actual']?.toString() ?? '') ?? json['leidas']);

    int? calcProgress;
    if (json['progress'] is int) {
      calcProgress = json['progress'];
    } else if (leidas != null && totalPaginas > 0) {
      calcProgress = ((leidas / totalPaginas) * 100).round().clamp(0, 100);
    }

    return Book(
      id: id,
      titulo: json['titulo']?.toString() ?? 'Sin título',
      autores: parsedAutores,
      categorias: parsedCategorias,
      sinopsis: json['sinopsis']?.toString(),
      totalPaginas: totalPaginas,
      tienePortada: json['tiene_portada'] == true || json['portada'] != null,
      inicioContenido: json['inicio_contenido'] is int ? json['inicio_contenido'] : int.tryParse(json['inicio_contenido']?.toString() ?? ''),
      empresaEdicion: json['empresa_edicion']?.toString(),
      fechaPublicacion: json['fecha_publicacion']?.toString(),
      numeroEdicion: json['numero_edicion'] is int ? json['numero_edicion'] : int.tryParse(json['numero_edicion']?.toString() ?? ''),
      saga: json['saga']?.toString(),
      numeroEnSaga: json['numero_en_saga'] is int ? json['numero_en_saga'] : int.tryParse(json['numero_en_saga']?.toString() ?? ''),
      idioma: json['idioma']?.toString(),
      leidas: leidas,
      progress: calcProgress,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'titulo': titulo,
      'autores': autores,
      'categorias': categorias,
      'sinopsis': sinopsis,
      'total_paginas': totalPaginas,
      'tiene_portada': tienePortada,
      'inicio_contenido': inicioContenido,
      'empresa_edicion': empresaEdicion,
      'fecha_publicacion': fechaPublicacion,
      'numero_edicion': numeroEdicion,
      'saga': saga,
      'numero_en_saga': numeroEnSaga,
      'idioma': idioma,
      'leidas': leidas,
      'progress': progress,
    };
  }

  Book copyWith({
    int? leidas,
    int? progress,
  }) {
    return Book(
      id: id,
      titulo: titulo,
      autores: autores,
      categorias: categorias,
      sinopsis: sinopsis,
      totalPaginas: totalPaginas,
      tienePortada: tienePortada,
      inicioContenido: inicioContenido,
      empresaEdicion: empresaEdicion,
      fechaPublicacion: fechaPublicacion,
      numeroEdicion: numeroEdicion,
      saga: saga,
      numeroEnSaga: numeroEnSaga,
      idioma: idioma,
      leidas: leidas ?? this.leidas,
      progress: progress ?? this.progress,
    );
  }
}
