import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  useColorScheme,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useGetPendingVisitorRequestsQuery, useValidatePassMutation, usePerformVisitorActionMutation } from '../../../services/security';
import { logout as logoutAction } from '../../../store/authSlice';
import * as Keychain from "react-native-keychain";
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate } from '../../../utils/formatters';

const authTokenService = "compound.mobile.authToken";

export const GateScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isDark = useColorScheme() === 'dark';
  
  const [token, setToken] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  const { data: visitors = [], isLoading: isLoadingVisitors, refetch } = useGetPendingVisitorRequestsQuery();
  const [validatePass, { isLoading: isValidating }] = useValidatePassMutation();
  const [performAction, { isLoading: isPerforming }] = usePerformVisitorActionMutation();

  const handleValidate = async () => {
    if (!token.trim()) return;
    setSecurityMessage(null);
    try {
      const result = await validatePass(token.trim()).unwrap();
      setSecurityMessage(`${t("Security.result")}: ${result.result}`);
    } catch (err: any) {
      setSecurityMessage(err.data?.message || t("Security.invalidToken"));
    }
  };

  const handleSignOut = async () => {
    await Keychain.resetGenericPassword({ service: authTokenService });
    dispatch(logoutAction());
  };

  const renderVisitorItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <Typography variant="h3">{item.visitorName}</Typography>
      <Typography variant="caption" style={styles.visitTime}>{formatDate(item.visitStartsAt)}</Typography>
      <View style={styles.actionRow}>
        <Button 
          title={t("Security.allow")} 
          onPress={() => performAction({ id: item.id, action: 'allow' })}
          style={styles.actionBtn}
        />
        <Button 
          variant="outline"
          title={t("Security.deny")} 
          onPress={() => performAction({ id: item.id, action: 'deny' })}
          style={[styles.actionBtn, { borderColor: colors.error }]}
          textStyle={{ color: colors.error }}
        />
      </View>
    </View>
  );

  return (
    <ScreenContainer withKeyboard style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h1">{t("Security.title")}</Typography>
        <Button variant="ghost" title={t("Auth.signOut")} onPress={handleSignOut} />
      </View>

      <View style={styles.validationSection}>
        <Input
          label={t("Security.tokenLabel")}
          onChangeText={setToken}
          placeholder={t("Security.tokenPlaceholder")}
          value={token}
          containerStyle={styles.inputContainer}
        />
        <Button title={t("Security.validate")} onPress={handleValidate} loading={isValidating} />
        {securityMessage && <Typography variant="body" style={styles.message}>{securityMessage}</Typography>}
      </View>

      <View style={styles.listSection}>
        <Typography variant="h2" style={styles.subTitle}>{t("Security.subtitle")}</Typography>
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={renderVisitorItem}
          refreshing={isLoadingVisitors}
          onRefresh={refetch}
          ListEmptyComponent={<Typography variant="caption" style={styles.emptyText}>{t("Security.noVisitors")}</Typography>}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  validationSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.xs,
  },
  message: {
    fontWeight: '500',
    color: colors.primary.dark,
    marginTop: spacing.xs,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  subTitle: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  visitTime: {
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
  }
});
