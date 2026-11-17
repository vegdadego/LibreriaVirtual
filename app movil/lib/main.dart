import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/downloads_provider.dart';
import 'providers/folder_provider.dart';
import 'providers/library_provider.dart';
import 'providers/reader_settings_provider.dart';
import 'ui/screens/carpetas_screen.dart';
import 'ui/screens/descargas_screen.dart';
import 'ui/screens/guardados_screen.dart';
import 'ui/screens/home_screen.dart';
import 'ui/screens/mis_libros_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final authProvider = AuthProvider();
  final downloadsProvider = DownloadsProvider();
  final settingsProvider = ReaderSettingsProvider();

  await authProvider.init();
  await downloadsProvider.init();
  await settingsProvider.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider.value(value: downloadsProvider),
        ChangeNotifierProvider.value(value: settingsProvider),
        ChangeNotifierProvider(create: (_) => LibraryProvider()),
        ChangeNotifierProvider(create: (_) => FolderProvider()),
      ],
      child: const LibreriaVirtualApp(),
    ),
  );
}

class LibreriaVirtualApp extends StatelessWidget {
  const LibreriaVirtualApp({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<ReaderSettingsProvider>();

    return MaterialApp(
      title: 'Biblioteca Virtual',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: settings.themeMode,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final canUpload = auth.user?.canUpload ?? false;

    final screens = [
      const HomeScreen(),
      const GuardadosScreen(),
      const CarpetasScreen(),
      const DescargasScreen(),
      if (canUpload) const MisLibrosScreen(),
    ];

    final navItems = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.shelves),
        activeIcon: Icon(Icons.shelves),
        label: 'Inicio',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.bookmark_outline),
        activeIcon: Icon(Icons.bookmark),
        label: 'Guardados',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.folder_outlined),
        activeIcon: Icon(Icons.folder),
        label: 'Carpetas',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.download_outlined),
        activeIcon: Icon(Icons.download_done_rounded),
        label: 'Descargas',
      ),
      if (canUpload)
        const BottomNavigationBarItem(
          icon: Icon(Icons.auto_stories_outlined),
          activeIcon: Icon(Icons.auto_stories),
          label: 'Mis Libros',
        ),
    ];

    // Evitar desbordamiento de índice si el usuario cierra sesión y desaparece la pestaña Mis Libros
    final safeIndex = _currentIndex >= screens.length ? 0 : _currentIndex;

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: safeIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: navItems,
      ),
    );
  }
}
