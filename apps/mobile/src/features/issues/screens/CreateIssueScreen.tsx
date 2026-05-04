import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, useColorScheme, Alert, TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateIssueMutation, useGetUnitsQuery } from '../../../services/property';
import { issueCategoryValues, issuePriorityValues, issueTargetRoleValues } from '@compound/contracts';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import {
  getAvailableIssueTargetRoles,
  getDefaultIssueTargetRole,
  getIssueSubmitBlockReason,
} from '../issue-flow-utils';

const CATEGORIES = issueCategoryValues;
const PRIORITIES = issuePriorityValues;
const TARGETS = issueTargetRoleValues;

const schema = z.object({
  targetRole: z.enum(TARGETS),
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
  const descriptionRef = useRef<TextInput>(null);
  const { data: units = [], isLoading: isLoadingUnits } = useGetUnitsQuery();
  const [createIssue, { isLoading }] = useCreateIssueMutation();
  const primaryUnit = units.find((unit) => unit.isPrimary) ?? units[0];
  const hasFloorScope = Boolean(primaryUnit?.unit?.floorId);
  const submitBlockReason = getIssueSubmitBlockReason({
    isLoadingUnits,
    hasPrimaryUnit: Boolean(primaryUnit?.unitId),
  });
  const availableTargetRoles = getAvailableIssueTargetRoles(hasFloorScope);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetRole: getDefaultIssueTargetRole(hasFloorScope),
      category: 'maintenance',
      priority: 'normal',
      title: '',
      description: '',
    },
  });
  const selectedTargetRole = watch('targetRole');

  useEffect(() => {
    const defaultTargetRole = getDefaultIssueTargetRole(hasFloorScope);

    if (!availableTargetRoles.includes(selectedTargetRole)) {
      setValue('targetRole', defaultTargetRole);
    }
  }, [availableTargetRoles, hasFloorScope, selectedTargetRole, setValue]);

  const onSubmit = async (data: FormData) => {
    if (submitBlockReason === 'loading') {
      Alert.alert(
        t('Common.loading', { defaultValue: 'Loading' }),
        t('Issues.loadingUnitContext', {
          defaultValue: 'We are still loading your apartment details. Please try again in a moment.',
        }),
      );
      return;
    }

    if (submitBlockReason === 'missing-unit') {
      Alert.alert(
        t('Issues.assignmentRequiredTitle', { defaultValue: 'Apartment assignment required' }),
        t('Issues.assignmentRequiredBody', {
          defaultValue: 'You need a verified apartment assignment before you can report an issue.',
        }),
      );
      return;
    }

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
  const submitDisabled = submitBlockReason !== null || isLoading;
  const submitLabel = submitBlockReason === 'loading'
    ? t('Issues.loadingUnitContextShort', { defaultValue: 'Loading apartment...' })
    : submitBlockReason === 'missing-unit'
      ? t('Issues.assignmentRequiredShort', { defaultValue: 'Apartment required' })
      : isLoading
        ? t('Common.loading')
        : t('Issues.submit', { defaultValue: 'Submit Issue' });
  const targetLabels: Record<(typeof TARGETS)[number], string> = {
    floor_representative: t('Issues.targetRoles.floor_representative', { defaultValue: 'Floor Rep' }),
    building_representative: t('Issues.targetRoles.building_representative', { defaultValue: 'Building Rep' }),
    president: t('Issues.targetRoles.president', { defaultValue: 'President' }),
    compound_admin: t('Issues.targetRoles.compound_admin', { defaultValue: 'Admin' }),
  };

  const renderChips = <T extends string>(
    fieldName: 'targetRole' | 'category' | 'priority',
    options: readonly T[],
    value: T,
    onChange: (v: T) => void,
  ) => (
    <View style={styles.chips}>
      {options.map((opt) => (
        <Button
          key={opt}
          title={fieldName === 'targetRole'
            ? targetLabels[opt as (typeof TARGETS)[number]]
            : t(`Issues.${fieldName}s.${opt}`, { defaultValue: opt })}
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t('Issues.routeToLabel', { defaultValue: 'Route complaint to' })}
        </Typography>
        <Controller
          control={control}
          name="targetRole"
          render={({ field: { value, onChange } }) =>
            renderChips(
              'targetRole',
              availableTargetRoles,
              value,
              onChange,
            )
          }
        />
        <Typography variant="caption" style={styles.helperText}>
          {submitBlockReason === 'loading'
            ? t('Issues.loadingUnitContext', {
                defaultValue: 'We are still loading your apartment details. Please try again in a moment.',
              })
            : submitBlockReason === 'missing-unit'
              ? t('Issues.assignmentRequiredBody', {
                  defaultValue: 'You need a verified apartment assignment before you can report an issue.',
                })
              : t('Issues.routeToHelp', {
                  defaultValue: 'Choose who should receive this complaint first. If that scope is unavailable, the system escalates it safely.',
                })}
        </Typography>

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
              returnKeyType="next"
              onSubmitEditing={() => descriptionRef.current?.focus()}
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
              ref={descriptionRef}
              style={[styles.textarea, {
                backgroundColor: surface,
                borderColor: errors.description ? '#ef4444' : border,
                color: text,
              }]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              blurOnSubmit
              returnKeyType="done"
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
          title={submitLabel}
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={submitDisabled}
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
  helperText: { color: '#64748B', marginTop: spacing.xs },
  submitBtn: { marginTop: spacing.xl, borderRadius: 12 },
});
