import React from "react";
import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";
import { WebView } from "react-native-webview";
import { RouteProp, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../../../navigation/types";
import { colors } from "../../../theme";

type DocumentViewerRouteProp = RouteProp<RootStackParamList, "DocumentViewer">;

export function DocumentViewerScreen() {
  const route = useRoute<DocumentViewerRouteProp>();
  const { url } = route.params;
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.container, { backgroundColor: colors.background[isDark ? "dark" : "light"] }]}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background[isDark ? "dark" : "light"] }]}>
            <ActivityIndicator size="large" color={colors.primary[isDark ? "dark" : "light"]} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
});
