import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/data/auth_state.dart';

/// Placeholder home for the Customer role; Restaurant/Menu/Cart/Order land in Phase 06.
class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthState>().logout(),
          ),
        ],
      ),
      body: const Center(child: Text('Restaurant / Menu / Cart / Order — Phase 06')),
    );
  }
}
