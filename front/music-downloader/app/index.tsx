import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { useState } from "react";

export default function Index() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!BACKEND) {
    Alert.alert("Config error", "Backend URL is not set");
    return;
  }

  const handleDownload = async () => {
    if (!url) {
      Alert.alert("Error", "Please enter a URL");
      return;
    }

    try {
      setLoading(true);
      console.log("Starting download for URL:", url);

      // 1) Start the job
      const startRes = await fetch(
        `${BACKEND}/start_download?url=${encodeURIComponent(url)}`,
        { method: "POST" }
      );
      console.log("Start response:", startRes);
      if (!startRes.ok) {
        const txt = await startRes.text();
        throw new Error(txt || "Could not start download");
      }
      const { job_id } = await startRes.json();
      console.log("Job started:", job_id);

      // 2) Polling (every 2s) until ready or error occurs
      let polling = true;
      const pollInterval = 2000;
      const maxPolls = 150; // about 5 minutes
      let polls = 0;

      while (polling && polls < maxPolls) {
        polls++;
        await new Promise((res) => setTimeout(res, pollInterval));

        const statusRes = await fetch(`${BACKEND}/status/${job_id}`);
        if (!statusRes.ok) {
          const txt = await statusRes.text();
          throw new Error(txt || "Error checking status");
        }
        const statusJson = await statusRes.json();
        console.log("Status:", statusJson);

        if (statusJson.status === "done") {
          polling = false;
          // 3) download file (quick request)
          const destination = new Directory(Paths.document, "music");
          if (!destination.exists) {
            await destination.create({ intermediates: true });
          }

          const output = await File.downloadFileAsync(
            `${BACKEND}/file/${job_id}`,
            destination
          );

          console.log("Saved to:", output.uri);
          Alert.alert("Done", "Song downloaded successfully");
          break;
        } else if (statusJson.status === "error") {
          polling = false;
          throw new Error(statusJson.error || "Error downloading song");
        } else {
          // still pending/running -> continue
          console.log("Still running...");
        }
      }

      if (polls >= maxPolls) {
        throw new Error("Timeout in polling (took too long)");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Download failed");
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
        style={{
          marginTop: 20,
          backgroundColor: "#007AFF",
          paddingVertical: 12,
          paddingHorizontal: 25,
          borderRadius: 6,
          opacity: loading ? 0.6 : 1,
        }}
        disabled={loading}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          {loading ? "Downloading..." : "Download"}
        </Text>
      </Pressable>
    </View>
  );
}
