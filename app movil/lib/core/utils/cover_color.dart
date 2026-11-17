import 'package:flutter/material.dart';

class CoverColor {
  /// Genera un color consistente basado en el título del libro, simulando encuadernación de tela/cuero clásico
  static Color getColorForTitle(String title) {
    if (title.isEmpty) return const Color(0xFF4A3525);

    int hash = 0;
    for (int i = 0; i < title.length; i++) {
      hash = title.codeUnitAt(i) + ((hash << 5) - hash);
    }

    final double hue = (hash.abs() % 360).toDouble();
    // Saturación moderada y luminosidad profunda como las tapas duras antiguas
    return HSLColor.fromAHSL(1.0, hue, 0.35, 0.28).toColor();
  }
}
