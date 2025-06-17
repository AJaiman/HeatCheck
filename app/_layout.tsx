import { Stack } from "expo-router";
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
          fontWeight: 'bold',
        },
      })}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
      <Tabs.Screen name="games" options={{ title: 'Games' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
