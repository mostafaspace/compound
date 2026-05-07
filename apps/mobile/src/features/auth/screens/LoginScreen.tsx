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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { skipToken } from '@reduxjs/toolkit/query';
import * as Keychain from "react-native-keychain";
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
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
import { appDirectionStyle, applyNativeDirection, centerTextDirectionStyle, isRtlLanguage, textDirectionStyle } from '../../../i18n/direction';
import { mobilePreferencesService, persistMobilePreferences } from '../../../i18n/preferences';

const PersonaChip = ({
  label,
  onSelect,
  testID,
  disabled,
}: {
  label: string,
  onSelect: () => void;
  testID: string;
  disabled?: boolean;
}) => (
  <TouchableOpacity 
    onPress={onSelect}
    disabled={disabled}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={`Use ${label} UAT persona`}
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

export const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const language = useSelector(selectLanguagePreference);
  const colorScheme = useSelector(selectColorSchemePreference);
  const isLight = colorScheme === "light";
  const isArabic = isRtlLanguage(language);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [systemError, setSystemError] = useState<string | null>(null);
  const [ownerStatusLookup, setOwnerStatusLookup] = useState<{ deviceId?: string; requestToken?: string } | null>(null);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const submitInFlightRef = useRef(false);
  
  const [login, { isLoading: isSigningIn }] = useLoginMutation();
  const [forgotPassword, { isLoading: isRequestingReset }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  const { data: ownerStatus, refetch: refetchOwnerStatus } = useGetOwnerRegistrationStatusQuery(
    ownerStatusLookup?.deviceId || ownerStatusLookup?.requestToken ? ownerStatusLookup : skipToken,
  );

  useEffect(() => {
    const hydrateOwnerStatus = async () => {
      const [device, request] = await Promise.all([
        Keychain.getGenericPassword({ service: ownerDeviceService }),
        Keychain.getGenericPassword({ service: ownerRequestService }),
      ]);

      if (device || request) {
        setOwnerStatusLookup({
          deviceId: device ? device.password : undefined,
          requestToken: request ? request.password : undefined,
        });
      }
    };

    void hydrateOwnerStatus();
  }, []);

  useEffect(() => {
    const hydratePreferences = async () => {
      const stored = await Keychain.getGenericPassword({ service: mobilePreferencesService });
      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored.password) as { language?: "en" | "ar"; colorScheme?: "light" | "dark" };
        if (parsed.language === "en" || parsed.language === "ar") {
          applyNativeDirection(parsed.language);
          dispatch(setLanguagePreference(parsed.language));
          void i18n.changeLanguage(parsed.language);
        }

        if (parsed.colorScheme === "light" || parsed.colorScheme === "dark") {
          dispatch(setColorSchemePreference(parsed.colorScheme));
        }
      } catch {
        await Keychain.resetGenericPassword({ service: mobilePreferencesService });
      }
    };

    void hydratePreferences();
  }, [dispatch, i18n]);

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
  }, [dispatch, login, t]);

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
        setSystemError("Owner request approved. Enter a new password below to activate your login.");
      }
    }

    if (ownerStatusLookup) {
      void refetchOwnerStatus();
    } else {
      navigation.navigate("OwnerRegistration");
    }
  }, [navigation, ownerStatus, ownerStatusLookup, refetchOwnerStatus]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      setSystemError("Enter your email first, then tap Forgot Password.");
      return;
    }

    try {
      const result = await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      if (result.resetToken) {
        setPasswordResetToken(result.resetToken);
        setSystemError("Reset token ready. Enter a new password below.");
      } else {
        setSystemError(result.message || "If this email exists, reset instructions are available.");
      }
    } catch {
      setSystemError("Could not start password reset. Please try again.");
    }
  }, [email, forgotPassword]);

  const handleResetPassword = useCallback(async () => {
    if (!email.trim() || !passwordResetToken || newPassword.length < 8) {
      setSystemError("Enter your email and a new password with at least 8 characters.");
      return;
    }

    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        token: passwordResetToken,
        password: newPassword,
        password_confirmation: newPassword,
      }).unwrap();
      setPassword(newPassword);
      setNewPassword("");
      setPasswordResetToken(null);
      setSystemError("Password reset. You can sign in now.");
    } catch {
      setSystemError("Password reset failed or expired. Request a new reset token.");
    }
  }, [email, newPassword, passwordResetToken, resetPassword]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: isLight ? '#F8FAFC' : '#020617' }]}
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
              <View style={[styles.loginToggles, isArabic && styles.loginTogglesRtl]}>
                <Pressable
                  onPress={handleToggleLanguage}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={language === "en" ? "Switch to Arabic layout" : "Switch to English layout"}
                  accessibilityHint="Changes text language and screen direction"
                  style={[styles.preferenceChip, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)', borderColor: isLight ? '#DDE6E2' : 'rgba(255,255,255,0.12)' }]}
                >
                  <Typography style={[styles.preferenceText, { color: isLight ? colors.palette.ink[800] : colors.palette.ink[100] }]}>
                    {language === "en" ? "AR" : "EN"}
                  </Typography>
                </Pressable>
                <Pressable
                  onPress={handleToggleTheme}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isLight ? "Switch to dark mode" : "Switch to light mode"}
                  style={[styles.preferenceChip, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)', borderColor: isLight ? '#DDE6E2' : 'rgba(255,255,255,0.12)' }]}
                >
                  <Typography style={[styles.preferenceText, { color: isLight ? colors.palette.ink[800] : colors.palette.ink[100] }]}>
                    {isLight ? "Dark" : "Light"}
                  </Typography>
                </Pressable>
              </View>
              <View style={styles.header}>
                <View style={styles.logoCircle}>
                  <Icon name="building" color={isLight ? colors.palette.ink[800] : colors.palette.ink[50]} size={38} />
                </View>
                <Typography variant="h1" style={[styles.brandTitle, { color: isLight ? colors.palette.ink[950] : '#FFFFFF' }, centerTextDirectionStyle(isArabic)]}>
                  {t("App.brand", { defaultValue: "Compound" })}
                </Typography>
                <Typography variant="caption" style={[styles.brandSubtitle, { color: isLight ? colors.palette.ink[600] : '#94A3B8' }, centerTextDirectionStyle(isArabic)]}>
                  {t("App.subtitle", { defaultValue: "Smart Living Management" })}
                </Typography>
              </View>

              <View style={[styles.card, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(30, 41, 59, 0.7)', borderColor: isLight ? '#DDE6E2' : 'rgba(255,255,255,0.1)' }]}>
                <Typography variant="h2" style={[styles.signInTitle, { color: isLight ? colors.palette.ink[950] : '#FFFFFF' }, textDirectionStyle(isArabic)]}>
                  {t("Auth.signIn", { defaultValue: "Welcome Back" })}
                </Typography>
                <Typography variant="caption" style={[styles.instructions, { color: isLight ? colors.palette.ink[600] : colors.palette.ink[500] }, textDirectionStyle(isArabic)]}>
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
                    <View style={styles.devPersonas}>
	                      <Typography variant="caption" style={styles.devTitle}>DEV PERSONAS</Typography>
                        <Typography variant="caption" style={styles.devHint}>
                          Tap a persona to fill the form, then sign in once.
                        </Typography>
	                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.personaScroll}>
                        <PersonaChip label="Admin" testID="login-persona-admin" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.admin)} />
                        <PersonaChip label="Resident" testID="login-persona-resident" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.resident)} />
                        <PersonaChip label="Security" testID="login-persona-security" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.security)} />
                        <PersonaChip label="Board" testID="login-persona-board" disabled={isSigningIn} onSelect={() => handlePersonaFill(uatPersonaEmails.board)} />
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

                  {passwordResetToken ? (
                    <View style={styles.resetPanel}>
                      <Input
                        label="New password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholder="At least 8 characters"
                        style={[styles.loginInput, isLight && styles.loginInputLight, isArabic && styles.loginInputRtl]}
                      />
                      <Button
                        title="Set new password"
                        onPress={handleResetPassword}
                        loading={isResettingPassword}
                        disabled={newPassword.length < 8 || isResettingPassword}
                        variant="secondary"
                      />
                    </View>
                  ) : null}

                  <Pressable style={styles.forgotBtn} onPress={handleForgotPassword} disabled={isRequestingReset}>
                    <Typography style={styles.forgotText}>
                      {isRequestingReset ? "Preparing reset..." : t("Auth.forgotPassword", { defaultValue: "Forgot Password?" })}
                    </Typography>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.footer, isArabic && styles.rowReverse]}>
                <Typography variant="caption" style={styles.footerText}>
                  {t("Auth.noAccount", { defaultValue: "Don't have an account?" })}
                </Typography>
                <Pressable onPress={handleContactAdmin} accessibilityRole="button">
                  <Typography style={styles.footerLink}>
                    {t("Auth.contactAdmin", { defaultValue: "Contact Admin" })}
                  </Typography>
                </Pressable>
              </View>

              {ownerStatus ? (
                <Pressable
                  onPress={handleRefreshOwnerStatus}
                  accessibilityRole="button"
                  style={[
                    styles.ownerStatusCard,
                    isArabic && styles.rowReverse,
                    ownerStatus.status === "approved" ? styles.ownerStatusApproved : ownerStatus.status === "denied" ? styles.ownerStatusDenied : styles.ownerStatusPending,
                  ]}
                >
                  <View style={styles.ownerStatusIcon}>
                    <Icon
                      name={ownerStatus.status === "approved" ? "check" : ownerStatus.status === "denied" ? "x" : "documents"}
                      color={ownerStatus.status === "denied" ? '#FCA5A5' : '#FFFFFF'}
                      size={18}
                    />
                  </View>
                  <View style={styles.ownerStatusCopy}>
                    <Typography style={[styles.ownerStatusTitle, textDirectionStyle(isArabic)]}>
                      {ownerStatus.status === "approved"
                        ? "Owner request approved"
                        : ownerStatus.status === "denied"
                          ? "Owner request denied"
                          : "Owner request under review"}
                    </Typography>
                    <Typography style={[styles.ownerStatusText, textDirectionStyle(isArabic)]}>
                      {ownerStatus.status === "approved"
                        ? `Login email: ${ownerStatus.login?.email ?? ownerStatus.email}. Tap this card to fill it, then use Forgot Password to set your first password.`
                        : ownerStatus.status === "denied"
                          ? ownerStatus.decisionReason ?? "Open request status to see the admin reason."
                          : "Admin is reviewing your documents. Tap to refresh status."}
                    </Typography>
                  </View>
                </Pressable>
              ) : null}
          </View>
        </ScrollView>
      </View>
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
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.lg,
  },
  loginTogglesRtl: {
    alignSelf: 'flex-start',
    flexDirection: 'row-reverse',
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
  resetPanel: {
    marginTop: 16,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
