import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:deliveryplatform/main.dart';

void main() {
  testWidgets('shows the login screen when unauthenticated', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const DeliveryPlatformApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Login'), findsWidgets);
  });
}
