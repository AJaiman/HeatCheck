import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default function Games() {
  const [gameCode, setGameCode] = useState('');

  const handleCreateGame = (mode: string, type: 'Casual' | 'Ranked') => {
    // Placeholder for functionality
    alert(`Creating a ${type} ${mode} game!`);
  };

  const handleJoinGame = () => {
    // Placeholder for functionality
    alert(`Joining game with code: ${gameCode}`);
  };

  const GameModeCard = ({
    icon,
    title,
    description,
    onPressCreate,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    onPressCreate: (type: 'Casual' | 'Ranked') => void;
  }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={32} color="#FF6B35" />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.gameButton, styles.casualButton]}
          onPress={() => onPressCreate('Casual')}>
          <Text style={styles.gameButtonText}>Casual</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gameButton, styles.rankedButton]}
          onPress={() => onPressCreate('Ranked')}>
          <Text style={styles.gameButtonText}>Ranked</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Join Game Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join a Game</Text>
          <View style={styles.joinContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#888"
              value={gameCode}
              onChangeText={setGameCode}
              maxLength={6}
              keyboardType="default"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinGame}>
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Game Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create a Game</Text>
          <GameModeCard
            icon="basketball-outline"
            title="Classic"
            description="The traditional 5v5 basketball experience. Play for points with standard rules."
            onPressCreate={(type) => handleCreateGame('Classic', type)}
          />
          <GameModeCard
            icon="flame-outline"
            title="21"
            description="A fast-paced, individual challenge. First to 21 points wins. Make it, take it."
            onPressCreate={(type) => handleCreateGame('21', type)}
          />
          <GameModeCard
            icon="trophy-outline"
            title="King of the Court"
            description="Winner stays on the court. Challenge the reigning king in this 1v1 showdown."
            onPressCreate={(type) => handleCreateGame('King of the Court', type)}
          />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  joinButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gameButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  casualButton: {
    backgroundColor: '#4A4A4A',
    marginRight: 10,
  },
  rankedButton: {
    backgroundColor: '#FF6B35',
  },
  gameButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 