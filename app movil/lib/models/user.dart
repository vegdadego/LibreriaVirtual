class User {
  final String id;
  final String nombreUsuario;
  final String correo;
  final String tipoUsuario; // 'lector', 'uploader', 'admin'

  User({
    required this.id,
    required this.nombreUsuario,
    required this.correo,
    required this.tipoUsuario,
  });

  bool get canUpload => tipoUsuario == 'uploader' || tipoUsuario == 'admin';
  bool get isAdmin => tipoUsuario == 'admin';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      nombreUsuario: json['nombre_usuario']?.toString() ?? json['nombre']?.toString() ?? '',
      correo: json['correo']?.toString() ?? json['email']?.toString() ?? '',
      tipoUsuario: json['tipo_usuario']?.toString() ?? json['rol']?.toString() ?? 'lector',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre_usuario': nombreUsuario,
      'correo': correo,
      'tipo_usuario': tipoUsuario,
    };
  }
}
