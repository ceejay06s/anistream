import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>
          Last Updated: {new Date().toLocaleDateString()}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Educational Purpose</Text>
          <Text style={styles.paragraph}>
            This application is developed and provided solely for educational purposes. 
            It is intended to demonstrate web and mobile application development concepts, 
            including but not limited to user authentication, data management, and 
            third-party service integration.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Data Collection</Text>
          <Text style={styles.paragraph}>
            We are committed to protecting your privacy. This application collects 
            minimal data necessary for basic functionality:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Google Authentication Data:</Text> When you 
              sign in using Google Authentication, we receive basic profile information 
              including your name, email address, and profile picture. This information 
              is provided by Google and is necessary for account creation and 
              authentication purposes.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>No Additional Data Collection:</Text> We do 
              not collect, store, or process any personal data beyond what is provided 
              through Google Authentication. We do not track your browsing behavior, 
              collect analytics data, or store any other personal information.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            This application relies on various third-party services to function. 
            These services may have their own privacy policies and data collection 
            practices:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Google (Firebase):</Text> Used for user 
              authentication and account management. Google's privacy policy applies 
              to data processed through their services.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Content Delivery Services:</Text> The 
              application may use third-party services for content delivery and 
              streaming. These services may collect technical information such as IP 
              addresses and device information as part of their standard operations.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Storage Services:</Text> File storage may 
              be handled by third-party providers (such as Backblaze B2 or Firebase 
              Storage). These services maintain their own privacy and data handling 
              policies.
            </Text>
          </View>
          <Text style={styles.paragraph}>
            We encourage you to review the privacy policies of these third-party 
            services to understand how they handle your data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Usage</Text>
          <Text style={styles.paragraph}>
            The limited data we receive through Google Authentication is used solely 
            for:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• User account creation and management</Text>
            <Text style={styles.bulletPoint}>• Personalizing your experience within the app</Text>
            <Text style={styles.bulletPoint}>• Enabling core application features</Text>
          </View>
          <Text style={styles.paragraph}>
            We do not sell, rent, or share your data with any third parties for 
            marketing or commercial purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.paragraph}>
            While this is an educational application, we implement reasonable security 
            measures to protect your information. However, please be aware that no 
            method of transmission over the internet or electronic storage is 100% 
            secure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Access the personal information we have about you</Text>
            <Text style={styles.bulletPoint}>• Request deletion of your account and associated data</Text>
            <Text style={styles.bulletPoint}>• Withdraw consent for data processing</Text>
          </View>
          <Text style={styles.paragraph}>
            To exercise these rights, please contact us through the application or 
            delete your account through the account settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            This application is not intended for users under the age of 13. We do not 
            knowingly collect personal information from children under 13. If you are 
            a parent or guardian and believe your child has provided us with personal 
            information, please contact us to have that information removed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. Any changes will be 
            posted on this page with an updated "Last Updated" date. We encourage you 
            to review this policy periodically.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy or our data practices, 
            please contact us through the application's support channels.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Disclaimer</Text>
          <Text style={styles.paragraph}>
            This application is provided "as is" for educational purposes. By using 
            this application, you acknowledge that it is an educational project and 
            agree to use it at your own risk.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using this application, you acknowledge that you have read and 
            understood this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 48 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 48 : 16,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    lineHeight: Platform.OS === 'web' ? 24 : 20,
    color: '#ccc',
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    lineHeight: Platform.OS === 'web' ? 24 : 20,
    color: '#ccc',
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  footerText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    lineHeight: Platform.OS === 'web' ? 22 : 18,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
