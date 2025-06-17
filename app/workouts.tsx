import { View, Text, StyleSheet } from 'react-native';

export default function Workouts() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workouts</Text>
      <Text style={styles.subtitle}>Get ready to dominate the court!</Text>
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