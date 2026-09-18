import 'package:shared_preferences/shared_preferences.dart';

/// Persists the JWT + role locally so the splash screen can restore a session.
class AuthStorage {
  static const _tokenKey = 'auth_token';
  static const _roleKey = 'auth_role';

  Future<void> saveSession({required String token, required String role}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_roleKey, role);
  }

  Future<({String token, String role})?> readSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final role = prefs.getString(_roleKey);
    if (token == null || role == null) return null;
    return (token: token, role: role);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_roleKey);
  }
}
