import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ReaderSettingsProvider extends ChangeNotifier {
  double _fontSize = 18.0;
  bool _isSerif = true;
  double _brightness = 1.0;
  bool _showProgressBar = true;
  bool _isCascadeMode = false;
  String _paragraphSpacing = 'fina'; // 'sin_espacio', 'fina', 'amplia'
  ThemeMode _themeMode = ThemeMode.dark;

  double get fontSize => _fontSize;
  bool get isSerif => _isSerif;
  double get brightness => _brightness;
  bool get showProgressBar => _showProgressBar;
  bool get isCascadeMode => _isCascadeMode;
  String get paragraphSpacing => _paragraphSpacing;
  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _fontSize = prefs.getDouble('reader_font_size') ?? 18.0;
    _isSerif = prefs.getBool('reader_is_serif') ?? true;
    _brightness = prefs.getDouble('reader_brightness') ?? 1.0;
    _showProgressBar = prefs.getBool('reader_show_progress') ?? true;
    _isCascadeMode = prefs.getBool('reader_is_cascade') ?? false;
    _paragraphSpacing = prefs.getString('reader_spacing') ?? 'fina';
    
    final savedTheme = prefs.getString('app_theme_mode');
    if (savedTheme == 'light') {
      _themeMode = ThemeMode.light;
    } else {
      _themeMode = ThemeMode.dark;
    }

    notifyListeners();
  }

  Future<void> setFontSize(double size) async {
    _fontSize = size.clamp(14.0, 30.0);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('reader_font_size', _fontSize);
  }

  Future<void> toggleFontFamily() async {
    _isSerif = !_isSerif;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('reader_is_serif', _isSerif);
  }

  Future<void> setBrightness(double b) async {
    _brightness = b.clamp(0.3, 1.0);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('reader_brightness', _brightness);
  }

  Future<void> toggleProgressBar() async {
    _showProgressBar = !_showProgressBar;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('reader_show_progress', _showProgressBar);
  }

  Future<void> setCascadeMode(bool cascade) async {
    _isCascadeMode = cascade;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('reader_is_cascade', _isCascadeMode);
  }

  Future<void> setParagraphSpacing(String spacing) async {
    _paragraphSpacing = spacing;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('reader_spacing', _paragraphSpacing);
  }

  Future<void> toggleThemeMode() async {
    _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_theme_mode', _themeMode == ThemeMode.dark ? 'dark' : 'light');
  }
}
