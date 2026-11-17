class BookPage {
  final String libroId;
  final String titulo;
  final int pagina;
  final String texto;
  final int totalPaginas;
  final int? inicioContenido;
  final int? anterior;
  final int? siguiente;

  BookPage({
    required this.libroId,
    required this.titulo,
    required this.pagina,
    required this.texto,
    required this.totalPaginas,
    this.inicioContenido,
    this.anterior,
    this.siguiente,
  });

  factory BookPage.fromJson(Map<String, dynamic> json) {
    return BookPage(
      libroId: json['libro_id']?.toString() ?? '',
      titulo: json['titulo']?.toString() ?? '',
      pagina: json['pagina'] is int ? json['pagina'] : int.tryParse(json['pagina']?.toString() ?? '1') ?? 1,
      texto: json['texto']?.toString() ?? '',
      totalPaginas: json['total_paginas'] is int ? json['total_paginas'] : int.tryParse(json['total_paginas']?.toString() ?? '1') ?? 1,
      inicioContenido: json['inicio_contenido'] is int ? json['inicio_contenido'] : int.tryParse(json['inicio_contenido']?.toString() ?? ''),
      anterior: json['anterior'] is int ? json['anterior'] : int.tryParse(json['anterior']?.toString() ?? ''),
      siguiente: json['siguiente'] is int ? json['siguiente'] : int.tryParse(json['siguiente']?.toString() ?? ''),
    );
  }
}
