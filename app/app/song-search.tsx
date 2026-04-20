import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { searchSpotifyTracks, updateProfile, type SpotifyTrackResult } from "@/lib/api";
import { useAppStore } from "@/store";

export default function SongSearchScreen() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { tracks } = await searchSpotifyTracks(query.trim());
      setResults(tracks);
    } catch {
      Alert.alert("エラー", "曲の検索に失敗しました");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelect = async (track: SpotifyTrackResult) => {
    try {
      await updateProfile({
        spotify_track_id: track.id,
        spotify_track_name: track.name,
        spotify_artist_name: track.artistName,
        spotify_album_image_url: track.albumImageUrl,
      });
      setProfile({
        spotifyTrackName: track.name,
        spotifyArtistName: track.artistName,
      });
      router.back();
    } catch {
      Alert.alert("エラー", "曲の設定に失敗しました");
    }
  };

  const handleClear = async () => {
    try {
      await updateProfile({
        spotify_track_id: null,
        spotify_track_name: null,
        spotify_artist_name: null,
        spotify_album_image_url: null,
      });
      setProfile({ spotifyTrackName: null, spotifyArtistName: null });
      router.back();
    } catch {
      Alert.alert("エラー", "設定の解除に失敗しました");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="曲名やアーティスト名で検索"
          placeholderTextColor="#BBB"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>検索</Text>
        </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.trackRow} onPress={() => handleSelect(item)}>
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.artistName}
              </Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>曲の設定を解除</Text>
          </Pressable>
        }
        ListEmptyComponent={
          !searching ? (
            <Text style={styles.emptyText}>
              曲名やアーティスト名で検索してください
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  searchBar: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  searchButton: {
    backgroundColor: "#E8734A",
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  trackArtist: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  clearButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  clearButtonText: {
    color: "#FF3B30",
    fontSize: 15,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 14,
  },
});
