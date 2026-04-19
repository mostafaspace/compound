import type { ApiEnvelope } from "@compound/contracts";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface SystemStatus {
  service: string;
  status: "ok" | "degraded" | "down";
  environment: string;
  timezone: string;
}

const defaultApiBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000/api/v1",
  default: "http://localhost:8000/api/v1",
});

const actionItems = [
  { label: "Visitor QR", detail: "Create or revoke guest passes" },
  { label: "Payments", detail: "Submit receipts and view balance" },
  { label: "Complaints", detail: "Track issues and responses" },
  { label: "Announcements", detail: "Read official board updates" },
];

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiBaseUrl = useMemo(
    () => process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch(`${apiBaseUrl}/status`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ApiEnvelope<SystemStatus>;

        if (isMounted) {
          setStatus(payload.data);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Compound</Text>
          <Text style={styles.title}>Resident and security workspace</Text>
          <Text style={styles.subtitle}>
            Unit access, visitors, finance, complaints, and official updates in one place.
          </Text>
        </View>

        <View style={styles.statusPanel}>
          <View>
            <Text style={styles.panelLabel}>API status</Text>
            <Text style={styles.panelValue}>
              {isLoading ? "Checking" : status?.status === "ok" ? "Online" : "Offline"}
            </Text>
          </View>
          <View style={[styles.statusDot, status?.status === "ok" && styles.statusDotOnline]} />
        </View>

        <View style={styles.grid}>
          {actionItems.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.label}
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
            >
              <Text style={styles.actionLabel}>{item.label}</Text>
              <Text style={styles.actionDetail}>{item.detail}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footerPanel}>
          <Text style={styles.panelLabel}>Environment</Text>
          <Text style={styles.footerText}>{status?.environment ?? "Not connected"}</Text>
          <Text style={styles.footerText}>{status?.timezone ?? "Timezone pending"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    gap: 8,
    paddingTop: 16,
  },
  kicker: {
    color: "#116a57",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    color: "#5b6472",
    fontSize: 16,
    lineHeight: 23,
  },
  statusPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  panelLabel: {
    color: "#5b6472",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  panelValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },
  statusDot: {
    backgroundColor: "#b42318",
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  statusDotOnline: {
    backgroundColor: "#116a57",
  },
  grid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  actionCardPressed: {
    borderColor: "#116a57",
    transform: [{ scale: 0.99 }],
  },
  actionLabel: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  actionDetail: {
    color: "#5b6472",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  footerPanel: {
    backgroundColor: "#e6f3ef",
    borderRadius: 8,
    padding: 18,
  },
  footerText: {
    color: "#0a4f41",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
});
