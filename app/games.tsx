import { View, Text, StyleSheet } from 'react-native';

export default function Games() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Games</Text>
      <Text style={styles.subtitle}>Challenge yourself and compete!</Text>
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
  },
}); 