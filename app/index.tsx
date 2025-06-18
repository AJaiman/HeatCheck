import React from 'react';
import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuthState();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Show loading while checking auth state
  if (isAuthenticated === null) {
    return (
      <LinearGradient
        colors={['#FF6B35', '#E55A2B', '#1A1A1A']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={styles.title}>Loading...</Text>
      </LinearGradient>
    );
  }

  // Redirect to profile if authenticated
  if (isAuthenticated) {
    return <Redirect href="/profile" />;
  }

  // Show login if not authenticated
  return <AuthForms />;
}

function AuthForms() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <LinearGradient
      colors={['#FF6B35', '#E55A2B', '#1A1A1A']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {showLogin ? <Login onSwitchToSignUp={() => setShowLogin(false)} /> : <SignUp onSwitchToLogin={() => setShowLogin(true)} />}
    </LinearGradient>
  );
}

function Login({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
      } else {
        Alert.alert('Success', 'Logged in successfully!');
        // The auth state change will automatically redirect to profile
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchButton} onPress={onSwitchToSignUp}>
        <Text style={styles.switchButtonText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </>
  );
}

function SignUp({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [hoopName, setHoopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!hoopName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            hoop_name: hoopName,
          }
        }
      });

      if (error) {
        Alert.alert('Sign Up Error', error.message);
      } else {
        Alert.alert('Success', 'Account created successfully! Please check your email to verify your account.');
        // Clear the form
        setHoopName('');
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Text style={styles.title}>Sign Up</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Hoop Name"
        placeholderTextColor="#666"
        value={hoopName}
        onChangeText={setHoopName}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchButton} onPress={onSwitchToLogin}>
        <Text style={styles.switchButtonText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for better contrast on gradient
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    width: '80%',
    height: 50,
    borderColor: '#FF6B35',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent white
    color: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  switchButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});