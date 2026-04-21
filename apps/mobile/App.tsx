import type {
  ApiEnvelope,
  AuthenticatedUser,
  CreateIssueInput,
  CreateVisitorRequestInput,
  DocumentType,
  Issue,
  LoginResult,
  PaginatedEnvelope,
  VerificationRequest,
  VisitorRequest,
} from "@compound/contracts";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { errorCodes, isErrorWithCode, pick, types } from "@react-native-documents/picker";
import * as Keychain from "react-native-keychain";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-native-qrcode-svg";
import {
  ActivityIndicator,
  useColorScheme,
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
const visitorTokenService = "compound.mobile.visitorPassTokens";

type VisitPickerTarget = "starts" | "ends";
type VisitPickerMode = "date" | "time" | "datetime";

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

function defaultVisitStartsAt(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

function defaultVisitEndsAt(): Date {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

function isResident(user: AuthenticatedUser | null): boolean {
  return user?.role === "resident_owner" || user?.role === "resident_tenant";
}

function isVisitorClosed(visitorRequest: VisitorRequest): boolean {
  return ["cancelled", "completed", "denied"].includes(visitorRequest.status);
}

function visitorLocation(visitorRequest: VisitorRequest): string {
  const unit = visitorRequest.unit;

  if (!unit) {
    return visitorRequest.unitId;
  }

  return [unit.compoundName, unit.buildingName, `Unit ${unit.unitNumber}`].filter(Boolean).join(" / ");
}

export default function App() {
  const { t } = useTranslation();
  const systemScheme = useColorScheme();
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | "system">("system");
  const isDark = themeOverride === "system" ? systemScheme === "dark" : themeOverride === "dark";
  const styles = getStyles(isDark);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [visitorRequests, setVisitorRequests] = useState<VisitorRequest[]>([]);
  const [visitorPassTokens, setVisitorPassTokens] = useState<Record<string, string>>({});
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorVehiclePlate, setVisitorVehiclePlate] = useState("");
  const [visitorNotes, setVisitorNotes] = useState("");
  const [visitStartsAt, setVisitStartsAt] = useState(defaultVisitStartsAt);
  const [visitEndsAt, setVisitEndsAt] = useState(defaultVisitEndsAt);
  const [visitPickerTarget, setVisitPickerTarget] = useState<VisitPickerTarget | null>(null);
  const [visitPickerMode, setVisitPickerMode] = useState<VisitPickerMode>("date");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRefreshingRequests, setIsRefreshingRequests] = useState(false);
  const [isRefreshingVisitors, setIsRefreshingVisitors] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isCreatingVisitor, setIsCreatingVisitor] = useState(false);
  const [isCancellingVisitorId, setIsCancellingVisitorId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [visitorMessage, setVisitorMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isRefreshingIssues, setIsRefreshingIssues] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueCategory, setIssueCategory] = useState<string>("maintenance");
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);

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
          setVisitorPassTokens(await loadVisitorPassTokens());
        }

        await Promise.all([
          loadVerificationRequests(credentials.password),
          loadDocumentTypes(credentials.password),
          loadVisitorRequests(credentials.password),
          loadIssues(credentials.password),
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

  async function loadVisitorPassTokens(): Promise<Record<string, string>> {
    const credentials = await Keychain.getGenericPassword({ service: visitorTokenService });

    if (!credentials) {
      return {};
    }

    try {
      return JSON.parse(credentials.password) as Record<string, string>;
    } catch {
      await Keychain.resetGenericPassword({ service: visitorTokenService });

      return {};
    }
  }

  async function saveVisitorPassTokens(nextTokens: Record<string, string>) {
    setVisitorPassTokens(nextTokens);
    await Keychain.setGenericPassword("visitor-pass-tokens", JSON.stringify(nextTokens), {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      service: visitorTokenService,
    });
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

  async function loadVisitorRequests(token = authToken) {
    if (!token) {
      return;
    }

    setIsRefreshingVisitors(true);

    try {
      const response = await fetch(`${apiBaseUrl}/visitor-requests`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setVisitorRequests([]);
        return;
      }

      const payload = (await response.json()) as PaginatedEnvelope<VisitorRequest>;
      setVisitorRequests(payload.data);
    } finally {
      setIsRefreshingVisitors(false);
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

  function resetVisitorForm() {
    setVisitorName("");
    setVisitorPhone("");
    setVisitorVehiclePlate("");
    setVisitorNotes("");
    setVisitStartsAt(defaultVisitStartsAt());
    setVisitEndsAt(defaultVisitEndsAt());
    setVisitPickerTarget(null);
    setVisitPickerMode("date");
  }

  function openVisitPicker(target: VisitPickerTarget) {
    setVisitPickerTarget(target);
    setVisitPickerMode(Platform.OS === "ios" ? "datetime" : "date");
  }

  function updateVisitWindow(target: VisitPickerTarget, value: Date) {
    if (target === "starts") {
      setVisitStartsAt(value);
      return;
    }

    setVisitEndsAt(value);
  }

  function handleVisitPickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (!visitPickerTarget) {
      return;
    }

    if (event.type === "dismissed" || !selectedDate) {
      setVisitPickerTarget(null);
      setVisitPickerMode("date");
      return;
    }

    const currentValue = visitPickerTarget === "starts" ? visitStartsAt : visitEndsAt;
    const nextValue = new Date(currentValue);

    if (Platform.OS === "android" && visitPickerMode === "date") {
      nextValue.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      updateVisitWindow(visitPickerTarget, nextValue);
      setVisitPickerMode("time");
      return;
    }

    if (Platform.OS === "android" && visitPickerMode === "time") {
      nextValue.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      updateVisitWindow(visitPickerTarget, nextValue);
      setVisitPickerTarget(null);
      setVisitPickerMode("date");
      return;
    }

    updateVisitWindow(visitPickerTarget, selectedDate);
  }

  async function handleCreateVisitor(unitId: string) {
    if (!authToken || !visitorName.trim()) {
      return;
    }

    if (visitEndsAt <= visitStartsAt) {
      setVisitorMessage("Visit end time must be after the start time.");
      return;
    }

    setVisitorMessage(null);
    setIsCreatingVisitor(true);

    try {
      const input: CreateVisitorRequestInput = {
        notes: visitorNotes.trim() || undefined,
        unitId,
        vehiclePlate: visitorVehiclePlate.trim() || undefined,
        visitEndsAt: visitEndsAt.toISOString(),
        visitStartsAt: visitStartsAt.toISOString(),
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
      };

      const response = await fetch(`${apiBaseUrl}/visitor-requests`, {
        body: JSON.stringify(input),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setVisitorMessage("Visitor pass could not be created. Check the visit window and unit access.");
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<VisitorRequest>;
      const nextVisitorRequests = [payload.data, ...visitorRequests.filter((visitor) => visitor.id !== payload.data.id)];
      setVisitorRequests(nextVisitorRequests);

      if (payload.data.qrToken) {
        await saveVisitorPassTokens({
          ...visitorPassTokens,
          [payload.data.id]: payload.data.qrToken,
        });
      }

      setVisitorMessage("Visitor pass created. Show the QR code at the gate.");
      resetVisitorForm();
    } catch {
      setVisitorMessage("Could not reach the visitor service.");
    } finally {
      setIsCreatingVisitor(false);
    }
  }

  async function handleCancelVisitor(visitorRequestId: string) {
    if (!authToken) {
      return;
    }

    setVisitorMessage(null);
    setIsCancellingVisitorId(visitorRequestId);

    try {
      const response = await fetch(`${apiBaseUrl}/visitor-requests/${visitorRequestId}/cancel`, {
        body: JSON.stringify({ reason: "Cancelled by resident from mobile app." }),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setVisitorMessage("Visitor pass could not be cancelled.");
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<VisitorRequest>;
      setVisitorRequests((current) =>
        current.map((visitor) => (visitor.id === payload.data.id ? payload.data : visitor)),
      );

      const nextTokens = { ...visitorPassTokens };
      delete nextTokens[visitorRequestId];
      await saveVisitorPassTokens(nextTokens);
      setVisitorMessage("Visitor pass cancelled.");
    } catch {
      setVisitorMessage("Could not reach the visitor service.");
    } finally {
      setIsCancellingVisitorId(null);
    }
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
      const savedVisitorPassTokens = await loadVisitorPassTokens();
      setAuthToken(payload.data.token);
      setUser(payload.data.user);
      setVisitorPassTokens(savedVisitorPassTokens);
      setPassword("");
      await Keychain.setGenericPassword(payload.data.user.email, payload.data.token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: authTokenService,
      });

      await Promise.all([
        loadVerificationRequests(payload.data.token),
        loadDocumentTypes(payload.data.token),
        loadVisitorRequests(payload.data.token),
        loadIssues(payload.data.token),
      ]);
    } catch {
      setAuthError("Could not reach the compound API.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function loadIssues(token = authToken) {
    if (!token) return;
    setIsRefreshingIssues(true);
    try {
      const response = await fetch(`${apiBaseUrl}/my/issues`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        setIssues([]);
        return;
      }
      const payload = (await response.json()) as ApiEnvelope<Issue[]>;
      setIssues(payload.data);
    } finally {
      setIsRefreshingIssues(false);
    }
  }

  async function handleCreateIssue(unitId: string) {
    if (!authToken || !issueTitle.trim() || !issueDescription.trim()) return;
    setIssueMessage(null);
    setIsCreatingIssue(true);
    try {
      const input: CreateIssueInput = {
        unitId,
        category: issueCategory as CreateIssueInput["category"],
        title: issueTitle.trim(),
        description: issueDescription.trim(),
      };
      const response = await fetch(`${apiBaseUrl}/issues`, {
        body: JSON.stringify(input),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      if (!response.ok) {
        setIssueMessage("Issue could not be submitted. Try again.");
        return;
      }
      setIssueMessage("Issue submitted. An admin will review it shortly.");
      setIssueTitle("");
      setIssueDescription("");
      setIssueCategory("maintenance");
      setShowIssueForm(false);
      await loadIssues(authToken);
    } catch {
      setIssueMessage("Could not reach the issue service.");
    } finally {
      setIsCreatingIssue(false);
    }
  }

  async function handleSignOut() {
    await Keychain.resetGenericPassword({ service: authTokenService });
    await Keychain.resetGenericPassword({ service: visitorTokenService });
    setAuthToken(null);
    setUser(null);
    setVerificationRequests([]);
    setVisitorRequests([]);
    setVisitorPassTokens({});
    setDocumentTypes([]);
    setSelectedDocumentTypeId(null);
    resetVisitorForm();
    setPassword("");
    setAuthError(null);
    setUploadMessage(null);
    setVisitorMessage(null);
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
  const residentUnitRequest =
    verificationRequests.find((request) => request.unitId && request.status === "approved") ??
    verificationRequests.find((request) => request.unitId) ??
    null;
  const activeVisitorRequests = visitorRequests.filter((visitorRequest) => !isVisitorClosed(visitorRequest));
  const hasInvalidVisitWindow = visitEndsAt <= visitStartsAt;
  const isPending = user?.status === "pending_review";
  const isActiveResident = user?.status === "active" && isResident(user);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>Compound</Text>
            <View style={styles.themeToggle}>
              {(["light", "system", "dark"] as const).map((mode) => (
                <Pressable
                  accessibilityRole="button"
                  key={mode}
                  onPress={() => setThemeOverride(mode)}
                  style={[styles.themeBtn, themeOverride === mode && styles.themeBtnActive]}
                >
                  <Text style={[styles.themeBtnText, themeOverride === mode && styles.themeBtnTextActive]}>
                    {t(`Theme.${mode}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
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
            <ActivityIndicator color={isDark ? "#14b8a6" : "#116a57"} />
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
                {isSigningIn ? <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
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
                        <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} />
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

            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={styles.panelLabel}>Visitor QR</Text>
                  <Text style={styles.sectionTitle}>Guest passes</Text>
                  <Text style={styles.sectionText}>{activeVisitorRequests.length} active or pending</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadVisitorRequests()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{isRefreshingVisitors ? "Refreshing" : "Refresh"}</Text>
                </Pressable>
              </View>

              {residentUnitRequest?.unitId ? (
                <View style={styles.visitorForm}>
                  <Text style={styles.sectionText}>
                    Unit: {residentUnitRequest.unit?.unitNumber ?? residentUnitRequest.unitId}
                  </Text>
                  <Text style={styles.inputLabel}>Visitor name</Text>
                  <TextInput
                    onChangeText={setVisitorName}
                    placeholder="Full name"
                    style={styles.input}
                    value={visitorName}
                  />
                  <View style={styles.twoColumn}>
                    <View style={styles.flexFill}>
                      <Text style={styles.inputLabel}>Phone</Text>
                      <TextInput
                        inputMode="tel"
                        onChangeText={setVisitorPhone}
                        placeholder="Optional"
                        style={styles.input}
                        value={visitorPhone}
                      />
                    </View>
                    <View style={styles.flexFill}>
                      <Text style={styles.inputLabel}>Vehicle plate</Text>
                      <TextInput
                        autoCapitalize="characters"
                        onChangeText={setVisitorVehiclePlate}
                        placeholder="Optional"
                        style={styles.input}
                        value={visitorVehiclePlate}
                      />
                    </View>
                  </View>
                  <Text style={styles.inputLabel}>Visit starts</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openVisitPicker("starts")}
                    style={({ pressed }) => [styles.dateButton, pressed && styles.dateButtonPressed]}
                  >
                    <Text style={styles.dateButtonText}>{formatDate(visitStartsAt.toISOString())}</Text>
                  </Pressable>
                  <Text style={styles.inputLabel}>Visit ends</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openVisitPicker("ends")}
                    style={({ pressed }) => [
                      styles.dateButton,
                      pressed && styles.dateButtonPressed,
                      hasInvalidVisitWindow && styles.dateButtonError,
                    ]}
                  >
                    <Text style={styles.dateButtonText}>{formatDate(visitEndsAt.toISOString())}</Text>
                  </Pressable>
                  {visitPickerTarget ? (
                    <View style={styles.pickerPanel}>
                      <DateTimePicker
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        mode={visitPickerMode}
                        onChange={handleVisitPickerChange}
                        value={visitPickerTarget === "starts" ? visitStartsAt : visitEndsAt}
                      />
                      {Platform.OS === "ios" ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setVisitPickerTarget(null)}
                          style={styles.secondaryButton}
                        >
                          <Text style={styles.secondaryButtonText}>Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    multiline
                    onChangeText={setVisitorNotes}
                    placeholder="Gate note, delivery details, or expected companion"
                    style={[styles.input, styles.multilineInput]}
                    value={visitorNotes}
                  />
                  {visitorMessage ? <Text style={styles.infoText}>{visitorMessage}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isCreatingVisitor || !visitorName.trim() || hasInvalidVisitWindow}
                    onPress={() => void handleCreateVisitor(residentUnitRequest.unitId!)}
                    style={[
                      styles.primaryButton,
                      (isCreatingVisitor || !visitorName.trim() || hasInvalidVisitWindow) && styles.disabledButton,
                    ]}
                  >
                    {isCreatingVisitor ? (
                      <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create visitor pass</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.sectionText}>A verified unit is required before visitor passes can be created.</Text>
              )}

              <View style={styles.visitorList}>
                <Text style={styles.infoTitle}>Active and recent passes</Text>
                {visitorRequests.length > 0 ? (
                  visitorRequests.map((visitorRequest) => {
                    const token = visitorPassTokens[visitorRequest.id] ?? visitorRequest.qrToken;
                    const canCancel = !isVisitorClosed(visitorRequest);

                    return (
                      <View style={styles.visitorCard} key={visitorRequest.id}>
                        <View style={styles.rowBetween}>
                          <View style={styles.flexFill}>
                            <Text style={styles.actionLabel}>{visitorRequest.visitorName}</Text>
                            <Text style={styles.actionDetail}>{visitorLocation(visitorRequest)}</Text>
                          </View>
                          <Text
                            style={[
                              styles.statusBadge,
                              visitorRequest.status === "denied" || visitorRequest.status === "cancelled"
                                ? styles.statusBadgeDanger
                                : null,
                            ]}
                          >
                            {formatStatus(visitorRequest.status)}
                          </Text>
                        </View>
                        <Text style={styles.sectionText}>Window: {formatDate(visitorRequest.visitStartsAt)} - {formatDate(visitorRequest.visitEndsAt)}</Text>
                        {visitorRequest.vehiclePlate ? (
                          <Text style={styles.sectionText}>Vehicle: {visitorRequest.vehiclePlate}</Text>
                        ) : null}
                        {token && canCancel ? (
                          <View style={styles.qrPanel}>
                            <QRCode value={token} size={180} backgroundColor={isDark ? "#1f2937" : "#ffffff"} color={isDark ? "#f9fafb" : "#111827"} />
                            <Text selectable style={styles.tokenText}>
                              {token}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.infoText}>
                            {canCancel
                              ? "This device does not have the QR token for this pass. Create a new pass if the QR was lost."
                              : "This pass is closed."}
                          </Text>
                        )}
                        {canCancel ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={isCancellingVisitorId === visitorRequest.id}
                            onPress={() => void handleCancelVisitor(visitorRequest.id)}
                            style={[
                              styles.secondaryButton,
                              isCancellingVisitorId === visitorRequest.id && styles.disabledButton,
                            ]}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {isCancellingVisitorId === visitorRequest.id ? "Cancelling" : "Cancel pass"}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.sectionText}>No visitor passes yet.</Text>
                )}
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={styles.panelLabel}>Complaints</Text>
                  <Text style={styles.sectionTitle}>My issues</Text>
                  <Text style={styles.sectionText}>{issues.length} submitted</Text>
                </View>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Pressable accessibilityRole="button" onPress={() => setShowIssueForm(!showIssueForm)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{showIssueForm ? 'Cancel' : 'New issue'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void loadIssues()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{isRefreshingIssues ? 'Refreshing' : 'Refresh'}</Text>
                  </Pressable>
                </View>
              </View>

              {showIssueForm && residentUnitRequest?.unitId ? (
                <View style={styles.visitorForm}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
                    {['maintenance', 'security', 'cleaning', 'noise', 'other'].map((cat) => (
                      <Pressable
                        key={cat}
                        accessibilityRole="button"
                        onPress={() => setIssueCategory(cat)}
                        style={[
                          styles.documentTypeChip,
                          issueCategory === cat && styles.documentTypeChipSelected,
                        ]}
                      >
                        <Text style={[
                          styles.documentTypeText,
                          issueCategory === cat && styles.documentTypeTextSelected,
                        ]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    onChangeText={setIssueTitle}
                    placeholder="Brief summary of the issue"
                    style={styles.input}
                    value={issueTitle}
                  />
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    multiline
                    onChangeText={setIssueDescription}
                    placeholder="Describe the issue in detail"
                    style={[styles.input, styles.multilineInput]}
                    value={issueDescription}
                  />
                  {issueMessage ? <Text style={styles.infoText}>{issueMessage}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isCreatingIssue || !issueTitle.trim() || !issueDescription.trim()}
                    onPress={() => void handleCreateIssue(residentUnitRequest.unitId!)}
                    style={[
                      styles.primaryButton,
                      (isCreatingIssue || !issueTitle.trim() || !issueDescription.trim()) && styles.disabledButton,
                    ]}
                  >
                    {isCreatingIssue ? (
                      <ActivityIndicator color={isDark ? '#1f2937' : '#ffffff'} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Submit issue</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {issueMessage && !showIssueForm ? <Text style={styles.infoText}>{issueMessage}</Text> : null}

              {issues.length > 0 ? (
                <View style={styles.visitorList}>
                  <Text style={styles.infoTitle}>Recent issues</Text>
                  {issues.map((issue) => (
                    <View style={styles.visitorCard} key={issue.id}>
                      <View style={styles.rowBetween}>
                        <View style={styles.flexFill}>
                          <Text style={styles.actionLabel}>{issue.title}</Text>
                          <Text style={styles.actionDetail}>{issue.category} — {formatStatus(issue.status)}</Text>
                        </View>
                        <Text style={[
                          styles.statusBadge,
                          (issue.status === 'resolved' || issue.status === 'closed') ? null : styles.statusBadgeDanger,
                        ]}>
                          {formatStatus(issue.status)}
                        </Text>
                      </View>
                      <Text style={styles.sectionText} numberOfLines={2}>{issue.description}</Text>
                      <Text style={styles.sectionText}>Created: {formatDate(issue.createdAt)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.sectionText}>No issues submitted yet.</Text>
              )}
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

const getStyles = (isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDark ? "#111827" : "#f6f7f9",
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? "#374151" : "#d7dce3",
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    padding: 3,
    gap: 2,
  },
  themeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  themeBtnActive: {
    backgroundColor: isDark ? "#111827" : "#f6f7f9",
  },
  themeBtnText: {
    fontSize: 11,
    color: isDark ? "#9ca3af" : "#5b6472",
  },
  themeBtnTextActive: {
    color: isDark ? "#14b8a6" : "#116a57",
    fontWeight: "700",
  },
  kicker: {
    color: isDark ? "#14b8a6" : "#116a57",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    color: isDark ? "#9ca3af" : "#5b6472",
    fontSize: 16,
    lineHeight: 23,
  },
  statusPanel: {
    alignItems: "center",
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  panel: {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  welcomePanel: {
    backgroundColor: isDark ? "#134e4a" : "#e6f3ef",
    borderColor: isDark ? "#0f766e" : "#b7d8ce",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  panelLabel: {
    color: isDark ? "#9ca3af" : "#5b6472",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  panelValue: {
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },
  sectionTitle: {
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 22,
    fontWeight: "800",
  },
  sectionText: {
    color: isDark ? "#9ca3af" : "#5b6472",
    fontSize: 15,
    lineHeight: 22,
  },
  statusDot: {
    backgroundColor: isDark ? "#ef4444" : "#b42318",
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  statusDotOnline: {
    backgroundColor: isDark ? "#14b8a6" : "#116a57",
  },
  form: {
    gap: 10,
  },
  inputLabel: {
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#4b5563" : "#c8ced7",
    borderRadius: 8,
    borderWidth: 1,
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dateButton: {
    alignItems: "center",
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#4b5563" : "#c8ced7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dateButtonPressed: {
    borderColor: isDark ? "#14b8a6" : "#116a57",
  },
  dateButtonError: {
    borderColor: isDark ? "#ef4444" : "#b42318",
  },
  dateButtonText: {
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  pickerPanel: {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  errorText: {
    color: isDark ? "#ef4444" : "#b42318",
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: isDark ? "#14b8a6" : "#116a57",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    backgroundColor: isDark ? "#0d9488" : "#0a4f41",
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: isDark ? "#1f2937" : "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: isDark ? "#14b8a6" : "#116a57",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: isDark ? "#14b8a6" : "#116a57",
    fontSize: 15,
    fontWeight: "800",
  },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  linkButtonText: {
    color: isDark ? "#14b8a6" : "#116a57",
    fontSize: 15,
    fontWeight: "800",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  flexFill: {
    flex: 1,
  },
  reviewBlock: {
    gap: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: isDark ? "#78350f" : "#f3ead7",
    borderRadius: 8,
    color: isDark ? "#fbbf24" : "#7a4f10",
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: "capitalize",
  },
  statusBadgeDanger: {
    backgroundColor: isDark ? "#7f1d1d" : "#fde8e5",
    color: isDark ? "#ef4444" : "#b42318",
  },
  infoPanel: {
    backgroundColor: isDark ? "#1e3a8a" : "#eaf0ff",
    borderColor: isDark ? "#1d4ed8" : "#b9c9ef",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  infoTitle: {
    color: isDark ? "#60a5fa" : "#244a8f",
    fontSize: 15,
    fontWeight: "800",
  },
  infoText: {
    color: isDark ? "#93c5fd" : "#263b5e",
    fontSize: 14,
    lineHeight: 20,
  },
  uploadPanel: {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#1d4ed8" : "#b9c9ef",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  visitorForm: {
    gap: 10,
  },
  visitorList: {
    gap: 12,
  },
  visitorCard: {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },
  multilineInput: {
    minHeight: 84,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  qrPanel: {
    alignItems: "center",
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  tokenText: {
    color: isDark ? "#d1d5db" : "#384252",
    fontFamily: Platform.select({ android: "monospace", ios: "Courier", default: undefined }),
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  documentTypeRow: {
    gap: 8,
    paddingRight: 8,
  },
  documentTypeChip: {
    borderColor: isDark ? "#4b5563" : "#c8ced7",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  documentTypeChipSelected: {
    backgroundColor: isDark ? "#14b8a6" : "#116a57",
    borderColor: isDark ? "#14b8a6" : "#116a57",
  },
  documentTypeText: {
    color: isDark ? "#d1d5db" : "#384252",
    fontSize: 13,
    fontWeight: "800",
  },
  documentTypeTextSelected: {
    color: isDark ? "#1f2937" : "#ffffff",
  },
  grid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  actionCardPressed: {
    borderColor: isDark ? "#14b8a6" : "#116a57",
    transform: [{ scale: 0.99 }],
  },
  actionLabel: {
    color: isDark ? "#f9fafb" : "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  actionDetail: {
    color: isDark ? "#9ca3af" : "#5b6472",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  footerPanel: {
    backgroundColor: isDark ? "#374151" : "#eef1f5",
    borderRadius: 8,
    padding: 18,
  },
  footerText: {
    color: isDark ? "#d1d5db" : "#384252",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
});
