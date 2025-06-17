import { Stack } from "expo-router";
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'workouts') {
            iconName = 'barbell-outline';
          } else if (route.name === 'games') {
            iconName = 'trophy-outline';
          } else if (route.name === 'profile') {
            iconName = 'person-outline';
          } else {
            iconName = 'ellipse'; // fallback
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B35', // Basketball orange
        tabBarInactiveTintColor: '#666666', // Dark gray
        tabBarStyle: {
          backgroundColor: '#1A1A1A', // Dark background
          borderTopColor: '#333333',
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: '#FF6B35', // Basketball orange header
        },
        headerTintColor: '#FFFFFF', // White text
        headerTitleStyle: {
          fontWeight: '900', // Extra bold for sporty look
          fontSize: 28, // Bigger font size
          fontFamily: 'System', // System font for better weight support
        },
        headerTitle: 'HeatCheck',
        headerTitleAlign: 'left', // Ensure left alignment
        headerRight: () => (
          <View style={styles.profileContainer}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={20} color="#FF6B35" />
            </View>
          </View>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
      <Tabs.Screen name="games" options={{ title: 'Games' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
