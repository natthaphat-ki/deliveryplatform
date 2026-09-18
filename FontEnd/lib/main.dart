import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'features/auth/data/auth_state.dart';
import 'routes/app_router.dart';

void main() {
  runApp(const DeliveryPlatformApp());
}

class DeliveryPlatformApp extends StatelessWidget {
  const DeliveryPlatformApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState(),
      child: MaterialApp(
        title: 'Delivery Platform',
        theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple)),
        home: const AppRouter(),
      ),
    );
  }
}
