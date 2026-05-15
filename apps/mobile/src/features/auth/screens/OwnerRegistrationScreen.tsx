import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { pick, types } from "@react-native-documents/picker";
import { z } from "zod";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import * as Keychain from "react-native-keychain";
import type { OwnerRegistrationBuilding } from "@compound/contracts";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Icon } from "../../../components/ui/Icon";
import { Input } from "../../../components/ui/Input";
import { Typography } from "../../../components/ui/Typography";
import { useGetOwnerRegistrationBuildingsQuery, useSubmitOwnerRegistrationMutation } from "../../../services/ownerRegistration";
import { colors, layout, radii, spacing } from "../../../theme";
import type { RootStackParamList } from "../../../navigation/types";
import { selectLanguagePreference } from "../../../store/systemSlice";
import { appDirectionStyle, centerTextDirectionStyle, isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";
import { digitsOnly, normalizeDigits } from "../../../utils/numerals";

type Navigation = StackNavigationProp<RootStackParamList>;

type PickedPdf = {
  uri: string;
  name: string;
  type: string;
};

type PickedPdfKey = "idCardPdf" | "contractPdf" | "handoverPdf";
type ValidationErrors = Partial<Record<"fullNameArabic" | "phone" | "email" | "apartmentCode" | "buildingId" | "ownerAcknowledged" | PickedPdfKey, string>>;

const deviceService = "compound.mobile.ownerRegistrationDevice";
const requestService = "compound.mobile.ownerRegistrationRequest";
const arabicNameCharacters = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\sـ]+$/u;
const phoneDigits = /^\d{10,15}$/;

