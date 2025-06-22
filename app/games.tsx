import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { gameService } from '../lib/gameService';
import { supabase } from '../lib/supabase';
import { GameMode, GameType } from '../types/game';

export default function Games() {
  const [gameCode, setGameCode] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [gameToCreate, setGameToCreate] = useState<{ mode: GameMode; type: GameType } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateGame = async (mode: GameMode, type: GameType, teamSize?: number) => {
    if (mode === 'Classic' && !teamSize) {
      setGameToCreate({ mode, type });
      setModalVisible(true);
      return;
    }

    setIsLoading(true);
    setModalVisible(false);

    try {
      const newGameCode = await gameService.createGame(mode, type, teamSize);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found");

      // Navigate to the lobby
      router.push({
        pathname: '/lobby',
        params: { 
          game_code: newGameCode, 
          game_mode: mode, 
          host_id: user.id 
        },
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      Alert.alert('Error Creating Game', message);
    } finally {
      setIsLoading(false);
      setGameToCreate(null);
    }
  };

  const handleJoinGame = () => {
    // Placeholder for functionality
    alert(`Joining game with code: ${gameCode}`);
  };

  const TeamSizeModal = () => (
    <Modal
      visible={isModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Team Size</Text>
          {[1, 2, 3, 4, 5].map((size) => (
            <TouchableOpacity
              key={size}
              style={styles.modalButton}
              onPress={() => gameToCreate && handleCreateGame(gameToCreate.mode, gameToCreate.type, size)}>
              <Text style={styles.modalButtonText}>{`${size} v ${size}`}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setModalVisible(false)}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        <TeamSizeModal />
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
        {isLoading && (
            <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Creating Game...</Text>
            </View>
        )}
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#4A4A4A',
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF6B35',
    marginTop: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
}); 