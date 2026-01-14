import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { Directory, File } from "expo-file-system";
import { useState } from "react";

export default function Index() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!BACKEND) {
    Alert.alert("Config error", "Backend URL is not set");
    return null;
  }

  const handleDownload = async () => {
    if (!url) {
      Alert.alert("Error", "Please enter a Spotify URL");
      return;
    }

    try {
      setLoading(true);

      // 1) User chooses destination
      const destination = await Directory.pickDirectoryAsync();
      if (!destination) {
        Alert.alert("Error", "No destination selected");
        return;
      }

      // 2) Start backend job
      const startRes = await fetch(
        `${BACKEND}/start_download?url=${encodeURIComponent(url)}`,
        { method: "POST" }
      );

      if (!startRes.ok) {
        throw new Error(await startRes.text());
      }

      const { job_id } = await startRes.json();

      // 3) Poll backend
      const pollInterval = 2000;
      const maxPolls = 150;
      let polls = 0;

      while (polls < maxPolls) {
        polls++;
        await new Promise((r) => setTimeout(r, pollInterval));

        const statusRes = await fetch(`${BACKEND}/status/${job_id}`);
        if (!statusRes.ok) {
          throw new Error(await statusRes.text());
        }

        const status = await statusRes.json();

        if (status.status === "done") {
          // 4) Download directly into selected folder
          const file = await File.downloadFileAsync(
            `${BACKEND}/file/${job_id}`,
            destination,
            { idempotent: true }
          );

          console.log("Saved to:", file.uri);
          Alert.alert("Done", "Song downloaded successfully");
          return;
        }

        if (status.status === "error") {
          throw new Error(status.error || "Download failed");
        }
      }

      throw new Error("Download timeout");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message ?? "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#030327ff",
        padding: 20,
      }}
    >
      <Text style={{ color: "white", fontSize: 18, marginBottom: 10 }}>
        Enter a Spotify song link
      </Text>

      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="Paste Spotify link"
        placeholderTextColor="#aaa"
        style={{
          height: 45,
          width: "100%",
          borderWidth: 1,
          borderColor: "#555",
          borderRadius: 6,
          paddingHorizontal: 10,
          color: "white",
          backgroundColor: "#111",
        }}
      />

      <Pressable
        onPress={handleDownload}
        disabled={loading}
        style={{
          marginTop: 20,
          backgroundColor: "#007AFF",
          paddingVertical: 12,
          paddingHorizontal: 25,
          borderRadius: 6,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          {loading ? "Downloading..." : "Download"}
        </Text>
      </Pressable>
    </View>
  );
}
