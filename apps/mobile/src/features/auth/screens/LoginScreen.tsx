import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import * as Keychain from "react-native-keychain";
import { useLoginMutation } from '../../../services/auth';
import { setCredentials } from '../../../store/authSlice';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { colors, spacing } from '../../../theme';

const authTokenService = "compound.mobile.authToken";

export const LoginScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [login, { isLoading: isSigningIn }] = useLoginMutation();

  const handleLogin = async () => {
    setAuthError(null);
    try {
      const result = await login({
        email: email.trim(),
        password,
      }).unwrap();

      dispatch(setCredentials({ user: result.user, token: result.token }));

      await Keychain.setGenericPassword(result.user.email, result.token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: authTokenService,
      });
      
    } catch (err: any) {
      setAuthError(err.data?.message || t("Auth.invalidCredentials"));
    }
  };

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.header}>
        <Typography variant="label">{t("App.brand")}</Typography>
        <Typography variant="h1" style={styles.title}>{t("App.title")}</Typography>
        <Typography variant="caption">{t("App.subtitle")}</Typography>
      </View>

      <View style={styles.panel}>
        <Typography variant="h2" style={styles.sectionTitle}>{t("Auth.signIn")}</Typography>
        <Typography variant="caption" style={styles.instructions}>{t("Auth.instructions")}</Typography>
        
        <View style={styles.form}>
          <Input
            label={t("Auth.email")}
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            onChangeText={setEmail}
            placeholder={t("Auth.emailPlaceholder")}
            value={email}
          />
          
          <Input
            label={t("Auth.password")}
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder={t("Auth.passwordPlaceholder")}
            secureTextEntry
            value={password}
            error={authError}
          />
          
          <Button
            title={t("Auth.signIn")}
            onPress={handleLogin}
            loading={isSigningIn}
            disabled={!email.trim() || !password}
            style={styles.loginButton}
          />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    marginVertical: spacing.xs,
    textAlign: 'center',
  },
  panel: {
    padding: spacing.xl,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  instructions: {
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.sm,
  }
});
