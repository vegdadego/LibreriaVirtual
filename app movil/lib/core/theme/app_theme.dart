import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get darkTheme {
    final base = ThemeData.dark(useMaterial3: true);
    final textTheme = GoogleFonts.outfitTextTheme(base.textTheme).apply(
      bodyColor: AppColors.darkText,
      displayColor: AppColors.darkText,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.darkBg,
      primaryColor: AppColors.darkAccent,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.darkAccent,
        secondary: AppColors.darkAccent,
        surface: AppColors.darkCardBg,
        onSurface: AppColors.darkText,
        outline: AppColors.darkBorder,
      ),
      textTheme: textTheme.copyWith(
        displayLarge: GoogleFonts.playfairDisplay(
          color: AppColors.darkText,
          fontWeight: FontWeight.bold,
          fontSize: 28,
        ),
        displayMedium: GoogleFonts.playfairDisplay(
          color: AppColors.darkText,
          fontWeight: FontWeight.w700,
          fontSize: 22,
        ),
        displaySmall: GoogleFonts.playfairDisplay(
          color: AppColors.darkText,
          fontWeight: FontWeight.w600,
          fontSize: 18,
        ),
        headlineMedium: GoogleFonts.playfairDisplay(
          color: AppColors.darkAccent,
          fontWeight: FontWeight.bold,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkBg.withValues(alpha: 0.95),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.playfairDisplay(
          color: AppColors.darkAccent,
          fontWeight: FontWeight.bold,
          fontSize: 20,
        ),
        iconTheme: const IconThemeData(color: AppColors.darkAccent),
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkCardBg,
        elevation: 3,
        shadowColor: Colors.black.withValues(alpha: 0.6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.darkBorder, width: 1),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.darkCardBg,
        selectedItemColor: AppColors.darkAccent,
        unselectedItemColor: AppColors.darkTextSubtle,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.darkCardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.darkBorder, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    final base = ThemeData.light(useMaterial3: true);
    final textTheme = GoogleFonts.outfitTextTheme(base.textTheme).apply(
      bodyColor: AppColors.lightText,
      displayColor: AppColors.lightText,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.lightBg,
      primaryColor: AppColors.lightAccent,
      colorScheme: const ColorScheme.light(
        primary: AppColors.lightAccent,
        secondary: AppColors.lightAccent,
        surface: AppColors.lightCardBg,
        onSurface: AppColors.lightText,
        outline: AppColors.lightBorder,
      ),
      textTheme: textTheme.copyWith(
        displayLarge: GoogleFonts.playfairDisplay(
          color: AppColors.lightText,
          fontWeight: FontWeight.bold,
          fontSize: 28,
        ),
        displayMedium: GoogleFonts.playfairDisplay(
          color: AppColors.lightText,
          fontWeight: FontWeight.w700,
          fontSize: 22,
        ),
        displaySmall: GoogleFonts.playfairDisplay(
          color: AppColors.lightText,
          fontWeight: FontWeight.w600,
          fontSize: 18,
        ),
        headlineMedium: GoogleFonts.playfairDisplay(
          color: AppColors.lightAccent,
          fontWeight: FontWeight.bold,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.lightBg.withValues(alpha: 0.95),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.playfairDisplay(
          color: AppColors.lightAccent,
          fontWeight: FontWeight.bold,
          fontSize: 20,
        ),
        iconTheme: const IconThemeData(color: AppColors.lightAccent),
      ),
      cardTheme: CardThemeData(
        color: AppColors.lightCardBg,
        elevation: 2,
        shadowColor: const Color(0x335F3E1E),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.lightBorder, width: 1),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.lightCardBg,
        selectedItemColor: AppColors.lightAccent,
        unselectedItemColor: AppColors.lightTextSubtle,
        type: BottomNavigationBarType.fixed,
        elevation: 6,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.lightCardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.lightBorder, width: 1.5),
        ),
      ),
    );
  }
}
