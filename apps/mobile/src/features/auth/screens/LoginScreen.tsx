import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Pressable,
  ScrollView,
  TouchableOpacity
} from 'react-native';

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
      borderRadius: 12,
      backgroundColor: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <Typography style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>{label}</Typography>
  </TouchableOpacity>
);
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import * as Keychain from "react-native-keychain";
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useLoginMutation } from '../../../services/auth';
import { setCredentials } from '../../../store/authSlice';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing, shadows } from '../../../theme';
import { uatPersonaEmails, uatPersonaPassword } from '../login-personas';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const authTokenService = "compound.mobile.authToken";

export const LoginScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [systemError, setSystemError] = useState<string | null>(null);
  const submitInFlightRef = useRef(false);
  
  const [login, { isLoading: isSigningIn }] = useLoginMutation();

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Abstract Background Decoration */}
      <View style={[styles.backgroundContainer, { zIndex: -1 }]}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="grad" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#1E293B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Circle cx={SCREEN_WIDTH * 0.8} cy={SCREEN_HEIGHT * 0.1} r="200" fill="#312E81" fillOpacity="0.3" />
          <Circle cx={SCREEN_WIDTH * 0.1} cy={SCREEN_HEIGHT * 0.9} r="300" fill="#1E1B4B" fillOpacity="0.4" />
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
          <View style={styles.inner}>
              <View style={styles.header}>
                <View style={styles.logoCircle}>
                  <Typography style={styles.logoEmoji}>🏢</Typography>
                </View>
                <Typography variant="h1" style={[styles.brandTitle, { color: '#FFFFFF' }]}>
                  {t("App.brand", { defaultValue: "Compound" })}
                </Typography>
                <Typography variant="caption" style={[styles.brandSubtitle, { color: '#94A3B8' }]}>
                  {t("App.subtitle", { defaultValue: "Smart Living Management" })}
                </Typography>
              </View>

              <View style={styles.card}>
                <Typography variant="h2" style={[styles.signInTitle, { color: '#FFFFFF' }]}>
                  {t("Auth.signIn", { defaultValue: "Welcome Back" })}
                </Typography>
                <Typography variant="caption" style={[styles.instructions, { color: '#64748B' }]}>
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
                    placeholderTextColor="#64748B"
                    style={{
                      color: '#FFFFFF',
                      backgroundColor: '#1E293B',
                      borderColor: '#3B82F6',
                      borderWidth: 1.5,
                      height: 56,
                      paddingHorizontal: 20,
                      borderRadius: 16,
                    }}
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
                    placeholderTextColor="#64748B"
                    style={{
                      color: '#FFFFFF',
                      backgroundColor: '#1E293B',
                      borderColor: '#3B82F6',
                      borderWidth: 1.5,
                      height: 56,
                      paddingHorizontal: 20,
                      borderRadius: 16,
                    }}
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

                  <Pressable style={styles.forgotBtn}>
                    <Typography style={styles.forgotText}>
                      {t("Auth.forgotPassword", { defaultValue: "Forgot Password?" })}
                    </Typography>
                  </Pressable>
                </View>
              </View>

              <View style={styles.footer}>
                <Typography variant="caption" style={styles.footerText}>
                  {t("Auth.noAccount", { defaultValue: "Don't have an account?" })}
                </Typography>
                <Pressable>
                  <Typography style={styles.footerLink}>
                    {t("Auth.contactAdmin", { defaultValue: "Contact Admin" })}
                  </Typography>
                </Pressable>
              </View>
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
  logoEmoji: {
    fontSize: 40,
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
    color: '#64748B',
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
    borderRadius: 18,
    backgroundColor: '#4F46E5',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    gap: 8,
  },
  footerText: {
    color: '#64748B',
  },
  footerLink: {
    color: '#818CF8',
    fontWeight: '700',
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
    color: '#64748B',
    marginBottom: 12,
  },
  personaScroll: {
    flexDirection: 'row',
  }
});
