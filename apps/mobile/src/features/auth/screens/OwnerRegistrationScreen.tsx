import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { pick, types } from "@react-native-documents/picker";
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

type Navigation = StackNavigationProp<RootStackParamList>;

type PickedPdf = {
  uri: string;
  name: string;
  type: string;
};

const deviceService = "compound.mobile.ownerRegistrationDevice";
const requestService = "compound.mobile.ownerRegistrationRequest";

const createDeviceId = () => `owner-reg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const PdfPicker = ({
  label,
  hint,
  file,
  onPick,
  isRtl,
}: {
  label: string;
  hint: string;
  file: PickedPdf | null;
  onPick: () => void;
  isRtl: boolean;
}) => {
  const isDark = useColorScheme() === "dark";
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const muted = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const border = isDark ? colors.border.dark : colors.border.light;

  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.pdfPicker, rowDirectionStyle(isRtl), { borderColor: file ? colors.primary.light : border }]}
    >
      <Icon name={file ? "check" : "documents"} color={file ? colors.success : muted} size={22} />
      <View style={styles.pdfCopy}>
        <Typography style={[styles.pdfLabel, { color: text }, textDirectionStyle(isRtl)]}>{label}</Typography>
        <Typography variant="caption" style={[{ color: muted }, textDirectionStyle(isRtl)]}>
          {file?.name ?? hint}
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

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const muted = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const border = isDark ? colors.border.dark : colors.border.light;

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

  const pickPdf = async (setter: (file: PickedPdf) => void) => {
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
    } catch {
      // Picker cancellation should be silent.
    }
  };

  const canSubmit = Boolean(
    deviceId &&
      fullNameArabic.trim() &&
      phone.trim() &&
      email.trim() &&
      apartmentCode.trim() &&
      buildingId &&
      ownerAcknowledged &&
      idCardPdf &&
      contractPdf &&
      handoverPdf,
  );

  const handleSubmit = async () => {
    if (!canSubmit || !deviceId || !buildingId || !idCardPdf || !contractPdf || !handoverPdf) {
      Alert.alert(
        t("OwnerRegistration.missingTitle", { defaultValue: "Missing information" }),
        t("OwnerRegistration.missingMessage", { defaultValue: "Please complete all owner request fields and upload the required PDF files." }),
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("fullNameArabic", fullNameArabic.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("apartmentCode", apartmentCode.trim().toUpperCase());
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

  const renderBuilding = (building: OwnerRegistrationBuilding) => {
    const selected = building.id === buildingId;

    return (
      <Pressable
        key={building.id}
        onPress={() => setBuildingId(building.id)}
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
      edges={["top", "left", "right"]}
      style={[styles.root, appDirectionStyle(isRtl), { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, rowDirectionStyle(isRtl)]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t("Common.back", { defaultValue: "Back" })}
          >
            <Icon name={isRtl ? "arrow-right" : "arrow-left"} color={text} size={20} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Typography variant="h1" style={[styles.title, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.title", { defaultValue: "Contact Admin" })}
            </Typography>
            <Typography style={[styles.subtitle, { color: muted }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.subtitle", { defaultValue: "Owner registration for Next Point. طلب تسجيل مالك في نكست بوينت." })}
            </Typography>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <Icon name="user" color={colors.primary.light} size={22} />
            <Typography variant="h2" style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.ownerDetails", { defaultValue: "Owner Details" })}
            </Typography>
          </View>

          <Input label={t("OwnerRegistration.fullNameArabic", { defaultValue: "Full Name In Arabic / الاسم الرباعي" })} value={fullNameArabic} onChangeText={setFullNameArabic} />
          <Input label={t("OwnerRegistration.phone", { defaultValue: "Phone number / رقم موبايل للتواصل" })} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label={t("OwnerRegistration.email", { defaultValue: "Email Address / البريد الإلكتروني" })} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Pressable
            onPress={() => setOwnerAcknowledged((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ownerAcknowledged }}
            style={[styles.ownerCheck, rowDirectionStyle(isRtl)]}
          >
            <View style={[styles.checkBox, { borderColor: ownerAcknowledged ? colors.primary.light : border, backgroundColor: ownerAcknowledged ? colors.primary.light : "transparent" }]}>
              {ownerAcknowledged ? <Icon name="check" color={colors.text.inverse} size={14} /> : null}
            </View>
            <Typography style={[{ color: text, flex: 1 }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.ownerAcknowledgement", { defaultValue: "I confirm I am the apartment owner and the uploaded documents are mine. أقر أنني المالك وأن المستندات صحيحة." })}
            </Typography>
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <Icon name="building" color={colors.primary.light} size={22} />
            <Typography variant="h2" style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.apartmentData", { defaultValue: "Apartment Data" })}
            </Typography>
          </View>

          <Input
            label={t("OwnerRegistration.apartmentCode", { defaultValue: "Apartment Code / كود الوحدة (e.g. HR-F01-F02)" })}
            value={apartmentCode}
            onChangeText={setApartmentCode}
            autoCapitalize="characters"
          />

          <Typography variant="label" style={[{ color: text, marginBottom: spacing.sm }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.buildingCharacter", { defaultValue: "Building Character / حرف المبنى" })}
          </Typography>
          <View style={[styles.buildingGrid, isRtl && styles.buildingGridRtl]}>
            {loadingBuildings ? (
              <Typography variant="caption" style={[{ color: muted }, textDirectionStyle(isRtl)]}>{t("Common.loading", { defaultValue: "Loading..." })}</Typography>
            ) : (
              buildings.map(renderBuilding)
            )}
          </View>
          {selectedBuilding ? (
            <Typography variant="caption" style={[styles.selectedBuilding, { color: muted }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.selectedBuilding", { defaultValue: "Selected: {{building}}", building: selectedBuilding.label })}
            </Typography>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <Icon name="documents" color={colors.primary.light} size={22} />
            <Typography variant="h2" style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>
              {t("OwnerRegistration.requiredPdfs", { defaultValue: "Required PDFs" })}
            </Typography>
          </View>
          <Typography style={[styles.hint, { color: muted }, textDirectionStyle(isRtl)]}>
            {t("OwnerRegistration.pdfHint", { defaultValue: "Please upload scanned PDF files.\nYou can use CamScanner or merge images into one PDF using https://jpg2pdf.com/\nبرجاء الرفع PDF (Scan)\nيمكن استخدام برنامج CamScanner\nأو هذه الخدمة لدمج الصور في ملف واحد https://jpg2pdf.com/" })}
          </Typography>

          <PdfPicker
            isRtl={isRtl}
            label={t("OwnerRegistration.idCardPdf", { defaultValue: "ID card PDF / بطاقة الرقم القومي (الوجهين)" })}
            hint={t("OwnerRegistration.idCardHint", { defaultValue: "Front and back in one PDF" })}
            file={idCardPdf}
            onPick={() => pickPdf(setIdCardPdf)}
          />
          <PdfPicker
            isRtl={isRtl}
            label={t("OwnerRegistration.contractPdf", { defaultValue: "The full contract PDF / العقد الكامل" })}
            hint={t("OwnerRegistration.contractHint", { defaultValue: "Upload the scanned full contract" })}
            file={contractPdf}
            onPick={() => pickPdf(setContractPdf)}
          />
          <PdfPicker
            isRtl={isRtl}
            label={t("OwnerRegistration.handoverPdf", { defaultValue: "Handover minutes PDF / محضر الاستلام" })}
            hint={t("OwnerRegistration.handoverHint", { defaultValue: "Upload handover proof as PDF" })}
            file={handoverPdf}
            onPick={() => pickPdf(setHandoverPdf)}
          />
        </Card>

        <Button
          title={t("OwnerRegistration.submit", { defaultValue: "Submit for admin review" })}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          loading={isSubmitting}
          leftIcon="check"
          style={styles.submit}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenGutter, paddingTop: layout.screenTop, paddingBottom: layout.screenBottom },
  header: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: layout.sectionGap },
  backButton: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { flexShrink: 1 },
  subtitle: { marginTop: spacing.xs, lineHeight: 22 },
  card: { marginBottom: layout.sectionGap },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { flex: 1 },
  ownerCheck: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xs },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },
  buildingGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  buildingGridRtl: { justifyContent: "flex-end" },
  buildingChip: { minWidth: 46, minHeight: 42, borderRadius: radii.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  selectedBuilding: { marginTop: spacing.sm },
  hint: { marginBottom: spacing.md, lineHeight: 22 },
  pdfPicker: { borderWidth: 1.5, borderRadius: radii.xl, borderStyle: "dashed", padding: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.sm },
  pdfCopy: { flex: 1, gap: spacing.xs },
  pdfLabel: { fontWeight: "800" },
  submit: { marginBottom: spacing.md },
});
