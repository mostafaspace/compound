import type { ApiEnvelope, AuthenticatedUser, DocumentType, LoginResult, VerificationRequest } from "@compound/contracts";
import { errorCodes, isErrorWithCode, pick, types } from "@react-native-documents/picker";
import * as Keychain from "react-native-keychain";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
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
  ios: "http://localhost:8000/api/v1",
  default: "http://localhost:8000/api/v1",
});

const authTokenService = "compound.mobile.authToken";

const actionItems = [
  { label: "Visitor QR", detail: "Create or revoke guest passes" },
  { label: "Payments", detail: "Submit receipts and view balance" },
  { label: "Complaints", detail: "Track issues and responses" },
  { label: "Announcements", detail: "Read official board updates" },
];

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isResident(user: AuthenticatedUser | null): boolean {
  return user?.role === "resident_owner" || user?.role === "resident_tenant";
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRefreshingRequests, setIsRefreshingRequests] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => defaultApiBaseUrl,
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
          setIsLoadingStatus(false);
        }
      }
    }

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const credentials = await Keychain.getGenericPassword({ service: authTokenService });

        if (!credentials) {
          return;
        }

        const restoredUser = await loadCurrentUser(credentials.password);

        if (!restoredUser) {
          await Keychain.resetGenericPassword({ service: authTokenService });
          return;
        }

        if (isMounted) {
          setAuthToken(credentials.password);
          setUser(restoredUser);
        }

        await Promise.all([
          loadVerificationRequests(credentials.password),
          loadDocumentTypes(credentials.password),
        ]);
      } catch {
        await Keychain.resetGenericPassword({ service: authTokenService });
      } finally {
        if (isMounted) {
          setIsRestoringSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function loadCurrentUser(token: string): Promise<AuthenticatedUser | null> {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<AuthenticatedUser>;

    return payload.data;
  }

  async function loadVerificationRequests(token = authToken) {
    if (!token) {
      return;
    }

    setIsRefreshingRequests(true);

    try {
      const response = await fetch(`${apiBaseUrl}/my/verification-requests`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setVerificationRequests([]);
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<VerificationRequest[]>;
      setVerificationRequests(payload.data);
    } finally {
      setIsRefreshingRequests(false);
    }
  }

  async function loadDocumentTypes(token = authToken) {
    if (!token) {
      return;
    }

    const response = await fetch(`${apiBaseUrl}/document-types`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setDocumentTypes([]);
      setSelectedDocumentTypeId(null);
      return;
    }

    const payload = (await response.json()) as ApiEnvelope<DocumentType[]>;
    setDocumentTypes(payload.data);
    setSelectedDocumentTypeId((current) => current ?? payload.data[0]?.id ?? null);
  }

  async function handleLogin() {
    setAuthError(null);
    setIsSigningIn(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        body: JSON.stringify({
          deviceName: Platform.OS === "web" ? "Mobile web" : `${Platform.OS} app`,
          email: email.trim(),
          password,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setAuthError("Email or password is incorrect, or the account cannot sign in yet.");
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<LoginResult>;
      setAuthToken(payload.data.token);
      setUser(payload.data.user);
      setPassword("");
      await Keychain.setGenericPassword(payload.data.user.email, payload.data.token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: authTokenService,
      });

      await Promise.all([
        loadVerificationRequests(payload.data.token),
        loadDocumentTypes(payload.data.token),
      ]);
    } catch {
      setAuthError("Could not reach the compound API.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    await Keychain.resetGenericPassword({ service: authTokenService });
    setAuthToken(null);
    setUser(null);
    setVerificationRequests([]);
    setDocumentTypes([]);
    setSelectedDocumentTypeId(null);
    setPassword("");
    setAuthError(null);
    setUploadMessage(null);
  }

  async function handlePickAndUploadDocument() {
    if (!authToken || !selectedDocumentTypeId) {
      return;
    }

    setUploadMessage(null);
    setIsUploadingDocument(true);

    try {
      const [document] = await pick({
        allowMultiSelection: false,
        type: [types.pdf, types.images],
      });

      if (!document.hasRequestedType) {
        setUploadMessage("Select a PDF or image file.");
        return;
      }

      const formData = new FormData();
      const uploadFile = {
        name: document.name ?? "verification-document",
        type: document.type ?? "application/octet-stream",
        uri: document.uri,
      };

      formData.append("documentTypeId", String(selectedDocumentTypeId));

      if (latestRequest?.unitId) {
        formData.append("unitId", latestRequest.unitId);
      }

      formData.append("file", uploadFile as unknown as Blob);

      const response = await fetch(`${apiBaseUrl}/documents`, {
        body: formData,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        method: "POST",
      });

      if (!response.ok) {
        setUploadMessage("Upload failed. Check the file size and document type.");
        return;
      }

      setUploadMessage("Document uploaded for admin review.");
      await loadVerificationRequests(authToken);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

      setUploadMessage("Document upload could not be completed.");
    } finally {
      setIsUploadingDocument(false);
    }
  }

  const latestRequest = verificationRequests[0] ?? null;
  const isPending = user?.status === "pending_review";
  const isActiveResident = user?.status === "active" && isResident(user);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Compound</Text>
          <Text style={styles.title}>Resident workspace</Text>
          <Text style={styles.subtitle}>Unit access, verification, visitors, finance, complaints, and official updates.</Text>
        </View>

        <View style={styles.statusPanel}>
          <View>
            <Text style={styles.panelLabel}>API status</Text>
            <Text style={styles.panelValue}>
              {isLoadingStatus ? "Checking" : status?.status === "ok" ? "Online" : "Offline"}
            </Text>
          </View>
          <View style={[styles.statusDot, status?.status === "ok" && styles.statusDotOnline]} />
        </View>

        {!user && isRestoringSession ? (
          <View style={styles.panel}>
            <ActivityIndicator color="#116a57" />
            <Text style={styles.sectionText}>Restoring resident session.</Text>
          </View>
        ) : null}

        {!user && !isRestoringSession ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Sign in</Text>
            <Text style={styles.sectionText}>Use the email and password from your accepted invitation.</Text>
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
                onChangeText={setEmail}
                placeholder="resident@example.com"
                style={styles.input}
                value={email}
              />
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                style={styles.input}
                value={password}
              />
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={isSigningIn || !email.trim() || !password}
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSigningIn) && styles.primaryButtonPressed,
                  (!email.trim() || !password) && styles.disabledButton,
                ]}
              >
                {isSigningIn ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}

        {user && !isResident(user) ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Resident account required</Text>
            <Text style={styles.sectionText}>This mobile workspace is only available to resident owner and tenant accounts.</Text>
            <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </View>
        ) : null}

        {user && isPending ? (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.panelLabel}>Verification</Text>
                <Text style={styles.sectionTitle}>Pending review</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void loadVerificationRequests()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{isRefreshingRequests ? "Refreshing" : "Refresh"}</Text>
              </Pressable>
            </View>

            {latestRequest ? (
              <View style={styles.reviewBlock}>
                <Text style={styles.statusBadge}>{formatStatus(latestRequest.status)}</Text>
                <Text style={styles.sectionText}>Requested access: {formatStatus(latestRequest.requestedRole)}</Text>
                <Text style={styles.sectionText}>Submitted: {formatDate(latestRequest.submittedAt)}</Text>
                {latestRequest.unit ? <Text style={styles.sectionText}>Unit: {latestRequest.unit.unitNumber}</Text> : null}
                {latestRequest.moreInfoNote ? (
                  <View style={styles.infoPanel}>
                    <Text style={styles.infoTitle}>More information requested</Text>
                    <Text style={styles.infoText}>{latestRequest.moreInfoNote}</Text>
                  </View>
                ) : null}
                {latestRequest.decisionNote ? (
                  <View style={styles.infoPanel}>
                    <Text style={styles.infoTitle}>Reviewer note</Text>
                    <Text style={styles.infoText}>{latestRequest.decisionNote}</Text>
                  </View>
                ) : null}
                {latestRequest.status === "more_info_requested" ? (
                  <View style={styles.uploadPanel}>
                    <Text style={styles.infoTitle}>Upload follow-up document</Text>
                    {documentTypes.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.documentTypeRow}>
                        {documentTypes.map((documentType) => (
                          <Pressable
                            accessibilityRole="button"
                            key={documentType.id}
                            onPress={() => setSelectedDocumentTypeId(documentType.id)}
                            style={[
                              styles.documentTypeChip,
                              selectedDocumentTypeId === documentType.id && styles.documentTypeChipSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.documentTypeText,
                                selectedDocumentTypeId === documentType.id && styles.documentTypeTextSelected,
                              ]}
                            >
                              {documentType.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.infoText}>No active document types are available yet.</Text>
                    )}
                    {uploadMessage ? <Text style={styles.infoText}>{uploadMessage}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={isUploadingDocument || !selectedDocumentTypeId}
                      onPress={() => void handlePickAndUploadDocument()}
                      style={[
                        styles.primaryButton,
                        (isUploadingDocument || !selectedDocumentTypeId) && styles.disabledButton,
                      ]}
                    >
                      {isUploadingDocument ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Choose and upload</Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.sectionText}>No verification request is linked to this account yet.</Text>
            )}

            <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Sign out</Text>
            </Pressable>
          </View>
        ) : null}

        {isActiveResident ? (
          <>
            <View style={styles.welcomePanel}>
              <Text style={styles.panelLabel}>Signed in</Text>
              <Text style={styles.sectionTitle}>{user.name}</Text>
              <Text style={styles.sectionText}>{formatStatus(user.role)} account is active.</Text>
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

            <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </>
        ) : null}

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
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  welcomePanel: {
    backgroundColor: "#e6f3ef",
    borderColor: "#b7d8ce",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
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
  sectionTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },
  sectionText: {
    color: "#5b6472",
    fontSize: 15,
    lineHeight: 22,
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
  form: {
    gap: 10,
  },
  inputLabel: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#c8ced7",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  errorText: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#116a57",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    backgroundColor: "#0a4f41",
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#116a57",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#116a57",
    fontSize: 15,
    fontWeight: "800",
  },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  linkButtonText: {
    color: "#116a57",
    fontSize: 15,
    fontWeight: "800",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  reviewBlock: {
    gap: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f3ead7",
    borderRadius: 8,
    color: "#7a4f10",
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: "capitalize",
  },
  infoPanel: {
    backgroundColor: "#eaf0ff",
    borderColor: "#b9c9ef",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  infoTitle: {
    color: "#244a8f",
    fontSize: 15,
    fontWeight: "800",
  },
  infoText: {
    color: "#263b5e",
    fontSize: 14,
    lineHeight: 20,
  },
  uploadPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#b9c9ef",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  documentTypeRow: {
    gap: 8,
    paddingRight: 8,
  },
  documentTypeChip: {
    borderColor: "#c8ced7",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  documentTypeChipSelected: {
    backgroundColor: "#116a57",
    borderColor: "#116a57",
  },
  documentTypeText: {
    color: "#384252",
    fontSize: 13,
    fontWeight: "800",
  },
  documentTypeTextSelected: {
    color: "#ffffff",
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
    backgroundColor: "#eef1f5",
    borderRadius: 8,
    padding: 18,
  },
  footerText: {
    color: "#384252",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
});
