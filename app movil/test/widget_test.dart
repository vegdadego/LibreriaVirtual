import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:libreria_virtual_app/main.dart';
import 'package:libreria_virtual_app/providers/auth_provider.dart';
import 'package:libreria_virtual_app/providers/downloads_provider.dart';
import 'package:libreria_virtual_app/providers/folder_provider.dart';
import 'package:libreria_virtual_app/providers/library_provider.dart';
import 'package:libreria_virtual_app/providers/reader_settings_provider.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => DownloadsProvider()),
          ChangeNotifierProvider(create: (_) => ReaderSettingsProvider()),
          ChangeNotifierProvider(create: (_) => LibraryProvider()),
          ChangeNotifierProvider(create: (_) => FolderProvider()),
        ],
        child: const LibreriaVirtualApp(),
      ),
    );

    expect(find.byType(LibreriaVirtualApp), findsOneWidget);
  });
}
