import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View, useColorScheme, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../../../navigation/types";
import { colors, radii, spacing } from "../../../theme";
import { Button } from "../../../components/ui/Button";
import { Typography } from "../../../components/ui/Typography";

type DocumentViewerRouteProp = RouteProp<RootStackParamList, "DocumentViewer">;

export function DocumentViewerScreen() {
  const route = useRoute<DocumentViewerRouteProp>();
  const { t } = useTranslation();
  const { url, mimeType, title } = route.params;
  const isDark = useColorScheme() === "dark";
  const [error, setError] = useState<string | null>(null);
  const mode = isDark ? "dark" : "light";

  const renderLoading = () => (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background[mode] }]}>
      <ActivityIndicator size="large" color={colors.primary[mode]} />
    </View>
  );

  const openInBrowser = () => {
    void Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background[mode] }]}>
      <View style={[styles.toolbar, { backgroundColor: colors.surface[mode], borderColor: colors.border[mode] }]}>
        <View style={styles.toolbarCopy}>
          <Typography variant="label" color="primary">
            {mimeType === "application/pdf" ? t("Documents.pdf", { defaultValue: "PDF" }) : t("Documents.file", { defaultValue: "Document" })}
          </Typography>
          <Typography variant="bodyStrong" numberOfLines={1}>
            {title ?? "Document"}
          </Typography>
        </View>
        <Button title={t("Documents.openExternal", { defaultValue: "Open" })} variant="secondary" onPress={openInBrowser} style={styles.openButton} />
      </View>

      <View style={[styles.viewerContainer, { backgroundColor: isDark ? colors.palette.ink[900] : colors.surfaceMuted.light }]}>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          containerStyle={styles.webviewContainer}
          startInLoadingState={true}
          renderLoading={renderLoading}
          onLoad={() => setError(null)}
          onError={(e) => {
            setError(e.nativeEvent.description || t("Documents.viewerError", { defaultValue: "Could not load document." }));
          }}
        />
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.surface[mode] }]}>
            <Typography variant="body" color="error" style={styles.errorText}>{error}</Typography>
            <Button title={t("Documents.openExternal", { defaultValue: "Open externally" })} onPress={openInBrowser} variant="secondary" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  toolbarCopy: {
    flex: 1,
  },
  openButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  viewerContainer: {
    flex: 1,
    padding: spacing.sm,
  },
  webviewContainer: {
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    textAlign: "center",
  },
});
