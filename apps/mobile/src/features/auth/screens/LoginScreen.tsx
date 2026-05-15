import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { skipToken } from '@reduxjs/toolkit/query';
import * as Keychain from "react-native-keychain";
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPasswordMutation, useLoginMutation, useResetPasswordMutation } from '../../../services/auth';
import { setCredentials } from '../../../store/authSlice';
import {
  selectColorSchemePreference,
  selectLanguagePreference,
  setColorSchemePreference,
  setLanguagePreference,
} from '../../../store/systemSlice';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing, shadows, radii } from '../../../theme';
import { Icon } from '../../../components/ui/Icon';
import { uatPersonaEmails, uatPersonaPassword } from '../login-personas';
import { useGetOwnerRegistrationStatusQuery } from '../../../services/ownerRegistration';
import type { RootStackParamList } from '../../../navigation/types';
import { appDirectionStyle, applyNativeDirection, centerTextDirectionStyle, isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';
import { persistMobilePreferences } from '../../../i18n/preferences';

const PersonaChip = ({
  label,
  onSelect,
  testID,
  disabled,
  accessibilityLabel,
}: {
  label: string,
  onSelect: () => void;
  testID: string;
  disabled?: boolean;
  accessibilityLabel: string;
}) => (
  <TouchableOpacity 
    onPress={onSelect}
    disabled={disabled}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={{
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
      marginEnd: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <Typography style={{ color: colors.palette.ink[300], fontSize: 12, fontWeight: '700' }}>{label}</Typography>
  </TouchableOpacity>
);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const authTokenService = "compound.mobile.authToken";
const ownerDeviceService = "compound.mobile.ownerRegistrationDevice";
const ownerRequestService = "compound.mobile.ownerRegistrationRequest";

type PasswordSetupForm = {
  password: string;
  confirmPassword: string;
};

export const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const language = useSelector(selectLanguagePreference);
  const colorScheme = useSelector(selectColorSchemePreference);
  const isLight = colorScheme === "light";
  const isArabic = isRtlLanguage(language);
  const surface = isLight ? colors.surface.light : colors.palette.ink[900];
  const text = isLight ? colors.text.primary.light : colors.text.primary.dark;
  const secondaryText = isLight ? colors.text.secondary.light : colors.text.secondary.dark;
  const border = isLight ? colors.border.light : colors.palette.ink[700];
  const mutedSurface = isLight ? colors.surfaceMuted.light : colors.palette.ink[800];
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [systemError, setSystemError] = useState<string | null>(null);
  const [ownerStatusLookup, setOwnerStatusLookup] = useState<{ deviceId?: string; requestToken?: string } | null>(null);
  const [ownerStatusDismissed, setOwnerStatusDismissed] = useState(false);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  const [passwordSetupVisible, setPasswordSetupVisible] = useState(false);
  const submitInFlightRef = useRef(false);
  
  const [login, { isLoading: isSigningIn }] = useLoginMutation();
  const [forgotPassword, { isLoading: isRequestingReset }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  const { data: ownerStatus, refetch: refetchOwnerStatus } = useGetOwnerRegistrationStatusQuery(
    ownerStatusLookup?.deviceId || ownerStatusLookup?.requestToken ? ownerStatusLookup : skipToken,
  );
  const passwordSetupSchema = React.useMemo(() => z.object({
    password: z.string().min(8, t("Auth.newPasswordTooShort", { defaultValue: "Password must be at least 8 characters." })),
    confirmPassword: z.string().min(1, t("Auth.confirmPasswordRequired", { defaultValue: "Confirm the password." })),
  }).superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: t("Auth.passwordMismatch", { defaultValue: "The two password fields do not match." }),
      });
    }
  }), [t]);
  const {
    control: passwordSetupControl,
    handleSubmit: submitPasswordSetupForm,
    reset: resetPasswordSetupForm,
    setError: setPasswordSetupError,
    clearErrors: clearPasswordSetupErrors,
    formState: { errors: passwordSetupErrors, isValid: passwordSetupIsValid },
  } = useForm<PasswordSetupForm>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
    resolver: zodResolver(passwordSetupSchema),
  });

  useEffect(() => {
    const hydrateOwnerStatus = async () => {
      const [device, request] = await Promise.all([
        Keychain.getGenericPassword({ service: ownerDeviceService }),
        Keychain.getGenericPassword({ service: ownerRequestService }),
      ]);

      if (device || request) {
        setOwnerStatusDismissed(false);
        setOwnerStatusLookup({
          deviceId: device ? device.password : undefined,
          requestToken: request ? request.password : undefined,
        });
      }
    };

    void hydrateOwnerStatus();
  }, []);

  // Preference hydration is now handled globally in useRestoreSession
  // to prevent race conditions and ensure consistent behavior across screens.

  const persistPreferences = useCallback(async (nextLanguage: "en" | "ar", nextColorScheme: "light" | "dark") => {
    await persistMobilePreferences(nextLanguage, nextColorScheme);
  }, []);

  const handleToggleLanguage = useCallback(() => {
    const nextLanguage = language === "en" ? "ar" : "en";
    applyNativeDirection(nextLanguage);
    dispatch(setLanguagePreference(nextLanguage));
    void i18n.changeLanguage(nextLanguage);
    void persistPreferences(nextLanguage, colorScheme);
  }, [colorScheme, dispatch, i18n, language, persistPreferences]);

  const handleToggleTheme = useCallback(() => {
    const nextColorScheme = colorScheme === "dark" ? "light" : "dark";
    dispatch(setColorSchemePreference(nextColorScheme));
    void persistPreferences(language, nextColorScheme);
  }, [colorScheme, dispatch, language, persistPreferences]);

  const clearOwnerRegistrationPrompt = useCallback(async () => {
    setOwnerStatusLookup(null);
    setOwnerStatusDismissed(true);
    setPasswordResetToken(null);
    setPasswordSetupVisible(false);
    resetPasswordSetupForm();
    clearPasswordSetupErrors();
    await Promise.allSettled([
      Keychain.resetGenericPassword({ service: ownerDeviceService }),
      Keychain.resetGenericPassword({ service: ownerRequestService }),
    ]);
  }, [clearPasswordSetupErrors, resetPasswordSetupForm]);

  const submitLogin = useCallback(async (nextEmail: string, nextPassword: string) => {
    if (submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setErrorMap({});
    setSystemError(null);

    // Basic frontend validation
    if (!nextEmail.trim() || !nextPassword) {
      submitInFlightRef.current = false;
      return;
    }

    try {
      const result = await login({
        email: nextEmail.trim().toLowerCase(),
        password: nextPassword,
      }).unwrap();

      // Dispatch to Redux
      dispatch(setCredentials({ user: result.user, token: result.token }));

      try {
        await Keychain.setGenericPassword(result.user.email, result.token, {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          service: authTokenService,
        });
      } catch (storageError) {
        console.warn("Auth token persistence failed; keeping in-memory session active", storageError);
      }

      await clearOwnerRegistrationPrompt();
      
    } catch (err: any) {
      console.error("Login failed", err);

      if (err.status === 422) {
        // Validation errors (Laravel format)
        if (err.data?.errors) {
          const mapped: Record<string, string> = {};
          Object.keys(err.data.errors).forEach(key => {
            mapped[key] = err.data.errors[key][0];
          });
          setErrorMap(mapped);
        } else {
          setSystemError(err.data?.message || t("Auth.invalidCredentials"));
        }
      } else if (err.status === 429) {
        setSystemError(t("Auth.tooManyAttempts", { defaultValue: "Too many sign-in attempts. Please wait a few seconds and try again." }));
      } else if (err.status === 403) {
        setSystemError(t("Auth.accountBlocked", { defaultValue: "Your account is not active." }));
      } else if (err.status === 'FETCH_ERROR') {
        setSystemError(t("Common.networkError", { defaultValue: "Could not connect to the server. Please check your internet." }));
      } else {
        setSystemError(t("Auth.loginFailed", { defaultValue: "An unexpected error occurred. Please try again." }));
      }
    } finally {
      submitInFlightRef.current = false;
    }
  }, [clearOwnerRegistrationPrompt, dispatch, login, t]);

  const handleLogin = useCallback(async () => {
    await submitLogin(email, password);
  }, [email, password, submitLogin]);

  const handlePersonaFill = useCallback((personaEmail: string) => {
    setEmail(personaEmail);
    setPassword(uatPersonaPassword);
    setErrorMap({});
    setSystemError(null);
  }, []);

  const handleContactAdmin = useCallback(() => {
    navigation.navigate("OwnerRegistration");
  }, [navigation]);

  const handleRefreshOwnerStatus = useCallback(() => {
    if (ownerStatus?.status === "approved" && ownerStatus.login?.email) {
      setEmail(ownerStatus.login.email);
      if (ownerStatus.login.passwordSetupToken) {
        setPasswordResetToken(ownerStatus.login.passwordSetupToken);
        resetPasswordSetupForm();
        clearPasswordSetupErrors();
        setPasswordSetupVisible(true);
        setSystemError(null);
      }
    }

    if (ownerStatusLookup) {
      void refetchOwnerStatus();
    } else {
      navigation.navigate("OwnerRegistration");
    }
  }, [clearPasswordSetupErrors, navigation, ownerStatus, ownerStatusLookup, refetchOwnerStatus, resetPasswordSetupForm]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      setSystemError(t("Auth.enterEmailFirst", { defaultValue: "Enter your email first, then tap Forgot Password." }));
      return;
    }

    try {
      const result = await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      if (result.resetToken) {
        setPasswordResetToken(result.resetToken);
        resetPasswordSetupForm();
        clearPasswordSetupErrors();
        setPasswordSetupVisible(true);
        setSystemError(null);
      } else {
        setSystemError(result.message || t("Auth.resetIfExists", { defaultValue: "If this email exists, reset instructions are available." }));
      }
    } catch {
      setSystemError(t("Auth.resetStartFailed", { defaultValue: "Could not start password reset. Please try again." }));
    }
  }, [clearPasswordSetupErrors, email, forgotPassword, resetPasswordSetupForm, t]);

  const handleResetPassword = useCallback(async (values: PasswordSetupForm) => {
    if (!email.trim()) {
      setPasswordSetupError("root", {
        type: "manual",
        message: t("Auth.enterEmailFirst", { defaultValue: "Enter your email first, then tap Forgot Password." }),
      });
      return;
    }

    if (!passwordResetToken) {
      setPasswordSetupError("root", {
        type: "manual",
        message: t("Auth.passwordResetFailed", { defaultValue: "Password reset failed or expired. Request a new reset token." }),
      });
      return;
    }

    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        token: passwordResetToken,
        password: values.password,
        password_confirmation: values.confirmPassword,
      }).unwrap();
      setPassword(values.password);
      resetPasswordSetupForm();
      setPasswordResetToken(null);
      setPasswordSetupVisible(false);
      await clearOwnerRegistrationPrompt();
      setSystemError(t("Auth.passwordResetDone", { defaultValue: "Password reset. You can sign in now." }));
    } catch {
      setPasswordSetupError("root", {
        type: "server",
        message: t("Auth.passwordResetFailed", { defaultValue: "Password reset failed or expired. Request a new reset token." }),
      });
    }
  }, [clearOwnerRegistrationPrompt, email, passwordResetToken, resetPassword, resetPasswordSetupForm, setPasswordSetupError, t]);

  const ownerStatusLoginEmail = ownerStatus?.login?.email ?? ownerStatus?.email;
  const ownerStatusEmailMatchesForm = Boolean(
    ownerStatusLoginEmail && email.trim().toLowerCase() === ownerStatusLoginEmail.toLowerCase(),
  );
  const isApprovedOwnerPromptResolved = ownerStatus?.status === "approved" && (password.length > 0 || ownerStatusEmailMatchesForm);
  const visibleOwnerStatus = ownerStatusLookup && !ownerStatusDismissed && !isApprovedOwnerPromptResolved ? ownerStatus : undefined;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: isLight ? colors.background.light : colors.background.dark }]}
    >
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />
      
      {/* Abstract Background Decoration */}
      <View style={[styles.backgroundContainer, { zIndex: -1 }]}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="grad" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#1E293B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Circle cx={SCREEN_WIDTH * 0.8} cy={SCREEN_HEIGHT * 0.1} r="200" fill={isLight ? "#DBEAFE" : "#312E81"} fillOpacity="0.3" />
          <Circle cx={SCREEN_WIDTH * 0.1} cy={SCREEN_HEIGHT * 0.9} r="300" fill={isLight ? "#CCFBF1" : "#1E1B4B"} fillOpacity="0.4" />
        </Svg>
      </View>

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.inner, appDirectionStyle(isArabic)]}>
              <View style={[styles.loginToggles, rowDirectionStyle(isArabic), { alignSelf: isArabic ? 'flex-start' : 'flex-end', backgroundColor: isLight ? colors.surface.light : 'rgba(255,255,255,0.06)', borderColor: border }]}>
                <Pressable
                  onPress={handleToggleLanguage}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={language === "en" ? t("Settings.switchToArabic") : t("Settings.switchToEnglish")}
                  accessibilityHint={t("Settings.languageHint")}
                  style={[styles.preferenceChip, { backgroundColor: mutedSurface, borderColor: border }]}
                >
                  <Typography style={[styles.preferenceText, { color: text }]}>
                    {language === "en" ? "العربية" : "English"}
                  </Typography>
                </Pressable>
                <Pressable
                  onPress={handleToggleTheme}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isLight ? t("Settings.switchToDark") : t("Settings.switchToLight")}
                  style={[styles.preferenceIconChip, { backgroundColor: mutedSurface, borderColor: border }]}
                >
                  <Icon name={isLight ? "moon" : "sun"} color={text} size={18} />
                </Pressable>
              </View>
              <View style={styles.header}>
                <View style={[styles.logoCircle, { backgroundColor: isLight ? colors.surface.light : 'rgba(255,255,255,0.06)', borderColor: border }]}>
                  <Icon name="building" color={isLight ? colors.primary.light : colors.primary.dark} size={34} />
                </View>
                <Typography variant="h1" style={[styles.brandTitle, { color: text }, centerTextDirectionStyle(isArabic)]}>
                  {t("App.brand", { defaultValue: "Compound" })}
                </Typography>
                <Typography variant="caption" style={[styles.brandSubtitle, { color: secondaryText }, centerTextDirectionStyle(isArabic)]}>
                  {t("App.subtitle", { defaultValue: "Smart Living Management" })}
                </Typography>
              </View>

              <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                <Typography variant="label" style={[styles.cardEyebrow, textDirectionStyle(isArabic)]}>
                  {t("Auth.landingEyebrow", { defaultValue: "Resident portal" })}
                </Typography>
                <Typography variant="h2" style={[styles.signInTitle, { color: text }, textDirectionStyle(isArabic)]}>
                  {t("Auth.signIn", { defaultValue: "Welcome Back" })}
                </Typography>
                <Typography variant="caption" style={[styles.instructions, { color: secondaryText }, textDirectionStyle(isArabic)]}>
                  {t("Auth.instructions", { defaultValue: "Please enter your credentials to continue" })}
                </Typography>

                {systemError && (
                  <View
                    style={styles.errorBanner}
                    testID="login-error-banner"
                    accessibilityRole="alert"
                  >
                    <Typography style={styles.errorBannerText}>{systemError}</Typography>
                  </View>
                )}

                <View style={styles.form}>
                  {__DEV__ && (
                    <View style={[styles.devPersonas, { borderTopColor: border }]}>
	                      <Typography variant="caption" style={[styles.devTitle, textDirectionStyle(isArabic)]}>
                          {t("Auth.devPersonas", { defaultValue: "Dev personas" })}
                        </Typography>
                        <Typography variant="caption" style={[styles.devHint, { color: secondaryText }, textDirectionStyle(isArabic)]}>
                          {t("Auth.devPersonasHint", { defaultValue: "Tap a persona to fill the form, then sign in once." })}
                        </Typography>
	                      <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.personaScroll}
                          contentContainerStyle={rowDirectionStyle(isArabic)}
                        >
                        <PersonaChip label={t("Auth.personaAdmin", "Admin")} accessibilityLabel={t("Auth.usePersona", { role: t("Auth.personaAdmin", "Admin") })} testID="login-persona-admin" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.admin)} />
                        <PersonaChip label={t("Auth.personaResident", "Resident")} accessibilityLabel={t("Auth.usePersona", { role: t("Auth.personaResident", "Resident") })} testID="login-persona-resident" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.resident)} />
                        <PersonaChip label={t("Auth.personaSecurity", "Security")} accessibilityLabel={t("Auth.usePersona", { role: t("Auth.personaSecurity", "Security") })} testID="login-persona-security" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.security)} />
                        <PersonaChip label={t("Auth.personaBoard", "Board")} accessibilityLabel={t("Auth.usePersona", { role: t("Auth.personaBoard", "Board") })} testID="login-persona-board" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.board)} />
                      </ScrollView>
                    </View>
                  )}

                  <Input
                    label={t("Auth.email", { defaultValue: "Email Address" })}
                    autoCapitalize="none"
                    autoComplete="email"
                    inputMode="email"
                    testID="login-email-input"
                    accessibilityLabel={t("Auth.email", { defaultValue: "Email Address" })}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (errorMap.email) {
                        const next = { ...errorMap };
                        delete next.email;
                        setErrorMap(next);
                      }
                    }}
                    placeholder={t("Auth.emailPlaceholder", { defaultValue: "name@example.com" })}
                    placeholderTextColor={colors.palette.ink[500]}
                    style={[styles.loginInput, isLight && styles.loginInputLight, isArabic && styles.loginInputRtl]}
                    value={email}
                    error={errorMap.email}
                  />

                  <Input
                    label={t("Auth.password", { defaultValue: "Password" })}
                    autoCapitalize="none"
                    testID="login-password-input"
                    accessibilityLabel={t("Auth.password", { defaultValue: "Password" })}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (errorMap.password) {
                        const next = { ...errorMap };
                        delete next.password;
                        setErrorMap(next);
                      }
                    }}
                    placeholder={t("Auth.passwordPlaceholder", { defaultValue: "••••••••" })}
                    placeholderTextColor={colors.palette.ink[500]}
                    style={[styles.loginInput, isLight && styles.loginInputLight, isArabic && styles.loginInputRtl]}
                    secureTextEntry
                    value={password}
                    error={errorMap.password}
                  />

                  <Button
                    title={t("Auth.signIn", { defaultValue: "Sign In" })}
                    onPress={handleLogin}
                    loading={isSigningIn}
                    disabled={!email.trim() || !password || password.length < 1}
                    testID="login-submit-button"
                    accessibilityLabel={t("Auth.signIn", { defaultValue: "Sign In" })}
                    style={styles.loginButton}
                  />

                  <Pressable style={styles.forgotBtn} onPress={handleForgotPassword} disabled={isRequestingReset}>
                    <Typography style={[styles.forgotText, { color: secondaryText }]}>
                      {isRequestingReset ? t("Auth.preparingReset", { defaultValue: "Preparing reset..." }) : t("Auth.forgotPassword", { defaultValue: "Forgot Password?" })}
                    </Typography>
                  </Pressable>
                </View>
              </View>

              {visibleOwnerStatus ? (
                <Pressable
                  onPress={handleRefreshOwnerStatus}
                  accessibilityRole="button"
                  style={[
                    styles.ownerStatusCard,
                    rowDirectionStyle(isArabic),
                    visibleOwnerStatus.status === "approved" ? styles.ownerStatusApproved : visibleOwnerStatus.status === "denied" ? styles.ownerStatusDenied : styles.ownerStatusPending,
                  ]}
                >
                  <View style={styles.ownerStatusIcon}>
                    <Icon
                      name={visibleOwnerStatus.status === "approved" ? "check" : visibleOwnerStatus.status === "denied" ? "x" : "documents"}
                      color={visibleOwnerStatus.status === "denied" ? '#FCA5A5' : '#FFFFFF'}
                      size={18}
                    />
                  </View>
                  <View style={styles.ownerStatusCopy}>
                    <Typography style={[styles.ownerStatusTitle, textDirectionStyle(isArabic)]}>
                      {visibleOwnerStatus.status === "approved"
                        ? t("Auth.ownerRequestApproved", { defaultValue: "Owner request approved" })
                        : visibleOwnerStatus.status === "denied"
                          ? t("Auth.ownerRequestDenied", { defaultValue: "Owner request denied" })
                          : t("Auth.ownerRequestReview", { defaultValue: "Owner request under review" })}
                    </Typography>
                    <Typography style={[styles.ownerStatusText, textDirectionStyle(isArabic)]}>
	                      {visibleOwnerStatus.status === "approved"
	                        ? t("Auth.ownerApprovedBody", { email: visibleOwnerStatus.login?.email ?? visibleOwnerStatus.email, defaultValue: `Login email: ${visibleOwnerStatus.login?.email ?? visibleOwnerStatus.email}. Tap this card to set your first password.` })
	                        : visibleOwnerStatus.status === "denied"
	                          ? visibleOwnerStatus.decisionReason ?? t("Auth.ownerDeniedBody", { defaultValue: "Open request status to see the admin reason." })
	                          : t("Auth.ownerReviewBody", { defaultValue: "Admin is reviewing your documents. Tap to refresh status." })}
                    </Typography>
                  </View>
                </Pressable>
              ) : null}

              <View style={[styles.footer, rowDirectionStyle(isArabic)]}>
                <Typography variant="caption" style={styles.footerText}>
                  {t("Auth.noAccount", { defaultValue: "Don't have an account?" })}
                </Typography>
                <Pressable onPress={handleContactAdmin} accessibilityRole="button">
                  <Typography style={styles.footerLink}>
                    {t("Auth.contactAdmin", { defaultValue: "Contact Admin" })}
                  </Typography>
                </Pressable>
              </View>
          </View>
        </ScrollView>
	      </View>
        <Modal
          visible={passwordSetupVisible && Boolean(passwordResetToken)}
          transparent
          animationType="slide"
          onRequestClose={() => setPasswordSetupVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setPasswordSetupVisible(false)}>
            <View
              style={[styles.passwordSheet, { backgroundColor: surface, borderColor: border }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.sheetHandle, { backgroundColor: border }]} />
              <Typography variant="h2" style={[styles.sheetTitle, { color: text }, textDirectionStyle(isArabic)]}>
                {t("Auth.passwordSetupTitle", { defaultValue: "Create your password" })}
              </Typography>
              <Typography style={[styles.sheetBody, { color: secondaryText }, textDirectionStyle(isArabic)]}>
                {t("Auth.passwordSetupBody", { defaultValue: "Use a strong password to activate this approved account. You will use it for future sign-ins." })}
              </Typography>
              <Controller
                control={passwordSetupControl}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(nextValue) => {
                      clearPasswordSetupErrors("root");
                      onChange(nextValue);
                    }}
                    secureTextEntry
                    label={t("Auth.newPassword", { defaultValue: "New password" })}
                    placeholder={t("Auth.newPasswordPlaceholder", { defaultValue: "At least 8 characters" })}
                    style={[styles.loginInput, isLight && styles.loginInputLight, isArabic && styles.loginInputRtl]}
                    error={passwordSetupErrors.password?.message}
                  />
                )}
              />
              <Controller
                control={passwordSetupControl}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(nextValue) => {
                      clearPasswordSetupErrors("root");
                      onChange(nextValue);
                    }}
                    secureTextEntry
                    label={t("Auth.confirmPassword", { defaultValue: "Confirm password" })}
                    placeholder={t("Auth.confirmPasswordPlaceholder", { defaultValue: "Repeat the password" })}
                    style={[styles.loginInput, isLight && styles.loginInputLight, isArabic && styles.loginInputRtl]}
                    error={passwordSetupErrors.confirmPassword?.message}
                  />
                )}
              />
              {passwordSetupErrors.root?.message ? (
                <Typography variant="error" style={[styles.sheetError, textDirectionStyle(isArabic)]}>
                  {passwordSetupErrors.root.message}
                </Typography>
              ) : null}
              <Typography variant="caption" style={[styles.passwordHint, { color: secondaryText }, textDirectionStyle(isArabic)]}>
                {t("Auth.passwordRequirement", { defaultValue: "Minimum 8 characters. Avoid using your unit code or phone number." })}
              </Typography>
              <Button
                title={t("Auth.setNewPassword", { defaultValue: "Set new password" })}
                onPress={submitPasswordSetupForm(handleResetPassword)}
                loading={isResettingPassword}
                disabled={!passwordSetupIsValid || isResettingPassword}
                style={styles.sheetButton}
              />
            </View>
          </Pressable>
        </Modal>
	    </KeyboardAvoidingView>
	  );
	};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
  },
  inner: {
    padding: spacing.xl,
    minHeight: SCREEN_HEIGHT,
    justifyContent: 'center',
    zIndex: 1,
  },
  loginToggles: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.lg,
  },
  preferenceChip: {
    minHeight: 44,
    minWidth: 74,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceIconChip: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceText: {
    fontSize: 12,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 2,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 32,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 3,
    ...shadows.lg,
  },
  cardEyebrow: {
    color: colors.primary.dark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  signInTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  instructions: {
    color: colors.palette.ink[500],
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    gap: 0,
  },
  loginButton: {
    marginTop: 10,
    height: 56,
    borderRadius: radii.lg,
  },
  loginInput: {
    color: '#FFFFFF',
    backgroundColor: colors.palette.ink[800],
    borderColor: colors.palette.blue[500],
    borderWidth: 1.5,
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
  },
  loginInputLight: {
    color: colors.palette.ink[950],
    backgroundColor: '#F8FAFC',
    borderColor: colors.palette.blue[500],
  },
  loginInputRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  forgotBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  passwordSheet: {
    borderTopStartRadius: 32,
    borderTopEndRadius: 32,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...shadows.lg,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    marginBottom: spacing.xs,
  },
  sheetBody: {
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  passwordHint: {
    lineHeight: 18,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  sheetError: {
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetButton: {
    minHeight: 56,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  footerText: {
    color: colors.palette.ink[500],
  },
  footerLink: {
    color: '#818CF8',
    fontWeight: '700',
  },
  ownerStatusCard: {
    marginTop: 18,
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
  },
  ownerStatusPending: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  ownerStatusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  ownerStatusDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  ownerStatusIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerStatusCopy: {
    flex: 1,
    gap: 4,
  },
  ownerStatusTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  ownerStatusText: {
    color: colors.palette.ink[300],
    fontSize: 12,
    lineHeight: 18,
  },
  devPersonas: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  devTitle: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  devHint: {
    color: colors.palette.ink[500],
    marginBottom: 12,
  },
  personaScroll: {
    flexDirection: 'row',
  }
});