const createDeviceId = () => `owner-reg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeApartmentCode = (value: string) =>
  normalizeDigits(value.trim()).replace(/\d+/g, (digits) => (digits.length === 1 ? `0${digits}` : digits));

const PdfPicker = ({
  label,
  hint,
  file,
  onPick,
  isRtl,
  loading,
  loadingLabel,
}: {
  label: string;
  hint: string;
  file: PickedPdf | null;
  onPick: () => void;
  isRtl: boolean;
  loading?: boolean;
  loadingLabel: string;
}) => {
  const isDark = useColorScheme() === "dark";
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const muted = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const border = isDark ? colors.border.dark : colors.border.light;

  return (
    <Pressable
      onPress={onPick}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      style={[styles.pdfPicker, rowDirectionStyle(isRtl), { borderColor: file ? colors.primary.light : border, opacity: loading ? 0.72 : 1 }]}
    >
      {loading ? <ActivityIndicator color={colors.primary.light} /> : <Icon name={file ? "check" : "documents"} color={file ? colors.success : muted} size={22} />}
      <View style={styles.pdfCopy}>
        <Typography style={[styles.pdfLabel, { color: text }, textDirectionStyle(isRtl)]}>{label}</Typography>
        <Typography variant="caption" style={[{ color: muted }, textDirectionStyle(isRtl)]}>
          {loading ? loadingLabel : file?.name ?? hint}
        </Typography>
      </View>
    </Pressable>
  );
};

export const OwnerRegistrationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const isDark = useColorScheme() === "dark";
  const language = useSelector(selectLanguagePreference);
  const isRtl = isRtlLanguage(language);
  const { data: buildings = [], isLoading: loadingBuildings } = useGetOwnerRegistrationBuildingsQuery();
  const [submitRegistration, { isLoading: isSubmitting }] = useSubmitOwnerRegistrationMutation();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [fullNameArabic, setFullNameArabic] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [apartmentCode, setApartmentCode] = useState("");
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [ownerAcknowledged, setOwnerAcknowledged] = useState(false);
  const [idCardPdf, setIdCardPdf] = useState<PickedPdf | null>(null);
  const [contractPdf, setContractPdf] = useState<PickedPdf | null>(null);
  const [handoverPdf, setHandoverPdf] = useState<PickedPdf | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [pickingPdf, setPickingPdf] = useState<PickedPdfKey | null>(null);

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const muted = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const inputTone = useMemo(() => ({
    backgroundColor: surface,
    borderColor: border,
    color: text,
  }), [border, surface, text]);

  useEffect(() => {
    const hydrateDevice = async () => {
      const stored = await Keychain.getGenericPassword({ service: deviceService });
      if (stored) {
        setDeviceId(stored.password);
        return;
      }

      const nextDeviceId = createDeviceId();
      await Keychain.setGenericPassword("deviceId", nextDeviceId, { service: deviceService });
      setDeviceId(nextDeviceId);
    };

    void hydrateDevice();
  }, []);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === buildingId) ?? null,
    [buildingId, buildings],
  );

  const emailSchema = useMemo(() => z.string()
    .trim()
    .min(1, t("OwnerRegistration.validation.emailRequired", { defaultValue: "Email address is required." }))
    .email(t("OwnerRegistration.validation.emailInvalid", { defaultValue: "Enter a valid email address." })),
  [t]);

  const registrationSchema = useMemo(() => z.object({
    fullNameArabic: z.string()
      .trim()
      .min(1, t("OwnerRegistration.validation.fullNameRequired", { defaultValue: "Full Arabic name is required." }))
      .regex(arabicNameCharacters, t("OwnerRegistration.validation.fullNameArabicOnly", { defaultValue: "Please write the full name using Arabic letters only." }))
      .refine((value) => value.trim().split(/\s+/).filter(Boolean).length >= 4, t("OwnerRegistration.validation.fullNameFourParts", { defaultValue: "Please enter the four-part Arabic name." })),
    phone: z.string()
      .trim()
      .min(1, t("OwnerRegistration.validation.phoneRequired", { defaultValue: "Phone number is required." }))
      .regex(phoneDigits, t("OwnerRegistration.validation.phoneDigits", { defaultValue: "Phone number must be 10 to 15 digits only." })),
    email: emailSchema,
    apartmentCode: z.string()
      .trim()
      .min(1, t("OwnerRegistration.validation.apartmentRequired", { defaultValue: "Apartment code is required." })),
    buildingId: z.string().min(1, t("OwnerRegistration.validation.buildingRequired", { defaultValue: "Choose the building." })),
    ownerAcknowledged: z.boolean().refine(Boolean, t("OwnerRegistration.validation.ownerAcknowledged", { defaultValue: "Only the owner can submit this request." })),
    idCardPdf: z.any().refine(Boolean, t("OwnerRegistration.validation.idCardRequired", { defaultValue: "Upload the ID card PDF." })),
    contractPdf: z.any().refine(Boolean, t("OwnerRegistration.validation.contractRequired", { defaultValue: "Upload the full contract PDF." })),
    handoverPdf: z.any().refine(Boolean, t("OwnerRegistration.validation.handoverRequired", { defaultValue: "Upload the handover minutes PDF." })),
  }), [emailSchema, t]);

  const clearFieldError = (field: keyof ValidationErrors) => {
    setValidationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleArabicNameChange = (value: string) => {
    setFullNameArabic(value);
    if (value.trim() && !arabicNameCharacters.test(value.trim())) {
      setValidationErrors((current) => ({
        ...current,
        fullNameArabic: t("OwnerRegistration.validation.fullNameArabicOnly", { defaultValue: "Please write the full name using Arabic letters only." }),
      }));
      return;
    }
    clearFieldError("fullNameArabic");
  };

  const handlePhoneChange = (value: string) => {
    const normalized = normalizeDigits(value);
    const digits = digitsOnly(normalized, 15);
    const rejectedCharacters = normalized.replace(/\D/g, "") !== normalized || normalized.replace(/\D/g, "").length > 15;
    setPhone(digits);
    if (rejectedCharacters) {
      setValidationErrors((current) => ({
        ...current,
        phone: t("OwnerRegistration.validation.phoneDigits", { defaultValue: "Phone number must be 10 to 15 digits only." }),
      }));
      return;
    }
    clearFieldError("phone");
  };

  const validateEmailField = (value: string, showRequired = false) => {
    const trimmed = value.trim();

    if (!trimmed) {
      if (showRequired) {
        setValidationErrors((current) => ({
          ...current,
          email: t("OwnerRegistration.validation.emailRequired", { defaultValue: "Email address is required." }),
        }));
      } else {
        clearFieldError("email");
      }
      return;
    }

    const parsed = emailSchema.safeParse(value);
    if (!parsed.success) {
      setValidationErrors((current) => ({
        ...current,
        email: parsed.error.issues[0]?.message ?? t("OwnerRegistration.validation.emailInvalid", { defaultValue: "Enter a valid email address." }),
      }));
      return;
    }

    clearFieldError("email");
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    validateEmailField(value);
  };

  const handleApartmentCodeChange = (value: string) => {
    setApartmentCode(normalizeDigits(value));
    clearFieldError("apartmentCode");
  };

  const handleApartmentCodeBlur = () => {
    const normalized = normalizeApartmentCode(apartmentCode);
    setApartmentCode(normalized);
    if (!normalized) {
      setValidationErrors((current) => ({
        ...current,
        apartmentCode: t("OwnerRegistration.validation.apartmentRequired", { defaultValue: "Apartment code is required." }),
      }));
      return;
    }
    clearFieldError("apartmentCode");
  };

  const pickPdf = async (key: PickedPdfKey, setter: (file: PickedPdf) => void) => {
    setPickingPdf(key);
    try {
      const [result] = await pick({
        allowMultiSelection: false,
        type: [types.pdf],
      });

      setter({
        uri: result.uri,
        name: result.name ?? "document.pdf",
        type: result.type ?? "application/pdf",
      });
      clearFieldError(key);
    } catch {
      // Picker cancellation should be silent.
    } finally {
      setPickingPdf(null);
    }
  };

  const handleSubmit = async () => {
    const normalizedApartmentCode = normalizeApartmentCode(apartmentCode);
    setApartmentCode(normalizedApartmentCode);

    const parsed = registrationSchema.safeParse({
      fullNameArabic,
      phone,
      email,
      apartmentCode: normalizedApartmentCode,
      buildingId: buildingId ?? "",
      ownerAcknowledged,
      idCardPdf,
      contractPdf,
      handoverPdf,
    });

    if (!parsed.success) {
      const nextErrors: ValidationErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !nextErrors[key as keyof ValidationErrors]) {
          nextErrors[key as keyof ValidationErrors] = issue.message;
        }
      }
      setValidationErrors(nextErrors);
      Alert.alert(
        t("OwnerRegistration.missingTitle", { defaultValue: "Missing information" }),
        t("OwnerRegistration.validation.fixErrors", { defaultValue: "Please fix the highlighted fields before submitting." }),
      );
      return;
    }

    if (!deviceId || !buildingId || !idCardPdf || !contractPdf || !handoverPdf) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("fullNameArabic", fullNameArabic.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("apartmentCode", normalizedApartmentCode);
      formData.append("buildingId", buildingId);
      formData.append("deviceId", deviceId);
      formData.append("ownerAcknowledged", "1");
      formData.append("idCardPdf", idCardPdf as never);
      formData.append("contractPdf", contractPdf as never);
      formData.append("handoverPdf", handoverPdf as never);

      const response = await submitRegistration(formData).unwrap();
      if (response.requestToken) {
        await Keychain.setGenericPassword("requestToken", response.requestToken, { service: requestService });
      }

      Alert.alert(
        t("OwnerRegistration.submittedTitle", { defaultValue: "Request submitted" }),
        t("OwnerRegistration.submittedMessage", { defaultValue: "Your owner registration request is now under review. You can check the decision from the login screen." }),
        [{ text: t("OwnerRegistration.backToLogin", { defaultValue: "Back to login" }), onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      const message = error?.data?.message ?? t("OwnerRegistration.failedMessage", { defaultValue: "Could not submit the request. Please check the PDFs and try again." });
      Alert.alert(t("OwnerRegistration.failedTitle", { defaultValue: "Submission failed" }), message);
    }
  };

  const renderBuilding = ({ item: building }: { item: OwnerRegistrationBuilding }) => {
    const selected = building.id === buildingId;

    return (
      <Pressable
        onPress={() => {
          setBuildingId(building.id);
          clearFieldError("buildingId");
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.buildingChip,
          {
            backgroundColor: selected ? colors.primary.light : surface,
            borderColor: selected ? colors.primary.light : border,
          },
        ]}
      >
        <Typography style={[{ color: selected ? colors.text.inverse : text, fontWeight: "800" }, centerTextDirectionStyle(isRtl)]}>
          {building.code}
        </Typography>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.root, appDirectionStyle(isRtl), { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}
    >
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, rowDirectionStyle(isRtl), { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderBottomColor: border }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t("Common.back", { defaultValue: "Back" })}
          >
            <Icon name="arrow-left" color={text} size={20} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Typography variant="h1" style={[styles.title, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.title")}
            </Typography>
            <Typography style={[styles.subtitle, { color: muted }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.subtitle")}
            </Typography>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.heroCard}>
          <Typography variant="label" style={[{ color: colors.primary.light }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.ownersOnly")}
          </Typography>
          <Typography variant="h2" style={[styles.heroTitle, { color: text }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.reviewTitle")}
          </Typography>
          <Typography style={[styles.heroBody, { color: muted }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.reviewBody")}
          </Typography>
        </Card>

        <Card style={styles.card}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <Icon name="user" color={colors.primary.light} size={22} />
            <Typography variant="h2" style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.ownerDetails")}
            </Typography>
          </View>

          <Input
            label={t("OwnerRegistration.fullNameArabic")}
            value={fullNameArabic}
            onChangeText={handleArabicNameChange}
            error={validationErrors.fullNameArabic}
            autoCorrect={false}
            style={[inputTone, textDirectionStyle(isRtl)]}
          />
          <Input
            label={t("OwnerRegistration.phone")}
            value={phone}
            onChangeText={handlePhoneChange}
            error={validationErrors.phone}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={15}
            style={[inputTone, styles.ltrInput]}
          />
          <Input
            label={t("OwnerRegistration.email")}
            value={email}
            onChangeText={handleEmailChange}
            onBlur={() => validateEmailField(email, true)}
            error={validationErrors.email}
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            style={[inputTone, styles.ltrInput]}
          />

          <Pressable
            onPress={() => {
              setOwnerAcknowledged((value) => !value);
              clearFieldError("ownerAcknowledged");
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ownerAcknowledged }}
            style={[styles.ownerCheck, rowDirectionStyle(isRtl)]}
          >
            <View style={[styles.checkBox, { borderColor: ownerAcknowledged ? colors.primary.light : border, backgroundColor: ownerAcknowledged ? colors.primary.light : "transparent" }]}>
              {ownerAcknowledged ? <Icon name="check" color={colors.text.inverse} size={14} /> : null}
            </View>
            <Typography style={[{ color: text, flex: 1 }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.ownerAcknowledgement")}
            </Typography>
          </Pressable>
          {validationErrors.ownerAcknowledged ? (
            <Typography variant="error" style={[styles.inlineError, textDirectionStyle(isRtl)]}>{validationErrors.ownerAcknowledged}</Typography>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <Icon name="building" color={colors.primary.light} size={22} />
            <Typography variant="h2" style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.apartmentData")}
            </Typography>
          </View>

          <Input
            label={t("OwnerRegistration.apartmentCode")}
            value={apartmentCode}
            onChangeText={handleApartmentCodeChange}
            onBlur={handleApartmentCodeBlur}
            error={validationErrors.apartmentCode}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[inputTone, styles.ltrInput]}
          />

          <Typography variant="label" style={[{ color: text, marginBottom: spacing.sm }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.buildingCharacter")}
          </Typography>
          <View style={[styles.buildingGrid, isRtl && styles.buildingGridRtl]}>
            {loadingBuildings ? (
              <Typography variant="caption" style={[{ color: muted }, textDirectionStyle(isRtl)]}>{t("Common.loading")}</Typography>
            ) : (
              <FlatList
                data={buildings}
                keyExtractor={(building) => building.id}
                renderItem={renderBuilding}
                horizontal
                inverted={isRtl}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.buildingList}
              />
            )}
          </View>
          {selectedBuilding ? (
            <Typography variant="caption" style={[styles.selectedBuilding, { color: muted }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.selectedBuilding", { building: selectedBuilding.label })}
            </Typography>
          ) : null}
          {validationErrors.buildingId ? (
            <Typography variant="error" style={[styles.inlineError, textDirectionStyle(isRtl)]}>{validationErrors.buildingId}</Typography>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <Icon name="documents" color={colors.primary.light} size={22} />
            <Typography variant="h2" style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.requiredPdfs")}
            </Typography>
          </View>
          <Typography style={[styles.hint, { color: muted }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.pdfHint")}
          </Typography>

          <PdfPicker
            isRtl={isRtl}
            label={t("OwnerRegistration.idCardPdf")}
            hint={t("OwnerRegistration.idCardHint")}
            file={idCardPdf}
            onPick={() => pickPdf("idCardPdf", setIdCardPdf)}
            loading={pickingPdf === "idCardPdf"}
            loadingLabel={t("OwnerRegistration.openingPicker", { defaultValue: "Opening document picker..." })}
          />
          {validationErrors.idCardPdf ? (
            <Typography variant="error" style={[styles.inlineError, textDirectionStyle(isRtl)]}>{validationErrors.idCardPdf}</Typography>
          ) : null}
          <PdfPicker
            isRtl={isRtl}
            label={t("OwnerRegistration.contractPdf")}
            hint={t("OwnerRegistration.contractHint")}
            file={contractPdf}
            onPick={() => pickPdf("contractPdf", setContractPdf)}
            loading={pickingPdf === "contractPdf"}
            loadingLabel={t("OwnerRegistration.openingPicker", { defaultValue: "Opening document picker..." })}
          />
          {validationErrors.contractPdf ? (
            <Typography variant="error" style={[styles.inlineError, textDirectionStyle(isRtl)]}>{validationErrors.contractPdf}</Typography>
          ) : null}
          <PdfPicker
            isRtl={isRtl}
            label={t("OwnerRegistration.handoverPdf")}
            hint={t("OwnerRegistration.handoverHint")}
            file={handoverPdf}
            onPick={() => pickPdf("handoverPdf", setHandoverPdf)}
            loading={pickingPdf === "handoverPdf"}
            loadingLabel={t("OwnerRegistration.openingPicker", { defaultValue: "Opening document picker..." })}
          />
          {validationErrors.handoverPdf ? (
            <Typography variant="error" style={[styles.inlineError, textDirectionStyle(isRtl)]}>{validationErrors.handoverPdf}</Typography>
          ) : null}
        </Card>

        </ScrollView>

        <View style={[styles.stickyFooter, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderTopColor: border }]}>
          <Button
            title={t("OwnerRegistration.submit")}
            onPress={handleSubmit}
            disabled={!deviceId || isSubmitting}
            loading={isSubmitting}
            leftIcon="check"
            style={styles.submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenGutter, paddingTop: spacing.lg, paddingBottom: layout.screenBottom + 104 },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { flexShrink: 1 },
  subtitle: { marginTop: spacing.xs, lineHeight: 22 },
  heroCard: { marginBottom: layout.sectionGap, gap: spacing.sm },
  heroTitle: { marginTop: spacing.xs },
  heroBody: { lineHeight: 22 },
  card: { marginBottom: layout.sectionGap },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { flex: 1 },
  ownerCheck: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xs },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },
  inlineError: { marginTop: spacing.xs, marginBottom: spacing.sm },
  ltrInput: { textAlign: "left", writingDirection: "ltr" },
  buildingGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  buildingGridRtl: { justifyContent: "flex-end" },
  buildingList: { gap: spacing.sm, paddingVertical: spacing.xs },
  buildingChip: { minWidth: 46, minHeight: 42, borderRadius: radii.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  selectedBuilding: { marginTop: spacing.sm },
  hint: { marginBottom: spacing.md, lineHeight: 22 },
  pdfPicker: { borderWidth: 1.5, borderRadius: radii.xl, borderStyle: "dashed", padding: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.sm },
  pdfCopy: { flex: 1, gap: spacing.xs },
  pdfLabel: { fontWeight: "800" },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  submit: { marginBottom: 0 },
});
