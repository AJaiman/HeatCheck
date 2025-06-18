import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function Profile() {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Logout Error', error.message);
      } else {
        Alert.alert('Success', 'Logged out successfully!');
        // Redirect to index page after successful logout
        router.replace('/');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Track your basketball journey!</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A', // Dark background
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35', // Basketball orange
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 50,
  },
  logoutButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 