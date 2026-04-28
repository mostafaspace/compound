import React from 'react';
import {
  View, StyleSheet, ScrollView, useColorScheme, Alert, TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateIssueMutation, useGetUnitsQuery } from '../../../services/property';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';

const CATEGORIES = ['maintenance', 'security', 'cleaning', 'noise', 'other'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const schema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(255),
  description: z.string().min(10).max(5000),
  priority: z.enum(PRIORITIES),
});

type FormData = z.infer<typeof schema>;

export const CreateIssueScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();
  const { data: units = [] } = useGetUnitsQuery();
  const [createIssue, { isLoading }] = useCreateIssueMutation();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'maintenance', priority: 'normal', title: '', description: '' },
  });

  const onSubmit = async (data: FormData) => {
    const primaryUnit = units[0];
    try {
      await createIssue({
        ...data,
        unitId: primaryUnit?.unitId ?? undefined,
      }).unwrap();
      Alert.alert(
        t('Issues.submitSuccess', { defaultValue: 'Issue reported' }),
        t('Issues.submitSuccessMsg', { defaultValue: 'Your issue has been submitted for review.' }),
        [{ text: t('Common.done'), onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert(t('Common.error', { defaultValue: 'Error' }), t('Issues.submitError', { defaultValue: 'Failed to submit. Please try again.' }));
    }
  };

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;

  const renderChips = <T extends string>(
    fieldName: 'category' | 'priority',
    options: readonly T[],
    value: T,
    onChange: (v: T) => void,
  ) => (
    <View style={styles.chips}>
      {options.map((opt) => (
        <Button
          key={opt}
          title={t(`Issues.${fieldName}s.${opt}`, { defaultValue: opt })}
          variant={value === opt ? 'primary' : 'ghost'}
          onPress={() => onChange(opt)}
          style={styles.chip}
          textStyle={{ fontSize: 13 }}
        />
      ))}
    </View>
  );

  return (
    <ScreenContainer withKeyboard style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t('Issues.categoryLabel', { defaultValue: 'Category' })}
        </Typography>
        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => renderChips('category', CATEGORIES, value, onChange)}
        />

        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t('Issues.priorityLabel', { defaultValue: 'Priority' })}
        </Typography>
        <Controller
          control={control}
          name="priority"
          render={({ field: { value, onChange } }) => renderChips('priority', PRIORITIES, value, onChange)}
        />

        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t('Issues.titleLabel', { defaultValue: 'Title' })}
        </Typography>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, {
                backgroundColor: surface,
                borderColor: errors.title ? '#ef4444' : border,
                color: text,
              }]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('Issues.titlePlaceholder', { defaultValue: 'Brief issue title...' })}
              placeholderTextColor="#9ca3af"
            />
          )}
        />
        {errors.title && (
          <Typography variant="caption" style={styles.error}>{errors.title.message}</Typography>
        )}

        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t('Issues.descriptionLabel', { defaultValue: 'Description' })}
        </Typography>
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.textarea, {
                backgroundColor: surface,
                borderColor: errors.description ? '#ef4444' : border,
                color: text,
              }]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={5}
              placeholder={t('Issues.descriptionPlaceholder', { defaultValue: 'Describe the issue in detail...' })}
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          )}
        />
        {errors.description && (
          <Typography variant="caption" style={styles.error}>{errors.description.message}</Typography>
        )}

        <Button
          title={isLoading ? t('Common.loading') : t('Issues.submit', { defaultValue: 'Submit Issue' })}
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  label: { marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, height: 44, justifyContent: 'center' },
  textarea: { borderWidth: 1, borderRadius: 10, padding: spacing.md, minHeight: 120 },
  error: { color: '#ef4444', marginTop: spacing.xs },
  submitBtn: { marginTop: spacing.xl, borderRadius: 12 },
});
