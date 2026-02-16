import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfServiceScreen() {
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
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
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using this application, you accept and agree to be bound 
            by the terms and provision of this agreement. If you do not agree to 
            abide by the above, please do not use this service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Educational Purpose</Text>
          <Text style={styles.paragraph}>
            This application is developed and provided <Text style={styles.bold}>
            solely for educational purposes</Text>. It is intended to demonstrate 
            web and mobile application development concepts, including user 
            authentication, data management, API integration, and third-party service 
            implementation.
          </Text>
          <Text style={styles.paragraph}>
            This application is not intended for commercial use, and no warranties or 
            guarantees are provided regarding its functionality, availability, or 
            suitability for any particular purpose.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            This application relies on various third-party services to function 
            properly. These services include but are not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Google (Firebase):</Text> For user 
              authentication, account management, and storage services
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Content Delivery Networks:</Text> For 
              streaming and content delivery
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Storage Providers:</Text> For file and 
              media storage (such as Backblaze B2, Firebase Storage)
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Content APIs:</Text> For accessing and 
              displaying content
            </Text>
          </View>
          <Text style={styles.paragraph}>
            By using this application, you acknowledge that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • The application's functionality depends on these third-party services
            </Text>
            <Text style={styles.bulletPoint}>
              • We are not responsible for the availability, performance, or policies 
              of these third-party services
            </Text>
            <Text style={styles.bulletPoint}>
              • Third-party services may have their own terms of service and privacy 
              policies that apply to your use
            </Text>
            <Text style={styles.bulletPoint}>
              • Service interruptions or changes by third-party providers may affect 
              the application's functionality
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Accounts</Text>
          <Text style={styles.paragraph}>
            To use certain features of this application, you may be required to create 
            an account using Google Authentication. You are responsible for:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Maintaining the confidentiality of your account credentials
            </Text>
            <Text style={styles.bulletPoint}>
              • All activities that occur under your account
            </Text>
            <Text style={styles.bulletPoint}>
              • Notifying us immediately of any unauthorized use of your account
            </Text>
          </View>
          <Text style={styles.paragraph}>
            We reserve the right to suspend or terminate accounts that violate these 
            terms or engage in harmful activities.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Collection and Privacy</Text>
          <Text style={styles.paragraph}>
            This application collects minimal data necessary for basic functionality. 
            We only collect basic information provided through Google Authentication 
            (name, email, profile picture). We do not collect any additional personal 
            data beyond what is required for authentication.
          </Text>
          <Text style={styles.paragraph}>
            For more information about our data practices, please review our Privacy 
            Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Acceptable Use</Text>
          <Text style={styles.paragraph}>
            You agree not to use this application to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Violate any applicable laws or regulations
            </Text>
            <Text style={styles.bulletPoint}>
              • Infringe upon the rights of others
            </Text>
            <Text style={styles.bulletPoint}>
              • Transmit harmful, offensive, or inappropriate content
            </Text>
            <Text style={styles.bulletPoint}>
              • Attempt to gain unauthorized access to the application or its systems
            </Text>
            <Text style={styles.bulletPoint}>
              • Interfere with or disrupt the application's functionality
            </Text>
            <Text style={styles.bulletPoint}>
              • Use the application for any commercial purposes
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The application code and design are provided for educational purposes. 
            Content displayed within the application (including but not limited to 
            images, videos, and text) may be subject to third-party copyrights and 
            intellectual property rights.
          </Text>
          <Text style={styles.paragraph}>
            This application does not claim ownership of any content displayed and is 
            intended solely for educational demonstration purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Disclaimer of Warranties</Text>
          <Text style={styles.paragraph}>
            This application is provided "as is" and "as available" for educational 
            purposes. We make no representations or warranties of any kind, express or 
            implied, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • The accuracy, reliability, or completeness of the application
            </Text>
            <Text style={styles.bulletPoint}>
              • The uninterrupted or error-free operation of the application
            </Text>
            <Text style={styles.bulletPoint}>
              • The security of the application or protection against viruses or 
              harmful components
            </Text>
            <Text style={styles.bulletPoint}>
              • The suitability of the application for any particular purpose
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the fullest extent permitted by law, we shall not be liable for any 
            indirect, incidental, special, consequential, or punitive damages, or any 
            loss of profits or revenues, whether incurred directly or indirectly, or 
            any loss of data, use, goodwill, or other intangible losses resulting from:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Your use or inability to use the application
            </Text>
            <Text style={styles.bulletPoint}>
              • Any third-party services or content accessed through the application
            </Text>
            <Text style={styles.bulletPoint}>
              • Unauthorized access to or alteration of your data
            </Text>
            <Text style={styles.bulletPoint}>
              • Any other matter relating to the application
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Service Modifications</Text>
          <Text style={styles.paragraph}>
            As this is an educational application, we reserve the right to modify, 
            suspend, or discontinue any part of the application at any time, with or 
            without notice. We are not obligated to maintain or support the 
            application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your access to the application immediately, 
            without prior notice or liability, for any reason, including if you breach 
            these Terms of Service. Upon termination, your right to use the application 
            will cease immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these terms at any time. We will notify 
            users of any material changes by updating the "Last Updated" date. Your 
            continued use of the application after such modifications constitutes 
            acceptance of the updated terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms of Service shall be governed by and construed in accordance 
            with applicable laws, without regard to conflict of law provisions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Severability</Text>
          <Text style={styles.paragraph}>
            If any provision of these Terms of Service is found to be unenforceable 
            or invalid, that provision shall be limited or eliminated to the minimum 
            extent necessary, and the remaining provisions shall remain in full force 
            and effect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms of Service, please contact us 
            through the application's support channels.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using this application, you acknowledge that you have read, understood, 
            and agree to be bound by these Terms of Service.
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
