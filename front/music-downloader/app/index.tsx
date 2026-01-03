import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useState } from "react";

export default function Index() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!url) {
      Alert.alert("Error", "Ingresa un link de Spotify");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:8000/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const blob = await response.blob();

      console.log("Archivo recibido:", blob);

      Alert.alert("Listo", "Descarga completada (archivo recibido)");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo descargar");
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
