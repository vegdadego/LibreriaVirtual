import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../models/book.dart';
import '../../providers/auth_provider.dart';
import '../../providers/library_provider.dart';
import '../../providers/reader_settings_provider.dart';
import '../widgets/book_cover.dart';
import '../widgets/book_login_dialog.dart';
import '../widgets/shelf_widget.dart';
import 'book_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LibraryProvider>().loadHomeData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      context.read<LibraryProvider>().search(query);
    });
  }

  void _openBookDetail(Book book) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BookDetailScreen(book: book),
      ),
    );
  }

  void _showServerSettingsDialog() {
    final controller = TextEditingController(text: ApiClient().baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.usb_rounded, color: AppColors.darkAccent),
            SizedBox(width: 8),
            Text('Conexión con el Servidor'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'URL del Backend (Cable USB / Local):',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'URL del Backend',
                  hintText: ApiConstants.usbBaseUrl,
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Preajustes rápidos:',
                style: TextStyle(fontSize: 12, color: AppColors.darkTextSubtle),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.usb_rounded, size: 16),
                    label: const Text('Cable USB (127.0.0.1)', style: TextStyle(fontSize: 12)),
                    onPressed: () {
                      controller.text = ApiConstants.usbBaseUrl;
                    },
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.phone_android_rounded, size: 16),
                    label: const Text('Emulador (10.0.2.2)', style: TextStyle(fontSize: 12)),
                    onPressed: () {
                      controller.text = ApiConstants.emulatorBaseUrl;
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pasos para conectar por USB:',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '1. Conecta el teléfono por cable USB a la PC con "Depuración por USB" activada.\n'
                      '2. En la PC ejecuta: adb reverse tcp:8000 tcp:8000\n'
                      '3. Inicia el backend y pulsa "Guardar y Reconectar".',
                      style: TextStyle(fontSize: 11.5, height: 1.3),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              final newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                final lib = context.read<LibraryProvider>();
                await ApiClient().setBaseUrl(newUrl);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                }
                if (mounted) {
                  lib.loadHomeData();
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.darkAccent,
              foregroundColor: const Color(0xFF1C1815),
            ),
            child: const Text('Guardar y Reconectar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();
    final auth = context.watch<AuthProvider>();
    final settings = context.watch<ReaderSettingsProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.auto_stories_rounded, color: AppColors.darkAccent),
            const SizedBox(width: 8),
            Text(
              'Librería Virtual',
              style: GoogleFonts.playfairDisplay(
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ],
        ),
        actions: [
          // Configurar conexión con el servidor (Cable USB / Local)
          IconButton(
            tooltip: 'Configurar Conexión USB / Servidor',
            icon: const Icon(Icons.usb_rounded),
            onPressed: _showServerSettingsDialog,
          ),
          // Alternar tema claro / oscuro
          IconButton(
            tooltip: isDark ? 'Modo Claro' : 'Modo Oscuro',
            icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
            onPressed: () => settings.toggleThemeMode(),
          ),
          // Botón de sesión o avatar
          if (auth.isAuthenticated)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: GestureDetector(
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    builder: (ctx) => SafeArea(
                      child: Wrap(
                        children: [
                          ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: AppColors.darkAccent,
                              child: Icon(Icons.person, color: Color(0xFF1C1815)),
                            ),
                            title: Text(auth.user?.nombreUsuario ?? ''),
                            subtitle: Text('${auth.user?.correo} • Rol: ${auth.user?.tipoUsuario}'),
                          ),
                          const Divider(),
                          ListTile(
                            leading: const Icon(Icons.logout, color: Colors.redAccent),
                            title: const Text('Cerrar Sesión', style: TextStyle(color: Colors.redAccent)),
                            onTap: () {
                              Navigator.pop(ctx);
                              auth.logout();
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
                child: CircleAvatar(
                  radius: 16,
                  backgroundColor: AppColors.darkAccent,
                  child: Text(
                    (auth.user?.nombreUsuario.isNotEmpty ?? false)
                        ? auth.user!.nombreUsuario[0].toUpperCase()
                        : 'U',
                    style: const TextStyle(color: Color(0xFF1C1815), fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            )
          else
            TextButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (_) => const BookLoginDialog(),
                );
              },
              icon: const Icon(Icons.login, size: 18, color: AppColors.darkAccent),
              label: const Text('Ingresar', style: TextStyle(color: AppColors.darkAccent)),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(library.isSearching ? 65 : 110),
          child: Column(
            children: [
              // Buscador integrado
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Buscar por título, autor, saga, editorial...',
                    hintStyle: TextStyle(
                      color: isDark ? AppColors.darkTextSubtle : AppColors.lightTextSubtle,
                      fontSize: 14,
                    ),
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.darkAccent),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              library.clearSearch();
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(25),
                      borderSide: BorderSide(
                        color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(25),
                      borderSide: BorderSide(
                        color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      ),
                    ),
                  ),
                ),
              ),
              // Pestañas Estantes / Todos (solo si no está buscando)
              if (!library.isSearching)
                TabBar(
                  controller: _tabController,
                  indicatorColor: AppColors.darkAccent,
                  labelColor: AppColors.darkAccent,
                  unselectedLabelColor: isDark ? AppColors.darkTextSubtle : AppColors.lightTextSubtle,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                  tabs: const [
                    Tab(text: 'Estantes'),
                    Tab(text: 'Todos los Libros'),
                  ],
                ),
            ],
          ),
        ),
      ),
      body: library.isLoading && library.catalog.isEmpty
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.darkAccent),
            )
          : library.errorMessage != null && library.catalog.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.darkAccent),
                        const SizedBox(height: 16),
                        Text(
                          'No se pudo conectar al servidor',
                          style: GoogleFonts.playfairDisplay(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          library.errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.darkTextSubtle, fontSize: 13),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ElevatedButton.icon(
                              onPressed: () => library.loadHomeData(),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Reintentar'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.darkAccent,
                                foregroundColor: const Color(0xFF1C1815),
                              ),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              onPressed: _showServerSettingsDialog,
                              icon: const Icon(Icons.settings_ethernet),
                              label: const Text('Ajustar IP'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.darkAccent,
                                side: const BorderSide(color: AppColors.darkAccent),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
          : library.isSearching
              ? _buildSearchResults(library)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildShelvesView(library),
                    _buildCatalogGridView(library),
                  ],
                ),
    );
  }

  Widget _buildSearchResults(LibraryProvider library) {
    if (library.searchResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off, size: 54, color: AppColors.darkTextSubtle),
            const SizedBox(height: 12),
            Text(
              'No se encontraron libros para "${library.currentSearchQuery}"',
              style: const TextStyle(fontSize: 15, color: AppColors.darkTextSubtle),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.58,
        crossAxisSpacing: 14,
        mainAxisSpacing: 16,
      ),
      itemCount: library.searchResults.length,
      itemBuilder: (context, index) {
        final book = library.searchResults[index];
        return GestureDetector(
          onTap: () => _openBookDetail(book),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: BookCover(
                  id: book.id,
                  titulo: book.titulo,
                  tienePortada: book.tienePortada,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                book.titulo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildShelvesView(LibraryProvider library) {
    return RefreshIndicator(
      color: AppColors.darkAccent,
      onRefresh: () => library.loadHomeData(),
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          // 1. Estante Continuar Leyendo
          if (library.continueReading.isNotEmpty)
            ShelfWidget(
              title: 'Continuar leyendo',
              books: library.continueReading,
              onSelectBook: _openBookDetail,
            ),

          // 2. Estante Guardados para más tarde
          if (library.savedBooks.isNotEmpty)
            ShelfWidget(
              title: 'Guardados para más tarde',
              books: library.savedBooks,
              onSelectBook: _openBookDetail,
            ),

          // 3. Estante Novedades
          if (library.newArrivals.isNotEmpty)
            ShelfWidget(
              title: 'Novedades',
              books: library.newArrivals,
              onSelectBook: _openBookDetail,
            ),

          // 4. Estantes por categorías
          ...library.categoryShelves.entries.map((entry) {
            return ShelfWidget(
              title: entry.key,
              books: entry.value,
              onSelectBook: _openBookDetail,
            );
          }),
        ],
      ),
    );
  }

  Widget _buildCatalogGridView(LibraryProvider library) {
    if (library.catalog.isEmpty) {
      return const Center(child: Text('No hay libros disponibles en el catálogo.'));
    }

    return RefreshIndicator(
      color: AppColors.darkAccent,
      onRefresh: () => library.loadHomeData(),
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 0.58,
          crossAxisSpacing: 14,
          mainAxisSpacing: 16,
        ),
        itemCount: library.catalog.length,
        itemBuilder: (context, index) {
          final book = library.catalog[index];
          return GestureDetector(
            onTap: () => _openBookDetail(book),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: BookCover(
                    id: book.id,
                    titulo: book.titulo,
                    tienePortada: book.tienePortada,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  book.titulo,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
