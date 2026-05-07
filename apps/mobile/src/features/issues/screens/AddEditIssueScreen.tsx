import React, { useRef, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, useColorScheme, Alert, TextInput, TouchableOpacity, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from 'react-native-image-picker';
import { issueCategoryValues, issuePriorityValues, issueTargetRoleValues } from '@compound/contracts';
import { colors, layout, radii, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { RootStackParamList } from '../../../navigation/types';
import { useAddEditIssue, MAX_ATTACHMENTS } from '../hooks/useAddEditIssue';
import { defaultApiBaseUrl } from '../../../services/api';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../../../store/authSlice';
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

const CATEGORIES = issueCategoryValues;
const PRIORITIES = issuePriorityValues;
const TARGETS = issueTargetRoleValues;

const IMAGE_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  quality: 0.7 as const,
  maxWidth: 1920,
  maxHeight: 1920,
  selectionLimit: 1,
};

const schema = z.object({
  targetRole: z.enum(TARGETS),
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(255),
  description: z.string().min(2).max(5000),
  priority: z.enum(PRIORITIES),
});

type FormData = z.infer<typeof schema>;

export const AddEditIssueScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const route = useRoute<RouteProp<RootStackParamList, 'AddEditIssue'>>();
  const { issue } = route.params || {};

  const token = useSelector(selectCurrentToken);
  const {
    isEdit,
    isLoading,
    submitBlockReason,
    availableTargetRoles,
    initialValues,
    handleSave,
    existingAttachments,
    newAttachments,
    addNewAttachment,
    removeExistingAttachment,
    removeNewAttachment,
    canAddMore,
    totalCount,
  } = useAddEditIssue(issue);

  const descriptionRef = useRef<TextInput>(null);

  const localizedSchema = useMemo(() => z.object({
    targetRole: z.enum(TARGETS),
    category: z.enum(CATEGORIES),
    title: z.string().min(3, { message: t('Issues.errors.titleMin', 'Title must be at least 3 characters') }).max(255),
    description: z.string().min(2, { message: t('Issues.errors.descMin', 'Description must be at least 2 characters') }).max(5000),
    priority: z.enum(PRIORITIES),
  }), [t]);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(localizedSchema),
    defaultValues: initialValues,
  });

  const selectedTargetRole = watch('targetRole');

  useEffect(() => {
    if (!availableTargetRoles.includes(selectedTargetRole)) {
      if (!isEdit) {
        setValue('targetRole', availableTargetRoles[0] || 'compound_admin');
      }
    }
  }, [availableTargetRoles, selectedTargetRole, setValue, isEdit]);

  const remainingSlots = MAX_ATTACHMENTS - totalCount;

  const handlePickerResult = (result: ImagePickerResponse) => {
    if (!result.assets || result.assets.length === 0) return;
    const allowed = result.assets.slice(0, remainingSlots);
    for (const asset of allowed) {
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) continue;
      addNewAttachment(asset);
    }
  };

  const showAttachmentOptions = () => {
    if (!canAddMore) {
      Alert.alert(
        t('Common.error'),
        t('Issues.maxAttachments', { defaultValue: `Maximum ${MAX_ATTACHMENTS} attachments allowed`, count: MAX_ATTACHMENTS })
      );
      return;
    }

    Alert.alert(
      t('Issues.addAttachment', { defaultValue: 'Add Attachment' }),
      undefined,
      [
        {
          text: t('Issues.takePhoto', { defaultValue: 'Take Photo' }),
          onPress: async () => {
            try {
              const result = await launchCamera(IMAGE_PICKER_OPTIONS);
              handlePickerResult(result);
            } catch (err) {
              console.log('Camera error', err);
            }
          },
        },
        {
          text: t('Issues.chooseFromLibrary', { defaultValue: 'Choose from Library' }),
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                ...IMAGE_PICKER_OPTIONS,
                selectionLimit: remainingSlots,
              });
              handlePickerResult(result);
            } catch (err) {
              console.log('Library error', err);
            }
          },
        },
        { text: t('Common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      ]
    );
  };

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;

  const submitDisabled = (!isEdit && submitBlockReason !== null) || isLoading;
  const submitLabel = isLoading
    ? t('Common.loading')
    : t(isEdit ? 'Common.save' : 'Issues.submit', { defaultValue: isEdit ? 'Save Changes' : 'Submit Issue' });

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
    <View style={[styles.chips, rowDirectionStyle(isRtl)]}>
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
    <ScreenContainer withKeyboard style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        {!isEdit && (
          <>
            <Typography variant="label" style={[styles.label, { color: text, marginTop: 0 }, textDirectionStyle(isRtl)]}>
              {t('Issues.routeToLabel', { defaultValue: 'Route complaint to' })}
            </Typography>
            <Controller
              control={control}
              name="targetRole"
              render={({ field: { value, onChange } }) =>
                renderChips('targetRole', availableTargetRoles, value, onChange)
              }
            />
            <Typography variant="caption" style={[styles.helperText, textDirectionStyle(isRtl)]}>
              {submitBlockReason === 'loading'
                ? t('Issues.loadingUnitContext')
                : submitBlockReason === 'missing-unit'
                  ? t('Issues.assignmentRequiredBody')
                  : t('Issues.routeToHelp')}
            </Typography>
          </>
        )}

        <Typography variant="label" style={[styles.label, { color: text, marginTop: isEdit ? 0 : spacing.sm }, textDirectionStyle(isRtl)]}>
          {t('Issues.categoryLabel', { defaultValue: 'Category' })}
        </Typography>
        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => renderChips('category', CATEGORIES, value, onChange)}
        />

        <Typography variant="label" style={[styles.label, { color: text }, textDirectionStyle(isRtl)]}>
          {t('Issues.priorityLabel', { defaultValue: 'Priority' })}
        </Typography>
        <Controller
          control={control}
          name="priority"
          render={({ field: { value, onChange } }) => renderChips('priority', PRIORITIES, value, onChange)}
        />

        <Typography variant="label" style={[styles.label, { color: text }, textDirectionStyle(isRtl)]}>
          {t('Issues.titleLabel', { defaultValue: 'Title' })}
        </Typography>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, {
                backgroundColor: surface,
                borderColor: errors.title ? colors.error : border,
                color: text,
              }, textDirectionStyle(isRtl)]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              onSubmitEditing={() => descriptionRef.current?.focus()}
              placeholder={t('Issues.titlePlaceholder')}
              placeholderTextColor={colors.text.secondary.light}
            />
          )}
        />
        {errors.title && (
          <Typography variant="caption" style={[styles.error, textDirectionStyle(isRtl)]}>{errors.title.message}</Typography>
        )}

        <Typography variant="label" style={[styles.label, { color: text }, textDirectionStyle(isRtl)]}>
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
                borderColor: errors.description ? colors.error : border,
                color: text,
              }, textDirectionStyle(isRtl)]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              blurOnSubmit
              returnKeyType="done"
              numberOfLines={5}
              placeholder={t('Issues.descriptionPlaceholder')}
              placeholderTextColor={colors.text.secondary.light}
              textAlignVertical="top"
            />
          )}
        />
        {errors.description && (
          <Typography variant="caption" style={[styles.error, textDirectionStyle(isRtl)]}>{errors.description.message}</Typography>
        )}

        <View style={[styles.attachmentHeader, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={[styles.label, { color: text, marginTop: 0, marginBottom: 0 }, textDirectionStyle(isRtl)]}>
            {t('Issues.attachmentLabel', { defaultValue: 'Attachments (Optional)' })}
          </Typography>
          <Typography variant="caption" style={styles.helperText}>
            {totalCount}/{MAX_ATTACHMENTS}
          </Typography>
        </View>

        {(existingAttachments.length > 0 || newAttachments.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
            {existingAttachments.map((att: any) => (
              <View key={att.id} style={styles.attachmentPreviewContainer}>
                {att.mimeType?.startsWith('image/') ? (
                  <Image
                    source={{
                      uri: att.url.startsWith('http') ? att.url : `${defaultApiBaseUrl}${att.url}`,
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    }}
                    style={styles.attachmentPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.attachmentPreview, styles.attachmentFallback]}>
                    <Icon name="issues" color={colors.primary.light} size={24} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeAttachmentBtn}
                  onPress={() => removeExistingAttachment(att.id)}
                >
                  <Typography style={styles.removeAttachmentText}>✕</Typography>
                </TouchableOpacity>
              </View>
            ))}
            {newAttachments.map((att: any, index: number) => (
              <View key={`new-${index}`} style={styles.attachmentPreviewContainer}>
                <Image
                  source={{ uri: att.uri }}
                  style={styles.attachmentPreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeAttachmentBtn}
                  onPress={() => removeNewAttachment(index)}
                >
                  <Typography style={styles.removeAttachmentText}>✕</Typography>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {canAddMore && (
          <TouchableOpacity
            style={[styles.attachBtn, rowDirectionStyle(isRtl), { borderColor: border, backgroundColor: surface }]}
            onPress={showAttachmentOptions}
          >
            <Icon name="plus" color={colors.primary.light} size={18} />
            <Typography style={styles.attachBtnText}>{t('Issues.addAttachment')}</Typography>
          </TouchableOpacity>
        )}

        <Button
          title={submitLabel}
          onPress={handleSubmit(handleSave)}
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
  scroll: { padding: layout.screenGutter, paddingBottom: layout.screenBottom },
  label: { marginBottom: 2, marginTop: spacing.sm, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: 'center' },
  textarea: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, minHeight: 120 },
  error: { color: colors.error, marginTop: 2 },
  helperText: { color: colors.text.secondary.light, marginTop: 2 },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  attachBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attachBtnText: {
    color: colors.primary.light,
    fontWeight: '600',
  },
  attachmentPreviewContainer: {
    marginEnd: spacing.sm,
    paddingTop: 6,
    paddingEnd: 6,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  attachmentPreview: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted.light,
  },
  attachmentFallback: {
    backgroundColor: colors.surfaceMuted.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: 0,
    end: 0,
    backgroundColor: colors.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  submitBtn: { marginTop: spacing.md, borderRadius: radii.md },
});
