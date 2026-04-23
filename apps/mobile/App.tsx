import type {
  ApiEnvelope,
  AuthenticatedUser,
  CreateIssueInput,
  CreateVisitorRequestInput,
  DocumentType,
  Issue,
  LedgerEntry,
  LoginResult,
  PaginatedEnvelope,
  PaymentSubmission,
  UnitAccount,
  UnitMembership,
  UserNotification,
  VerificationRequest,
  Vote,
  VoteEligibilityResult,
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

type AnnouncementCategory =
  | "general"
  | "building"
  | "association_decision"
  | "security_alert"
  | "maintenance_notice"
  | "meeting_reminder";
type AnnouncementPriority = "low" | "normal" | "high" | "critical";
type AnnouncementId = number | string;

interface LocalizedText {
  en: string;
  ar: string;
}

interface AnnouncementSummary {
  required: boolean;
  targetedCount: number;
  acknowledgedCount: number;
  pendingCount: number;
}

interface Announcement {
  id: AnnouncementId;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: "published" | "scheduled" | "draft" | "expired" | "archived";
  targetType: string;
  targetIds: AnnouncementId[];
  targetRole: string | null;
  requiresVerifiedMembership: boolean;
  requiresAcknowledgement: boolean;
  title: LocalizedText;
  body: LocalizedText;
  attachments: unknown[];
  revision: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  acknowledgedAt?: string | null;
  acknowledgementSummary?: AnnouncementSummary;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

interface AnnouncementAcknowledgementResponse {
  announcementId: AnnouncementId;
  acknowledgedAt: string;
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
type IssueCategory = CreateIssueInput["category"];

const issueCategories: IssueCategory[] = ["maintenance", "security", "cleaning", "noise", "other"];

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null, locale = "en"): string {
  if (!value) {
    return locale.startsWith("ar") ? "غير محدد" : "Not set";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateForLocale(value: string | null, locale: string, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function localizedText(value: LocalizedText, language: string): string {
  if (language.startsWith("ar")) {
    return value.ar || value.en;
  }

  return value.en || value.ar;
}

function localizedNotificationText(notification: UserNotification, key: "title" | "body", language: string): string {
  const arabicKey = key === "title" ? "titleAr" : "bodyAr";
  const arabicValue = notification.metadata[arabicKey];

  if (language.startsWith("ar") && typeof arabicValue === "string" && arabicValue.trim()) {
    return arabicValue;
  }

  return notification[key];
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

function isSecurityGuard(user: AuthenticatedUser | null): boolean {
  return user?.role === "security_guard";
}

function isVisitorClosed(visitorRequest: VisitorRequest): boolean {
  return ["cancelled", "completed", "denied"].includes(visitorRequest.status);
}

function visitorLocation(visitorRequest: VisitorRequest, unitLabel: string): string {
  const unit = visitorRequest.unit;

  if (!unit) {
    return visitorRequest.unitId;
  }

  return [unit.compoundName, unit.buildingName, unitLabel].filter(Boolean).join(" / ");
}

function membershipUnitLabel(membership: UnitMembership | null, fallbackUnitId: string | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (membership?.unit?.unitNumber) {
    return t("Common.unit", { unit: membership.unit.unitNumber });
  }

  if (fallbackUnitId) {
    return t("Common.unit", { unit: fallbackUnitId });
  }

  return t("Property.noUnit");
}

function formatUnitLocation(membership: UnitMembership, t: (key: string, options?: Record<string, unknown>) => string): string {
  const unit = membership.unit;

  if (!unit) {
    return t("Property.unitId", { id: membership.unitId });
  }

  const parts = [
    unit.compound?.name,
    unit.building?.name ? t("Property.buildingValue", { building: unit.building.name }) : null,
    unit.floor?.label ? t("Property.floorValue", { floor: unit.floor.label }) : null,
    t("Common.unit", { unit: unit.unitNumber }),
  ];

  return parts.filter(Boolean).join(" / ");
}

export default function App() {
  const { i18n, t } = useTranslation();
  const systemScheme = useColorScheme();
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | "system">("system");
  const isDark = themeOverride === "system" ? systemScheme === "dark" : themeOverride === "dark";
  const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const isRtl = language.startsWith("ar");
  const styles = getStyles(isDark, isRtl);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [unitMemberships, setUnitMemberships] = useState<UnitMembership[]>([]);
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
  const [isRefreshingUnits, setIsRefreshingUnits] = useState(false);
  const [isRefreshingVisitors, setIsRefreshingVisitors] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isCreatingVisitor, setIsCreatingVisitor] = useState(false);
  const [isCancellingVisitorId, setIsCancellingVisitorId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unitMessage, setUnitMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [visitorMessage, setVisitorMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isRefreshingIssues, setIsRefreshingIssues] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isRefreshingNotifications, setIsRefreshingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isRefreshingAnnouncements, setIsRefreshingAnnouncements] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [announcementMessage, setAnnouncementMessage] = useState<string | null>(null);
  const [acknowledgingAnnouncementId, setAcknowledgingAnnouncementId] = useState<AnnouncementId | null>(null);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueCategory, setIssueCategory] = useState<IssueCategory>("maintenance");
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);

  // Finance state
  const [unitAccounts, setUnitAccounts] = useState<UnitAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountDetail, setAccountDetail] = useState<UnitAccount | null>(null);
  const [isLoadingAccountDetail, setIsLoadingAccountDetail] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Governance state
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoadingVotes, setIsLoadingVotes] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string | null>(null);
  const [castingVoteId, setCastingVoteId] = useState<string | null>(null);
  const [voteEligibility, setVoteEligibility] = useState<Record<string, VoteEligibilityResult>>({});
  const [selectedVoteOption, setSelectedVoteOption] = useState<Record<string, number>>({});

  // Security state
  const [securityVisitors, setSecurityVisitors] = useState<VisitorRequest[]>([]);
  const [isLoadingSecurityVisitors, setIsLoadingSecurityVisitors] = useState(false);
  const [validatePassToken, setValidatePassToken] = useState("");
  const [validateResult, setValidateResult] = useState<{ result: string; visitorRequest: VisitorRequest | null } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [processingVisitorId, setProcessingVisitorId] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => defaultApiBaseUrl,
    [],
  );
  const actionItems = useMemo(
    () => [
      { label: t("QuickActions.visitors"), detail: t("QuickActions.visitorsDetail") },
      { label: t("QuickActions.payments"), detail: t("QuickActions.paymentsDetail") },
      { label: t("QuickActions.issues"), detail: t("QuickActions.issuesDetail") },
      { label: t("QuickActions.announcements"), detail: t("QuickActions.announcementsDetail") },
    ],
    [t],
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

        const restoredUserData = restoredUser;
        const loaders: Promise<unknown>[] = [
          loadVerificationRequests(credentials.password),
          loadUnitMemberships(credentials.password),
          loadDocumentTypes(credentials.password),
          loadVisitorRequests(credentials.password),
          loadIssues(credentials.password),
          loadNotifications(credentials.password),
          loadAnnouncements(credentials.password),
        ];

        if (isResident(restoredUserData)) {
          loaders.push(loadUnitAccounts(credentials.password));
          loaders.push(loadVotes(credentials.password));
        }

        if (isSecurityGuard(restoredUserData)) {
          loaders.push(loadSecurityVisitors(credentials.password));
        }

        await Promise.all(loaders);
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

  async function loadUnitMemberships(token = authToken) {
    if (!token) {
      return;
    }

    setUnitMessage(null);
    setIsRefreshingUnits(true);

    try {
      const response = await fetch(`${apiBaseUrl}/my/units?perPage=20`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setUnitMemberships([]);
        setUnitMessage(t("Property.loadError"));
        return;
      }

      const payload = (await response.json()) as PaginatedEnvelope<UnitMembership>;
      setUnitMemberships(payload.data);
    } catch {
      setUnitMemberships([]);
      setUnitMessage(t("Property.networkError"));
    } finally {
      setIsRefreshingUnits(false);
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
      setVisitorMessage(t("Visitors.invalidWindow"));
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
        setVisitorMessage(t("Visitors.createError"));
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

      setVisitorMessage(t("Visitors.createSuccess"));
      resetVisitorForm();
    } catch {
      setVisitorMessage(t("Visitors.networkError"));
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
        body: JSON.stringify({ reason: t("Visitors.cancelReason") }),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setVisitorMessage(t("Visitors.cancelError"));
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<VisitorRequest>;
      setVisitorRequests((current) =>
        current.map((visitor) => (visitor.id === payload.data.id ? payload.data : visitor)),
      );

      const nextTokens = { ...visitorPassTokens };
      delete nextTokens[visitorRequestId];
      await saveVisitorPassTokens(nextTokens);
      setVisitorMessage(t("Visitors.cancelSuccess"));
    } catch {
      setVisitorMessage(t("Visitors.networkError"));
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
        setAuthError(t("Auth.invalidCredentials"));
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
        loadUnitMemberships(payload.data.token),
        loadDocumentTypes(payload.data.token),
        loadVisitorRequests(payload.data.token),
        loadIssues(payload.data.token),
        loadNotifications(payload.data.token),
        loadAnnouncements(payload.data.token),
      ]);
    } catch {
      setAuthError(t("Auth.networkError"));
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

  async function loadNotifications(token = authToken) {
    if (!token) {
      return;
    }

    setNotificationMessage(null);
    setIsRefreshingNotifications(true);

    try {
      const response = await fetch(`${apiBaseUrl}/notifications?perPage=10`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setNotifications([]);
        setNotificationMessage(t("Notifications.loadError"));
        return;
      }

      const payload = (await response.json()) as PaginatedEnvelope<UserNotification>;
      setNotifications(payload.data);
    } catch {
      setNotificationMessage(t("Notifications.networkError"));
    } finally {
      setIsRefreshingNotifications(false);
    }
  }

  async function handleMarkNotificationRead(notification: UserNotification) {
    if (!authToken || notification.readAt) {
      return;
    }

    setNotificationMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/notifications/${notification.id}/read`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        method: "POST",
      });

      if (!response.ok) {
        setNotificationMessage(t("Notifications.readError"));
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<UserNotification>;
      setNotifications((current) => current.map((item) => (item.id === payload.data.id ? payload.data : item)));
      setNotificationMessage(t("Notifications.readSuccess"));
    } catch {
      setNotificationMessage(t("Notifications.networkError"));
    }
  }

  async function handleArchiveNotification(notification: UserNotification) {
    if (!authToken) {
      return;
    }

    setNotificationMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/notifications/${notification.id}/archive`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        method: "POST",
      });

      if (!response.ok) {
        setNotificationMessage(t("Notifications.archiveError"));
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<UserNotification>;
      setNotifications((current) => current.filter((item) => item.id !== payload.data.id));
      setNotificationMessage(t("Notifications.archiveSuccess"));
    } catch {
      setNotificationMessage(t("Notifications.networkError"));
    }
  }

  async function loadAnnouncements(token = authToken) {
    if (!token) {
      return;
    }

    setAnnouncementsError(null);
    setIsRefreshingAnnouncements(true);

    try {
      const response = await fetch(`${apiBaseUrl}/my/announcements?perPage=20`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setAnnouncements([]);
        setAnnouncementsError(t("Announcements.loadError"));
        return;
      }

      const payload = (await response.json()) as PaginatedEnvelope<Announcement>;
      setAnnouncements(payload.data);
    } catch {
      setAnnouncementsError(t("Announcements.networkError"));
    } finally {
      setIsRefreshingAnnouncements(false);
    }
  }

  async function handleAcknowledgeAnnouncement(announcement: Announcement) {
    if (!authToken || announcement.acknowledgedAt) {
      return;
    }

    setAnnouncementMessage(null);
    setAnnouncementsError(null);
    setAcknowledgingAnnouncementId(announcement.id);

    try {
      const response = await fetch(`${apiBaseUrl}/announcements/${announcement.id}/acknowledge`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        method: "POST",
      });

      if (!response.ok) {
        setAnnouncementMessage(t("Announcements.acknowledgeError"));
        return;
      }

      const payload = (await response.json()) as ApiEnvelope<AnnouncementAcknowledgementResponse>;
      setAnnouncements((current) =>
        current.map((item) => {
          if (String(item.id) !== String(payload.data.announcementId)) {
            return item;
          }

          const wasAcknowledged = Boolean(item.acknowledgedAt);

          return {
            ...item,
            acknowledgedAt: payload.data.acknowledgedAt,
            acknowledgementSummary: item.acknowledgementSummary
              ? {
                  ...item.acknowledgementSummary,
                  acknowledgedCount: wasAcknowledged
                    ? item.acknowledgementSummary.acknowledgedCount
                    : item.acknowledgementSummary.acknowledgedCount + 1,
                  pendingCount: wasAcknowledged
                    ? item.acknowledgementSummary.pendingCount
                    : Math.max(0, item.acknowledgementSummary.pendingCount - 1),
                }
              : item.acknowledgementSummary,
          };
        }),
      );
      setAnnouncementMessage(t("Announcements.acknowledgeSuccess"));
    } catch {
      setAnnouncementMessage(t("Announcements.networkError"));
    } finally {
      setAcknowledgingAnnouncementId(null);
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
        setIssueMessage(t("Issues.submitError"));
        return;
      }
      setIssueMessage(t("Issues.submitSuccess"));
      setIssueTitle("");
      setIssueDescription("");
      setIssueCategory("maintenance");
      setShowIssueForm(false);
      await loadIssues(authToken);
    } catch {
      setIssueMessage(t("Issues.networkError"));
    } finally {
      setIsCreatingIssue(false);
    }
  }

  // ── Finance ──────────────────────────────────────────────────────────────

  async function loadUnitAccounts(token = authToken) {
    if (!token) return;
    setIsLoadingAccounts(true);
    setPaymentMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/my/finance/unit-accounts`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { setPaymentMessage(t("Finance.loadError")); return; }
      const payload = (await response.json()) as PaginatedEnvelope<UnitAccount>;
      setUnitAccounts(payload.data);
      if (payload.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(payload.data[0]!.id);
      }
    } catch {
      setPaymentMessage(t("Finance.networkError"));
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  async function loadAccountDetail(accountId: string, token = authToken) {
    if (!token) return;
    setIsLoadingAccountDetail(true);
    try {
      const response = await fetch(`${apiBaseUrl}/my/finance/unit-accounts/${accountId}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const payload = (await response.json()) as ApiEnvelope<UnitAccount>;
      setAccountDetail(payload.data);
    } finally {
      setIsLoadingAccountDetail(false);
    }
  }

  async function handleSubmitPayment(accountId: string) {
    if (!authToken || !paymentAmount.trim()) return;
    setPaymentMessage(null);
    setIsSubmittingPayment(true);
    try {
      const formData = new FormData();
      formData.append("amount", paymentAmount.trim());
      formData.append("method", paymentMethod);
      if (paymentReference.trim()) formData.append("reference", paymentReference.trim());
      if (paymentNotes.trim()) formData.append("notes", paymentNotes.trim());

      const response = await fetch(`${apiBaseUrl}/finance/unit-accounts/${accountId}/payment-submissions`, {
        body: formData,
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
        method: "POST",
      });
      if (!response.ok) { setPaymentMessage(t("Finance.submitError")); return; }
      setPaymentMessage(t("Finance.submitSuccess"));
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");
      setShowPaymentForm(false);
      await loadAccountDetail(accountId);
    } catch {
      setPaymentMessage(t("Finance.networkError"));
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  // ── Governance ───────────────────────────────────────────────────────────

  async function loadVotes(token = authToken) {
    if (!token) return;
    setIsLoadingVotes(true);
    setVoteMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/governance/votes`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { setVoteMessage(t("Governance.loadError")); return; }
      const payload = (await response.json()) as PaginatedEnvelope<Vote>;
      setVotes(payload.data);
    } catch {
      setVoteMessage(t("Governance.networkError"));
    } finally {
      setIsLoadingVotes(false);
    }
  }

  async function loadVoteEligibility(voteId: string, token = authToken) {
    if (!token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/governance/votes/${voteId}/eligibility`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const payload = (await response.json()) as ApiEnvelope<VoteEligibilityResult>;
      setVoteEligibility((current) => ({ ...current, [voteId]: payload.data }));
    } catch { /* silent */ }
  }

  async function handleCastVote(voteId: string, optionId: number) {
    if (!authToken) return;
    setVoteMessage(null);
    setCastingVoteId(voteId);
    try {
      const response = await fetch(`${apiBaseUrl}/governance/votes/${voteId}/cast`, {
        body: JSON.stringify({ optionId }),
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        method: "POST",
      });
      if (response.status === 409) { setVoteMessage(t("Governance.alreadyVoted")); return; }
      if (!response.ok) { setVoteMessage(t("Governance.castError")); return; }
      setVoteMessage(t("Governance.castSuccess"));
      await loadVoteEligibility(voteId);
    } catch {
      setVoteMessage(t("Governance.networkError"));
    } finally {
      setCastingVoteId(null);
    }
  }

  // ── Security ─────────────────────────────────────────────────────────────

  async function loadSecurityVisitors(token = authToken) {
    if (!token) return;
    setIsLoadingSecurityVisitors(true);
    setSecurityMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/visitor-requests?status=pending`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { setSecurityMessage(t("Security.loadError")); return; }
      const payload = (await response.json()) as PaginatedEnvelope<VisitorRequest>;
      setSecurityVisitors(payload.data);
    } catch {
      setSecurityMessage(t("Security.networkError"));
    } finally {
      setIsLoadingSecurityVisitors(false);
    }
  }

  async function handleValidatePass() {
    if (!authToken || !validatePassToken.trim()) return;
    setIsValidating(true);
    setValidateResult(null);
    setSecurityMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/visitor-requests/validate-pass`, {
        body: JSON.stringify({ token: validatePassToken.trim() }),
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) { setSecurityMessage(t("Security.validateError")); return; }
      const payload = (await response.json()) as ApiEnvelope<{ result: string; visitorRequest: VisitorRequest | null }>;
      setValidateResult(payload.data);
    } catch {
      setSecurityMessage(t("Security.networkError"));
    } finally {
      setIsValidating(false);
    }
  }

  async function handleSecurityAction(visitorRequestId: string, action: "allow" | "deny" | "complete") {
    if (!authToken) return;
    setProcessingVisitorId(visitorRequestId);
    setSecurityMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/visitor-requests/${visitorRequestId}/${action}`, {
        body: action === "deny" ? JSON.stringify({ reason: "Denied at gate" }) : "{}",
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) { setSecurityMessage(t("Security.actionError")); return; }
      setSecurityMessage(t(`Security.${action}Success`));
      await loadSecurityVisitors();
      if (validateResult?.visitorRequest?.id === visitorRequestId) {
        setValidateResult(null);
        setValidatePassToken("");
      }
    } catch {
      setSecurityMessage(t("Security.networkError"));
    } finally {
      setProcessingVisitorId(null);
    }
  }

  async function handleSignOut() {
    await Keychain.resetGenericPassword({ service: authTokenService });
    await Keychain.resetGenericPassword({ service: visitorTokenService });
    setAuthToken(null);
    setUser(null);
    setVerificationRequests([]);
    setUnitMemberships([]);
    setVisitorRequests([]);
    setVisitorPassTokens({});
    setAnnouncements([]);
    setDocumentTypes([]);
    setSelectedDocumentTypeId(null);
    resetVisitorForm();
    setPassword("");
    setAuthError(null);
    setUnitMessage(null);
    setUploadMessage(null);
    setVisitorMessage(null);
    setAnnouncementsError(null);
    setAnnouncementMessage(null);
    setAcknowledgingAnnouncementId(null);
    // Finance
    setUnitAccounts([]);
    setAccountDetail(null);
    setSelectedAccountId(null);
    setPaymentMessage(null);
    setShowPaymentForm(false);
    // Governance
    setVotes([]);
    setVoteMessage(null);
    setVoteEligibility({});
    setSelectedVoteOption({});
    // Security
    setSecurityVisitors([]);
    setSecurityMessage(null);
    setValidatePassToken("");
    setValidateResult(null);
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
        setUploadMessage(t("Documents.selectFile"));
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
        setUploadMessage(t("Documents.uploadError"));
        return;
      }

      setUploadMessage(t("Documents.uploadSuccess"));
      await loadVerificationRequests(authToken);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

      setUploadMessage(t("Documents.uploadNetworkError"));
    } finally {
      setIsUploadingDocument(false);
    }
  }

  const latestRequest = verificationRequests[0] ?? null;
  const residentUnitRequest =
    verificationRequests.find((request) => request.unitId && request.status === "approved") ??
    verificationRequests.find((request) => request.unitId) ??
    null;
  const primaryUnitMembership = unitMemberships.find((membership) => membership.isPrimary) ?? unitMemberships[0] ?? null;
  const activeUnitId = primaryUnitMembership?.unitId ?? residentUnitRequest?.unitId ?? null;
  const activeVisitorRequests = visitorRequests.filter((visitorRequest) => !isVisitorClosed(visitorRequest));
  const hasInvalidVisitWindow = visitEndsAt <= visitStartsAt;
  const isPending = user?.status === "pending_review";
  const isActiveResident = user?.status === "active" && isResident(user);
  const isActiveSecurityGuard = user?.status === "active" && isSecurityGuard(user);
  const announcementLocale = isRtl ? "ar" : "en";
  const pendingAnnouncementAcknowledgements = announcements.filter(
    (announcement) => announcement.requiresAcknowledgement && !announcement.acknowledgedAt,
  ).length;
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.kicker, styles.localizedText]}>{t("App.brand")}</Text>
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
          <Text style={[styles.title, styles.localizedText]}>{t("App.title")}</Text>
          <Text style={[styles.subtitle, styles.localizedText]}>{t("App.subtitle")}</Text>
        </View>

        <View style={styles.statusPanel}>
          <View>
            <Text style={[styles.panelLabel, styles.localizedText]}>{t("Status.label")}</Text>
            <Text style={[styles.panelValue, styles.localizedText]}>
              {isLoadingStatus ? t("Status.checking") : status?.status === "ok" ? t("Status.online") : t("Status.offline")}
            </Text>
          </View>
          <View style={[styles.statusDot, status?.status === "ok" && styles.statusDotOnline]} />
        </View>

        {!user && isRestoringSession ? (
          <View style={styles.panel}>
            <ActivityIndicator color={isDark ? "#14b8a6" : "#116a57"} />
            <Text style={[styles.sectionText, styles.localizedText]}>{t("Auth.restoring")}</Text>
          </View>
        ) : null}

        {!user && !isRestoringSession ? (
          <View style={styles.panel}>
            <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Auth.signIn")}</Text>
            <Text style={[styles.sectionText, styles.localizedText]}>{t("Auth.instructions")}</Text>
            <View style={styles.form}>
              <Text style={[styles.inputLabel, styles.localizedText]}>{t("Auth.email")}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
                onChangeText={setEmail}
                placeholder={t("Auth.emailPlaceholder")}
                style={styles.input}
                value={email}
              />
              <Text style={[styles.inputLabel, styles.localizedText]}>{t("Auth.password")}</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder={t("Auth.passwordPlaceholder")}
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
                {isSigningIn ? <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} /> : <Text style={styles.primaryButtonText}>{t("Auth.signIn")}</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}

        {user && !isResident(user) ? (
          <View style={styles.panel}>
            <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Auth.residentRequired")}</Text>
            <Text style={[styles.sectionText, styles.localizedText]}>{t("Auth.residentRequiredDetail")}</Text>
            <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t("Auth.signOut")}</Text>
            </Pressable>
          </View>
        ) : null}

        {user && isPending ? (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.panelLabel, styles.localizedText]}>{t("Verification.label")}</Text>
                <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Verification.pendingTitle")}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void loadVerificationRequests()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{isRefreshingRequests ? t("Common.refreshing") : t("Common.refresh")}</Text>
              </Pressable>
            </View>

            {latestRequest ? (
              <View style={styles.reviewBlock}>
                <Text style={styles.statusBadge}>{t(`Common.statuses.${latestRequest.status}`, { defaultValue: formatStatus(latestRequest.status) })}</Text>
                <Text style={[styles.sectionText, styles.localizedText]}>
                  {t("Verification.requestedAccess", {
                    role: t(`Common.roles.${latestRequest.requestedRole}`, { defaultValue: formatStatus(latestRequest.requestedRole) }),
                  })}
                </Text>
                <Text style={[styles.sectionText, styles.localizedText]}>
                  {t("Verification.submitted", { date: formatDate(latestRequest.submittedAt, announcementLocale) })}
                </Text>
                {latestRequest.unit ? (
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Common.unit", { unit: latestRequest.unit.unitNumber })}</Text>
                ) : null}
                {latestRequest.moreInfoNote ? (
                  <View style={styles.infoPanel}>
                    <Text style={[styles.infoTitle, styles.localizedText]}>{t("Verification.moreInfoRequested")}</Text>
                    <Text style={styles.infoText}>{latestRequest.moreInfoNote}</Text>
                  </View>
                ) : null}
                {latestRequest.decisionNote ? (
                  <View style={styles.infoPanel}>
                    <Text style={[styles.infoTitle, styles.localizedText]}>{t("Verification.reviewerNote")}</Text>
                    <Text style={styles.infoText}>{latestRequest.decisionNote}</Text>
                  </View>
                ) : null}
                {latestRequest.status === "more_info_requested" ? (
                  <View style={styles.uploadPanel}>
                    <Text style={[styles.infoTitle, styles.localizedText]}>{t("Documents.followUpTitle")}</Text>
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
                      <Text style={[styles.infoText, styles.localizedText]}>{t("Documents.noTypes")}</Text>
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
                        <Text style={styles.primaryButtonText}>{t("Documents.chooseAndUpload")}</Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.sectionText, styles.localizedText]}>{t("Verification.noRequest")}</Text>
            )}

            <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>{t("Auth.signOut")}</Text>
            </Pressable>
          </View>
        ) : null}

        {isActiveResident ? (
          <>
            <View style={styles.welcomePanel}>
              <Text style={[styles.panelLabel, styles.localizedText]}>{t("Auth.signedIn")}</Text>
              <Text style={styles.sectionTitle}>{user.name}</Text>
              <Text style={[styles.sectionText, styles.localizedText]}>
                {t("Auth.activeAccount", {
                  role: t(`Common.roles.${user.role}`, { defaultValue: formatStatus(user.role) }),
                })}
              </Text>
            </View>

            <View style={styles.panel}>
              <View style={styles.announcementHeaderRow}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Property.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Property.title")}</Text>
                  <Text style={[styles.sectionText, styles.localizedText]}>
                    {t("Property.membershipCount", { count: unitMemberships.length })}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadUnitMemberships()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>
                    {isRefreshingUnits ? t("Common.refreshing") : t("Common.refresh")}
                  </Text>
                </Pressable>
              </View>

              {unitMessage ? <Text style={[styles.infoText, styles.localizedText]}>{unitMessage}</Text> : null}

              {isRefreshingUnits && unitMemberships.length === 0 ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={isDark ? "#14b8a6" : "#116a57"} />
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Property.loading")}</Text>
                </View>
              ) : null}

              {!isRefreshingUnits && unitMemberships.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.infoTitle, styles.localizedText]}>{t("Property.emptyTitle")}</Text>
                  <Text style={[styles.infoText, styles.localizedText]}>{t("Property.emptyDetail")}</Text>
                </View>
              ) : null}

              {unitMemberships.length > 0 ? (
                <View style={styles.visitorList}>
                  {unitMemberships.map((membership) => {
                    const unit = membership.unit;

                    return (
                      <View style={styles.visitorCard} key={membership.id}>
                        <View style={styles.rowBetween}>
                          <View style={styles.flexFill}>
                            <Text style={[styles.actionLabel, styles.localizedText]}>
                              {membershipUnitLabel(membership, membership.unitId, t)}
                            </Text>
                            <Text style={[styles.actionDetail, styles.localizedText]}>{formatUnitLocation(membership, t)}</Text>
                          </View>
                          <Text style={styles.statusBadge}>
                            {t(`Common.relations.${membership.relationType}`, {
                              defaultValue: formatStatus(membership.relationType),
                            })}
                          </Text>
                        </View>
                        <View style={styles.announcementBadgeRow}>
                          {membership.isPrimary ? (
                            <Text style={styles.categoryBadge}>{t("Property.primary")}</Text>
                          ) : null}
                          <Text style={styles.priorityBadge}>
                            {t(`Common.verificationStatuses.${membership.verificationStatus}`, {
                              defaultValue: formatStatus(membership.verificationStatus),
                            })}
                          </Text>
                          {unit?.status ? (
                            <Text style={styles.priorityBadge}>
                              {t(`Property.statuses.${unit.status}`, { defaultValue: formatStatus(unit.status) })}
                            </Text>
                          ) : null}
                        </View>
                        {unit ? (
                          <View style={styles.propertyMetaGrid}>
                            <View style={styles.propertyMetaItem}>
                              <Text style={[styles.panelLabel, styles.localizedText]}>{t("Property.compound")}</Text>
                              <Text style={[styles.sectionText, styles.localizedText]}>{unit.compound?.name ?? t("Property.notSet")}</Text>
                            </View>
                            <View style={styles.propertyMetaItem}>
                              <Text style={[styles.panelLabel, styles.localizedText]}>{t("Property.building")}</Text>
                              <Text style={[styles.sectionText, styles.localizedText]}>{unit.building?.name ?? t("Property.notSet")}</Text>
                            </View>
                            <View style={styles.propertyMetaItem}>
                              <Text style={[styles.panelLabel, styles.localizedText]}>{t("Property.floor")}</Text>
                              <Text style={[styles.sectionText, styles.localizedText]}>{unit.floor?.label ?? t("Property.notSet")}</Text>
                            </View>
                            <View style={styles.propertyMetaItem}>
                              <Text style={[styles.panelLabel, styles.localizedText]}>{t("Property.type")}</Text>
                              <Text style={[styles.sectionText, styles.localizedText]}>
                                {unit.type ? t(`Property.types.${unit.type}`, { defaultValue: formatStatus(unit.type) }) : t("Property.notSet")}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                        <Text style={[styles.sectionText, styles.localizedText]}>
                          {t("Property.activeWindow", {
                            end: formatDateForLocale(membership.endsAt, announcementLocale, t("Property.openEnded")),
                            start: formatDateForLocale(membership.startsAt, announcementLocale, t("Property.notSet")),
                          })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <View style={styles.announcementHeaderRow}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Notifications.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Notifications.title")}</Text>
                  <Text style={[styles.sectionText, styles.localizedText]}>
                    {t("Notifications.count", { count: unreadNotificationCount })}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadNotifications()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>
                    {isRefreshingNotifications ? t("Notifications.refreshing") : t("Notifications.refresh")}
                  </Text>
                </Pressable>
              </View>

              {notificationMessage ? <Text style={[styles.infoText, styles.localizedText]}>{notificationMessage}</Text> : null}

              {isRefreshingNotifications && notifications.length === 0 ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={isDark ? "#14b8a6" : "#116a57"} />
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Notifications.loading")}</Text>
                </View>
              ) : null}

              {!isRefreshingNotifications && notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.infoTitle, styles.localizedText]}>{t("Notifications.empty")}</Text>
                </View>
              ) : null}

              {notifications.length > 0 ? (
                <View style={styles.visitorList}>
                  {notifications.map((notification) => (
                    <View style={styles.announcementCard} key={notification.id}>
                      <View style={styles.announcementBadgeRow}>
                        <Text style={styles.categoryBadge}>
                          {t(`Notifications.categories.${notification.category}`, {
                            defaultValue: formatStatus(notification.category),
                          })}
                        </Text>
                        {!notification.readAt ? <Text style={styles.priorityBadge}>{t("Notifications.unread")}</Text> : null}
                      </View>
                      <Text style={[styles.actionLabel, styles.localizedText]}>
                        {localizedNotificationText(notification, "title", language)}
                      </Text>
                      <Text style={[styles.sectionText, styles.localizedText]}>
                        {localizedNotificationText(notification, "body", language)}
                      </Text>
                      <Text style={[styles.actionDetail, styles.localizedText]}>
                        {formatDateForLocale(notification.createdAt, announcementLocale, "")}
                      </Text>
                      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
                        {!notification.readAt ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleMarkNotificationRead(notification)}
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>{t("Notifications.markRead")}</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void handleArchiveNotification(notification)}
                          style={styles.secondaryButton}
                        >
                          <Text style={styles.secondaryButtonText}>{t("Notifications.archive")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <View style={styles.announcementHeaderRow}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Announcements.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Announcements.title")}</Text>
                  <Text style={[styles.sectionText, styles.localizedText]}>
                    {pendingAnnouncementAcknowledgements > 0
                      ? t("Announcements.requiresAck")
                      : t("Announcements.count", { count: announcements.length })}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadAnnouncements()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>
                    {isRefreshingAnnouncements ? t("Announcements.refreshing") : t("Announcements.refresh")}
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.sectionText, styles.localizedText]}>{t("Announcements.subtitle")}</Text>

              {isRefreshingAnnouncements && announcements.length === 0 ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={isDark ? "#14b8a6" : "#116a57"} />
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Announcements.loading")}</Text>
                </View>
              ) : null}

              {announcementsError ? <Text style={[styles.errorText, styles.localizedText]}>{announcementsError}</Text> : null}
              {announcementMessage ? <Text style={[styles.infoText, styles.localizedText]}>{announcementMessage}</Text> : null}

              {!isRefreshingAnnouncements && !announcementsError && announcements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.infoTitle, styles.localizedText]}>{t("Announcements.empty")}</Text>
                </View>
              ) : null}

              {announcements.length > 0 ? (
                <View style={styles.visitorList}>
                  {announcements.map((announcement) => {
                    const title = localizedText(announcement.title, language);
                    const body = localizedText(announcement.body, language);
                    const isAcknowledging = String(acknowledgingAnnouncementId) === String(announcement.id);
                    const hasAcknowledged = Boolean(announcement.acknowledgedAt);
                    const requiresOpenAcknowledgement = announcement.requiresAcknowledgement && !hasAcknowledged;

                    return (
                      <View style={styles.announcementCard} key={String(announcement.id)}>
                        <View style={styles.announcementBadgeRow}>
                          <Text style={styles.categoryBadge}>
                            {t(`Announcements.categories.${announcement.category}`, {
                              defaultValue: formatStatus(announcement.category),
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.priorityBadge,
                              announcement.priority === "high" && styles.priorityBadgeHigh,
                              announcement.priority === "critical" && styles.priorityBadgeCritical,
                            ]}
                          >
                            {t(`Announcements.priorities.${announcement.priority}`, {
                              defaultValue: formatStatus(announcement.priority),
                            })}
                          </Text>
                        </View>

                        <Text style={[styles.actionLabel, styles.localizedText]}>{title}</Text>
                        <Text style={[styles.sectionText, styles.localizedText]}>{body}</Text>

                        <View style={styles.announcementMetaBlock}>
                          {announcement.publishedAt ? (
                            <Text style={[styles.actionDetail, styles.localizedText]}>
                              {t("Announcements.published", {
                                date: formatDateForLocale(announcement.publishedAt, announcementLocale, ""),
                              })}
                            </Text>
                          ) : null}
                          {announcement.expiresAt ? (
                            <Text style={[styles.actionDetail, styles.localizedText]}>
                              {t("Announcements.expires", {
                                date: formatDateForLocale(announcement.expiresAt, announcementLocale, ""),
                              })}
                            </Text>
                          ) : null}
                          {announcement.attachments.length > 0 ? (
                            <Text style={[styles.actionDetail, styles.localizedText]}>
                              {t("Announcements.attachments", { count: announcement.attachments.length })}
                            </Text>
                          ) : null}
                          {announcement.revision > 1 ? (
                            <Text style={[styles.actionDetail, styles.localizedText]}>
                              {t("Announcements.revision", { revision: announcement.revision })}
                            </Text>
                          ) : null}
                        </View>

                        {announcement.requiresAcknowledgement ? (
                          <View style={styles.acknowledgementPanel}>
                            <Text style={[styles.infoTitle, styles.localizedText]}>
                              {hasAcknowledged ? t("Announcements.acknowledged") : t("Announcements.requiresAck")}
                            </Text>
                            <Pressable
                              accessibilityRole="button"
                              disabled={!requiresOpenAcknowledgement || isAcknowledging}
                              onPress={() => void handleAcknowledgeAnnouncement(announcement)}
                              style={[
                                styles.primaryButton,
                                (!requiresOpenAcknowledgement || isAcknowledging) && styles.disabledButton,
                              ]}
                            >
                              {isAcknowledging ? (
                                <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} />
                              ) : (
                                <Text style={styles.primaryButtonText}>
                                  {hasAcknowledged ? t("Announcements.acknowledged") : t("Announcements.acknowledge")}
                                </Text>
                              )}
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Visitors.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Visitors.title")}</Text>
                  <Text style={[styles.sectionText, styles.localizedText]}>
                    {t("Visitors.activeCount", { count: activeVisitorRequests.length })}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadVisitorRequests()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{isRefreshingVisitors ? t("Common.refreshing") : t("Common.refresh")}</Text>
                </Pressable>
              </View>

              {activeUnitId ? (
                <View style={styles.visitorForm}>
                  <Text style={[styles.sectionText, styles.localizedText]}>
                    {membershipUnitLabel(primaryUnitMembership, residentUnitRequest?.unitId ?? null, t)}
                  </Text>
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Visitors.name")}</Text>
                  <TextInput
                    onChangeText={setVisitorName}
                    placeholder={t("Visitors.namePlaceholder")}
                    style={styles.input}
                    value={visitorName}
                  />
                  <View style={styles.twoColumn}>
                    <View style={styles.flexFill}>
                      <Text style={[styles.inputLabel, styles.localizedText]}>{t("Visitors.phone")}</Text>
                      <TextInput
                        inputMode="tel"
                        onChangeText={setVisitorPhone}
                        placeholder={t("Common.optional")}
                        style={styles.input}
                        value={visitorPhone}
                      />
                    </View>
                    <View style={styles.flexFill}>
                      <Text style={[styles.inputLabel, styles.localizedText]}>{t("Visitors.vehiclePlate")}</Text>
                      <TextInput
                        autoCapitalize="characters"
                        onChangeText={setVisitorVehiclePlate}
                        placeholder={t("Common.optional")}
                        style={styles.input}
                        value={visitorVehiclePlate}
                      />
                    </View>
                  </View>
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Visitors.visitStarts")}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openVisitPicker("starts")}
                    style={({ pressed }) => [styles.dateButton, pressed && styles.dateButtonPressed]}
                  >
                    <Text style={styles.dateButtonText}>{formatDate(visitStartsAt.toISOString(), announcementLocale)}</Text>
                  </Pressable>
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Visitors.visitEnds")}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openVisitPicker("ends")}
                    style={({ pressed }) => [
                      styles.dateButton,
                      pressed && styles.dateButtonPressed,
                      hasInvalidVisitWindow && styles.dateButtonError,
                    ]}
                  >
                    <Text style={styles.dateButtonText}>{formatDate(visitEndsAt.toISOString(), announcementLocale)}</Text>
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
                          <Text style={styles.secondaryButtonText}>{t("Common.done")}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Visitors.notes")}</Text>
                  <TextInput
                    multiline
                    onChangeText={setVisitorNotes}
                    placeholder={t("Visitors.notesPlaceholder")}
                    style={[styles.input, styles.multilineInput]}
                    value={visitorNotes}
                  />
                  {visitorMessage ? <Text style={[styles.infoText, styles.localizedText]}>{visitorMessage}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isCreatingVisitor || !visitorName.trim() || hasInvalidVisitWindow}
                    onPress={() => void handleCreateVisitor(activeUnitId)}
                    style={[
                      styles.primaryButton,
                      (isCreatingVisitor || !visitorName.trim() || hasInvalidVisitWindow) && styles.disabledButton,
                    ]}
                  >
                    {isCreatingVisitor ? (
                      <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t("Visitors.createPass")}</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.sectionText, styles.localizedText]}>{t("Visitors.unitRequired")}</Text>
              )}

              <View style={styles.visitorList}>
                <Text style={[styles.infoTitle, styles.localizedText]}>{t("Visitors.recent")}</Text>
                {visitorRequests.length > 0 ? (
                  visitorRequests.map((visitorRequest) => {
                    const token = visitorPassTokens[visitorRequest.id] ?? visitorRequest.qrToken;
                    const canCancel = !isVisitorClosed(visitorRequest);

                    return (
                      <View style={styles.visitorCard} key={visitorRequest.id}>
                        <View style={styles.rowBetween}>
                          <View style={styles.flexFill}>
                            <Text style={styles.actionLabel}>{visitorRequest.visitorName}</Text>
                            <Text style={[styles.actionDetail, styles.localizedText]}>
                              {visitorLocation(visitorRequest, t("Common.unit", { unit: visitorRequest.unit?.unitNumber ?? visitorRequest.unitId }))}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.statusBadge,
                              visitorRequest.status === "denied" || visitorRequest.status === "cancelled"
                                ? styles.statusBadgeDanger
                                : null,
                            ]}
                          >
                            {t(`Common.statuses.${visitorRequest.status}`, { defaultValue: formatStatus(visitorRequest.status) })}
                          </Text>
                        </View>
                        <Text style={[styles.sectionText, styles.localizedText]}>
                          {t("Visitors.window", {
                            end: formatDate(visitorRequest.visitEndsAt, announcementLocale),
                            start: formatDate(visitorRequest.visitStartsAt, announcementLocale),
                          })}
                        </Text>
                        {visitorRequest.vehiclePlate ? (
                          <Text style={[styles.sectionText, styles.localizedText]}>{t("Visitors.vehicle", { vehicle: visitorRequest.vehiclePlate })}</Text>
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
                              ? t("Visitors.missingQrToken")
                              : t("Visitors.passClosed")}
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
                              {isCancellingVisitorId === visitorRequest.id ? t("Visitors.cancelling") : t("Visitors.cancelPass")}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Visitors.empty")}</Text>
                )}
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Issues.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Issues.title")}</Text>
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Issues.count", { count: issues.length })}</Text>
                </View>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Pressable accessibilityRole="button" onPress={() => setShowIssueForm(!showIssueForm)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{showIssueForm ? t("Issues.cancel") : t("Issues.newIssue")}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void loadIssues()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{isRefreshingIssues ? t("Issues.refreshing") : t("Issues.refresh")}</Text>
                  </Pressable>
                </View>
              </View>

              {showIssueForm && activeUnitId ? (
                <View style={styles.visitorForm}>
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Issues.category")}</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
                    {issueCategories.map((cat) => (
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
                          {t(`Issues.categories.${cat}`)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Issues.issueTitle")}</Text>
                  <TextInput
                    onChangeText={setIssueTitle}
                    placeholder={t("Issues.titlePlaceholder")}
                    style={styles.input}
                    value={issueTitle}
                  />
                  <Text style={[styles.inputLabel, styles.localizedText]}>{t("Issues.description")}</Text>
                  <TextInput
                    multiline
                    onChangeText={setIssueDescription}
                    placeholder={t("Issues.descriptionPlaceholder")}
                    style={[styles.input, styles.multilineInput]}
                    value={issueDescription}
                  />
                  {issueMessage ? <Text style={[styles.infoText, styles.localizedText]}>{issueMessage}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isCreatingIssue || !issueTitle.trim() || !issueDescription.trim()}
                    onPress={() => void handleCreateIssue(activeUnitId)}
                    style={[
                      styles.primaryButton,
                      (isCreatingIssue || !issueTitle.trim() || !issueDescription.trim()) && styles.disabledButton,
                    ]}
                  >
                    {isCreatingIssue ? (
                      <ActivityIndicator color={isDark ? '#1f2937' : '#ffffff'} />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t("Issues.submit")}</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {issueMessage && !showIssueForm ? <Text style={[styles.infoText, styles.localizedText]}>{issueMessage}</Text> : null}

              {issues.length > 0 ? (
                <View style={styles.visitorList}>
                  <Text style={[styles.infoTitle, styles.localizedText]}>{t("Issues.recent")}</Text>
                  {issues.map((issue) => (
                    <View style={styles.visitorCard} key={issue.id}>
                      <View style={styles.rowBetween}>
                        <View style={styles.flexFill}>
                          <Text style={styles.actionLabel}>{issue.title}</Text>
                          <Text style={[styles.actionDetail, styles.localizedText]}>
                            {t(`Issues.categories.${issue.category}`, { defaultValue: formatStatus(issue.category) })} -{" "}
                            {t(`Issues.statuses.${issue.status}`, { defaultValue: formatStatus(issue.status) })}
                          </Text>
                        </View>
                        <Text style={[
                          styles.statusBadge,
                          (issue.status === 'resolved' || issue.status === 'closed') ? null : styles.statusBadgeDanger,
                        ]}>
                          {t(`Issues.statuses.${issue.status}`, { defaultValue: formatStatus(issue.status) })}
                        </Text>
                      </View>
                      <Text style={styles.sectionText} numberOfLines={2}>{issue.description}</Text>
                      <Text style={[styles.sectionText, styles.localizedText]}>
                        {t("Issues.created", { date: formatDateForLocale(issue.createdAt, announcementLocale, "") })}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.sectionText, styles.localizedText]}>{t("Issues.empty")}</Text>
              )}
            </View>

            {/* ── Finance ──────────────────────────────────────────────── */}
            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Finance.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Finance.title")}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable accessibilityRole="button" onPress={() => void loadUnitAccounts()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{isLoadingAccounts ? t("Finance.loading") : t("Common.refresh")}</Text>
                  </Pressable>
                </View>
              </View>
              {paymentMessage ? <Text style={[styles.infoText, styles.localizedText]}>{paymentMessage}</Text> : null}
              {unitAccounts.length === 0 ? (
                <Text style={[styles.sectionText, styles.localizedText]}>{t("Finance.noAccounts")}</Text>
              ) : (
                <>
                  {unitAccounts.map((account) => (
                    <View key={account.id} style={styles.itemCard}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.actionLabel}>{t("Finance.balance")}</Text>
                        <Text style={[styles.sectionTitle, { color: parseFloat(account.balance) < 0 ? "#dc2626" : "#116a57" }]}>
                          {account.balance} {account.currency}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setSelectedAccountId(account.id);
                          void loadAccountDetail(account.id);
                        }}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>{t("Finance.viewStatement")}</Text>
                      </Pressable>
                      {selectedAccountId === account.id && accountDetail ? (
                        <View style={{ marginTop: 8 }}>
                          {isLoadingAccountDetail ? (
                            <ActivityIndicator />
                          ) : (
                            <>
                              {(accountDetail.ledgerEntries ?? []).slice(0, 10).map((entry: LedgerEntry) => (
                                <View key={entry.id} style={[styles.itemCard, { marginBottom: 4 }]}>
                                  <View style={styles.rowBetween}>
                                    <Text style={styles.sectionText}>{entry.description ?? entry.type}</Text>
                                    <Text style={[styles.statusBadge, entry.type === "charge" || entry.type === "adjustment" ? styles.statusBadgeDanger : null]}>
                                      {entry.amount} {accountDetail.currency}
                                    </Text>
                                  </View>
                                  <Text style={[styles.sectionText, { fontSize: 11 }]}>
                                    {formatDate(entry.createdAt, announcementLocale)}
                                  </Text>
                                </View>
                              ))}
                              {(accountDetail.paymentSubmissions ?? []).slice(0, 5).map((sub: PaymentSubmission) => (
                                <View key={sub.id} style={[styles.itemCard, { marginBottom: 4 }]}>
                                  <View style={styles.rowBetween}>
                                    <Text style={styles.sectionText}>{t("Finance.paymentSubmission")} — {sub.method}</Text>
                                    <Text style={styles.statusBadge}>{sub.status}</Text>
                                  </View>
                                  <Text style={styles.sectionText}>{sub.amount} {sub.currency}</Text>
                                  <Text style={[styles.sectionText, { fontSize: 11 }]}>{formatDate(sub.createdAt, announcementLocale)}</Text>
                                </View>
                              ))}
                            </>
                          )}
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setShowPaymentForm(!showPaymentForm)}
                            style={[styles.secondaryButton, { marginTop: 8 }]}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {showPaymentForm ? t("Finance.cancelPayment") : t("Finance.submitPayment")}
                            </Text>
                          </Pressable>
                          {showPaymentForm ? (
                            <View style={styles.visitorForm}>
                              <Text style={[styles.inputLabel, styles.localizedText]}>{t("Finance.amount")}</Text>
                              <TextInput
                                keyboardType="decimal-pad"
                                onChangeText={setPaymentAmount}
                                placeholder={t("Finance.amountPlaceholder")}
                                style={styles.input}
                                value={paymentAmount}
                              />
                              <Text style={[styles.inputLabel, styles.localizedText]}>{t("Finance.method")}</Text>
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                                {["bank_transfer", "cash", "check"].map((m) => (
                                  <Pressable
                                    accessibilityRole="button"
                                    key={m}
                                    onPress={() => setPaymentMethod(m)}
                                    style={[styles.documentTypeChip, paymentMethod === m && styles.documentTypeChipSelected]}
                                  >
                                    <Text style={[styles.documentTypeText, paymentMethod === m && styles.documentTypeTextSelected]}>
                                      {t(`Finance.methods.${m}`, { defaultValue: m })}
                                    </Text>
                                  </Pressable>
                                ))}
                              </View>
                              <Text style={[styles.inputLabel, styles.localizedText]}>{t("Finance.reference")}</Text>
                              <TextInput
                                onChangeText={setPaymentReference}
                                placeholder={t("Finance.referencePlaceholder")}
                                style={styles.input}
                                value={paymentReference}
                              />
                              <Text style={[styles.inputLabel, styles.localizedText]}>{t("Finance.notes")}</Text>
                              <TextInput
                                multiline
                                numberOfLines={2}
                                onChangeText={setPaymentNotes}
                                placeholder={t("Finance.notesPlaceholder")}
                                style={[styles.input, { minHeight: 56 }]}
                                value={paymentNotes}
                              />
                              <Pressable
                                accessibilityRole="button"
                                disabled={isSubmittingPayment || !paymentAmount.trim()}
                                onPress={() => void handleSubmitPayment(account.id)}
                                style={[styles.primaryButton, (isSubmittingPayment || !paymentAmount.trim()) && styles.disabledButton]}
                              >
                                <Text style={styles.primaryButtonText}>
                                  {isSubmittingPayment ? t("Finance.submitting") : t("Finance.submitPayment")}
                                </Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* ── Governance ───────────────────────────────────────────── */}
            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Governance.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Governance.title")}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadVotes()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{isLoadingVotes ? t("Governance.loading") : t("Common.refresh")}</Text>
                </Pressable>
              </View>
              {voteMessage ? <Text style={[styles.infoText, styles.localizedText]}>{voteMessage}</Text> : null}
              {votes.filter((v) => v.status === "active").length === 0 ? (
                <Text style={[styles.sectionText, styles.localizedText]}>{t("Governance.noActiveVotes")}</Text>
              ) : (
                votes.filter((v) => v.status === "active").map((vote) => {
                  const eligibility = voteEligibility[vote.id];
                  const pickedOption = selectedVoteOption[vote.id];
                  return (
                    <View key={vote.id} style={styles.itemCard}>
                      <Text style={[styles.actionLabel, styles.localizedText]}>{vote.title}</Text>
                      {vote.description ? (
                        <Text style={[styles.sectionText, styles.localizedText]} numberOfLines={2}>{vote.description}</Text>
                      ) : null}
                      <Text style={[styles.sectionText, styles.localizedText]}>
                        {vote.endsAt ? t("Governance.endsAt", { date: formatDate(vote.endsAt, announcementLocale) }) : null}
                      </Text>
                      {!eligibility ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void loadVoteEligibility(vote.id)}
                          style={[styles.secondaryButton, { marginTop: 8 }]}
                        >
                          <Text style={styles.secondaryButtonText}>{t("Governance.checkEligibility")}</Text>
                        </Pressable>
                      ) : eligibility.hasVoted ? (
                        <Text style={[styles.infoText, styles.localizedText]}>{t("Governance.alreadyVoted")}</Text>
                      ) : eligibility.eligible ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={[styles.inputLabel, styles.localizedText]}>{t("Governance.selectOption")}</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            {vote.options?.map((opt) => (
                              <Pressable
                                accessibilityRole="button"
                                key={opt.id}
                                onPress={() => setSelectedVoteOption((c) => ({ ...c, [vote.id]: opt.id }))}
                                style={[styles.documentTypeChip, pickedOption === opt.id && styles.documentTypeChipSelected]}
                              >
                                <Text style={[styles.documentTypeText, pickedOption === opt.id && styles.documentTypeTextSelected]}>
                                  {opt.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            disabled={!pickedOption || castingVoteId === vote.id}
                            onPress={() => pickedOption && void handleCastVote(vote.id, pickedOption)}
                            style={[styles.primaryButton, (!pickedOption || castingVoteId === vote.id) && styles.disabledButton]}
                          >
                            <Text style={styles.primaryButtonText}>
                              {castingVoteId === vote.id ? t("Governance.casting") : t("Governance.castVote")}
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={[styles.infoText, styles.localizedText]}>
                          {t("Governance.ineligible", { reason: eligibility.reason ?? "" })}
                        </Text>
                      )}
                    </View>
                  );
                })
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
              <Text style={styles.secondaryButtonText}>{t("Auth.signOut")}</Text>
            </Pressable>
          </>
        ) : null}

        {/* ── Security Guard workspace ──────────────────────────────── */}
        {isActiveSecurityGuard ? (
          <>
            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <View style={styles.flexFill}>
                  <Text style={[styles.panelLabel, styles.localizedText]}>{t("Security.label")}</Text>
                  <Text style={[styles.sectionTitle, styles.localizedText]}>{t("Security.title")}</Text>
                  <Text style={[styles.sectionText, styles.localizedText]}>{t("Security.subtitle")}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void loadSecurityVisitors()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>
                    {isLoadingSecurityVisitors ? t("Common.refreshing") : t("Common.refresh")}
                  </Text>
                </Pressable>
              </View>

              {securityMessage ? <Text style={[styles.infoText, styles.localizedText]}>{securityMessage}</Text> : null}

              {/* Validate pass token input */}
              <View style={[styles.visitorForm, { marginTop: 12 }]}>
                <Text style={[styles.inputLabel, styles.localizedText]}>{t("Security.tokenLabel")}</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setValidatePassToken}
                  placeholder={t("Security.tokenPlaceholder")}
                  style={styles.input}
                  value={validatePassToken}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isValidating || !validatePassToken.trim()}
                  onPress={() => void handleValidatePass()}
                  style={[styles.primaryButton, (isValidating || !validatePassToken.trim()) && styles.disabledButton]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isValidating ? t("Security.validating") : t("Security.validate")}
                  </Text>
                </Pressable>
              </View>

              {validateResult ? (
                <View style={[styles.itemCard, { marginTop: 8 }]}>
                  <Text style={[styles.actionLabel, styles.localizedText]}>
                    {t("Security.result")}: {validateResult.result}
                  </Text>
                  {validateResult.visitorRequest ? (
                    <>
                      <Text style={styles.sectionText}>{validateResult.visitorRequest.visitorName}</Text>
                      <Text style={[styles.sectionText, styles.localizedText]}>
                        {t("Visitors.window", {
                          start: formatDate(validateResult.visitorRequest.visitStartsAt, announcementLocale),
                          end: formatDate(validateResult.visitorRequest.visitEndsAt, announcementLocale),
                        })}
                      </Text>
                      {validateResult.result === "valid" ? (
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <Pressable
                            accessibilityRole="button"
                            disabled={processingVisitorId === validateResult.visitorRequest.id}
                            onPress={() => void handleSecurityAction(validateResult.visitorRequest!.id, "allow")}
                            style={[styles.primaryButton, { flex: 1 }]}
                          >
                            <Text style={styles.primaryButtonText}>{t("Security.allow")}</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            disabled={processingVisitorId === validateResult.visitorRequest.id}
                            onPress={() => void handleSecurityAction(validateResult.visitorRequest!.id, "deny")}
                            style={[styles.secondaryButton, { borderColor: "#dc2626" }]}
                          >
                            <Text style={[styles.secondaryButtonText, { color: "#dc2626" }]}>{t("Security.deny")}</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}

              {/* Pending visitors list */}
              <Text style={[styles.inputLabel, styles.localizedText, { marginTop: 16 }]}>{t("Security.pendingVisitors")}</Text>
              {securityVisitors.length === 0 ? (
                <Text style={[styles.sectionText, styles.localizedText]}>{t("Security.noPending")}</Text>
              ) : (
                securityVisitors.map((visitor) => (
                  <View key={visitor.id} style={[styles.itemCard, { marginBottom: 4 }]}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.actionLabel}>{visitor.visitorName}</Text>
                      <Text style={styles.statusBadge}>
                        {t(`Common.statuses.${visitor.status}`, { defaultValue: formatStatus(visitor.status) })}
                      </Text>
                    </View>
                    <Text style={[styles.sectionText, styles.localizedText]}>
                      {t("Visitors.window", {
                        start: formatDate(visitor.visitStartsAt, announcementLocale),
                        end: formatDate(visitor.visitEndsAt, announcementLocale),
                      })}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={processingVisitorId === visitor.id}
                        onPress={() => void handleSecurityAction(visitor.id, "allow")}
                        style={[styles.primaryButton, { flex: 1 }]}
                      >
                        <Text style={styles.primaryButtonText}>{t("Security.allow")}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={processingVisitorId === visitor.id}
                        onPress={() => void handleSecurityAction(visitor.id, "deny")}
                        style={[styles.secondaryButton, { borderColor: "#dc2626" }]}
                      >
                        <Text style={[styles.secondaryButtonText, { color: "#dc2626" }]}>{t("Security.deny")}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={processingVisitorId === visitor.id}
                        onPress={() => void handleSecurityAction(visitor.id, "complete")}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>{t("Security.complete")}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t("Auth.signOut")}</Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.footerPanel}>
          <Text style={[styles.panelLabel, styles.localizedText]}>{t("Footer.environment")}</Text>
          <Text style={[styles.footerText, styles.localizedText]}>{status?.environment ?? t("Footer.notConnected")}</Text>
          <Text style={[styles.footerText, styles.localizedText]}>{status?.timezone ?? t("Footer.timezonePending")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean, isRtl: boolean) => StyleSheet.create({
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
  itemCard: {
    backgroundColor: isDark ? "#1a2535" : "#f8f9fb",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 12,
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
  announcementHeaderRow: {
    alignItems: "center",
    flexDirection: isRtl ? "row-reverse" : "row",
    gap: 12,
    justifyContent: "space-between",
  },
  localizedText: {
    textAlign: isRtl ? "right" : "left",
    writingDirection: isRtl ? "rtl" : "ltr",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: isRtl ? "row-reverse" : "row",
    gap: 10,
  },
  emptyState: {
    backgroundColor: isDark ? "#172554" : "#eef4ff",
    borderColor: isDark ? "#1d4ed8" : "#c7d7fe",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  announcementCard: {
    backgroundColor: isDark ? "#111827" : "#fbfcfd",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  announcementBadgeRow: {
    alignItems: "center",
    flexDirection: isRtl ? "row-reverse" : "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: isDark ? "#134e4a" : "#e6f3ef",
    borderRadius: 8,
    color: isDark ? "#5eead4" : "#116a57",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityBadge: {
    alignSelf: "flex-start",
    backgroundColor: isDark ? "#1e3a8a" : "#eaf0ff",
    borderRadius: 8,
    color: isDark ? "#93c5fd" : "#244a8f",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityBadgeHigh: {
    backgroundColor: isDark ? "#78350f" : "#fff4db",
    color: isDark ? "#fbbf24" : "#7a4f10",
  },
  priorityBadgeCritical: {
    backgroundColor: isDark ? "#7f1d1d" : "#fde8e5",
    color: isDark ? "#f87171" : "#b42318",
  },
  announcementMetaBlock: {
    gap: 2,
  },
  propertyMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  propertyMetaItem: {
    backgroundColor: isDark ? "#111827" : "#fbfcfd",
    borderColor: isDark ? "#374151" : "#d7dce3",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    minWidth: 130,
    padding: 10,
  },
  acknowledgementPanel: {
    backgroundColor: isDark ? "#172554" : "#eef4ff",
    borderColor: isDark ? "#1d4ed8" : "#c7d7fe",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
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
