import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { supabase } from '../lib/supabase';

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

  // Animated value for fluid motion
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 16000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      })
    ).start();
  }, [anim]);

  // Interpolate control points for SVG paths
  const topQ = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [100, 80, 100] });
  const midQ = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [200, 220, 200] });
  const bottomQ = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [700, 720, 700] });
  const accentQ = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [350, 370, 350] });

  // State to hold the animated path strings
  const [paths, setPaths] = useState({
    top: 'M0,200 Q100,100 200,200 T400,200 L400,0 L0,0 Z',
    bottom: 'M0,600 Q200,700 400,600 L400,800 L0,800 Z',
    accent: 'M100,400 Q200,350 300,400 T400,500 Q300,550 200,500 T100,400 Z',
  });

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      // Calculate control points
      const tq = 100 + (Math.sin(value * Math.PI * 2) * 20); // 100 <-> 80
      const mq = 200 + (Math.cos(value * Math.PI * 2) * 20); // 200 <-> 220
      const bq = 700 + (Math.sin(value * Math.PI * 2 + 1) * 20); // 700 <-> 720
      const aq = 350 + (Math.cos(value * Math.PI * 2 + 2) * 20); // 350 <-> 370
      // Top path
      const top = `M0,200 Q100,${tq} 200,${mq} T400,200 L400,0 L0,0 Z`;
      // Bottom path
      const bottom = `M0,600 Q200,${bq} 400,600 L400,800 L0,800 Z`;
      // Accent blob
      const accent = `M100,400 Q200,${aq} 300,400 T400,500 Q300,550 200,500 T100,400 Z`;
      setPaths({ top, bottom, accent });
    });
    return () => anim.removeListener(id);
  }, [anim]);

  return (
    <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818' }}>
      {/* Fluid Geometry SVG Background */}
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 0 }} pointerEvents="none">
        <Svg height="100%" width="100%" viewBox="0 0 400 800" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <SvgLinearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.12" />
            </SvgLinearGradient>
            <SvgLinearGradient id="grad2" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.13" />
              <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0.10" />
            </SvgLinearGradient>
          </Defs>
          {/* Main fluid shape */}
          <Path d={paths.top} fill="url(#grad1)" />
          <Path d={paths.bottom} fill="url(#grad2)" />
          {/* Subtle accent blob */}
          <Path d={paths.accent} fill="#FF6B35" opacity="0.07" />
        </Svg>
      </View>
      <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
        {showLogin ? <Login onSwitchToSignUp={() => setShowLogin(false)} /> : <SignUp onSwitchToLogin={() => setShowLogin(true)} />}
      </View>
    </View>
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
            display_name: hoopName,
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