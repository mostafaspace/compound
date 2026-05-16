import React, { useRef, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, useColorScheme, Alert, TextInput, TouchableOpacity, Image, FlatList, Pressable
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from 'react-native-image-picker';
import { issueCategoryValues, issuePriorityValues, issueTargetRoleValues } from '@compound/contracts';
import { colors, componentSize, layout, radii, shadows, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { Card } from '../../../components/ui/Card';
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
type AttachmentPreviewItem =
  | { kind: 'existing'; id: string | number; attachment: any }
  | { kind: 'new'; id: string; index: number; attachment: any };

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

  const { control, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(localizedSchema),
    defaultValues: initialValues,
    mode: 'onChange',
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
  const attachmentItems = useMemo<AttachmentPreviewItem[]>(() => {
    const items: AttachmentPreviewItem[] = [];
    for (const attachment of existingAttachments) {
      items.push({ kind: 'existing', id: attachment.id, attachment });
    }
    for (let index = 0; index < newAttachments.length; index += 1) {
      items.push({ kind: 'new', id: `new-${index}`, index, attachment: newAttachments[index] });
    }

    return items;
  }, [existingAttachments, newAttachments]);

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
        { text: t('Common.cancel'), style: 'cancel' },
      ]
    );
  };

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const surfaceMuted = isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light;
  const background = isDark ? colors.background.dark : colors.background.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const mutedText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const primary = isDark ? colors.primary.dark : colors.primary.light;

  const submitDisabled = (!isEdit && submitBlockReason !== null) || isLoading || !isValid;
  const submitLabel = isLoading
    ? t('Common.loading')
    : t(isEdit ? 'Common.save' : 'Issues.submit', { defaultValue: isEdit ? 'Save Changes' : 'Submit Issue' });

  const targetLabels: Record<(typeof TARGETS)[number], string> = {
    floor_representative: t('Issues.targetRoles.floor_representative'),
    building_representative: t('Issues.targetRoles.building_representative'),
    president: t('Issues.targetRoles.president'),
    compound_admin: t('Issues.targetRoles.compound_admin'),
  };

  const renderChips = <T extends string>(
    fieldName: 'targetRole' | 'category' | 'priority',
    options: readonly T[],
    value: T,
    onChange: (v: T) => void,
  ) => {
    const labelNamespace =
      fieldName === 'category'
        ? 'categories'
        : fieldName === 'priority'
          ? 'priorities'
          : 'targetRoles';

    return (
      <FlatList
        data={options}
        keyExtractor={(opt) => `${fieldName}-${opt}`}
        scrollEnabled={false}
        numColumns={2}
        contentContainerStyle={styles.optionGrid}
        columnWrapperStyle={[styles.optionRow, rowDirectionStyle(isRtl)]}
        renderItem={({ item: opt }) => {
          const isSelected = value === opt;
          const label = fieldName === 'targetRole'
            ? targetLabels[opt as (typeof TARGETS)[number]]
            : t(`Issues.${labelNamespace}.${opt}`, { defaultValue: opt });

          return (
            <View style={styles.optionCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChange(opt)}
                style={({ pressed }) => [
                  styles.optionChip,
                  rowDirectionStyle(isRtl),
                  {
                    backgroundColor: isSelected ? (isDark ? colors.palette.ink[900] : colors.palette.teal[50]) : surface,
                    borderColor: isSelected ? primary : border,
                  },
                  isSelected && styles.optionChipSelected,
                  pressed && styles.optionChipPressed,
                ]}
              >
                <View
                  style={[
                    styles.optionDot,
                    {
                      borderColor: isSelected ? primary : border,
                      backgroundColor: isSelected ? primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected ? <Icon name="check" size={12} color={colors.text.inverse} strokeWidth={3} /> : null}
                </View>
                <Typography
                  variant="bodyStrong"
                  numberOfLines={2}
                  style={[styles.optionLabel, { color: isSelected ? text : mutedText }, textDirectionStyle(isRtl)]}
                >
                  {label}
                </Typography>
              </Pressable>
            </View>
          );
        }}
      />
    );
  };

  const renderAttachmentPreview = ({ item }: { item: AttachmentPreviewItem }) => {
    if (item.kind === 'existing') {
      const att = item.attachment;

      return (
        <View style={styles.attachmentPreviewContainer}>
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
            accessibilityRole="button"
            accessibilityLabel={t('Common.remove', { defaultValue: 'Remove' })}
            style={styles.removeAttachmentBtn}
            onPress={() => removeExistingAttachment(att.id)}
          >
            <Icon name="x" color={colors.text.inverse} size={14} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.attachmentPreviewContainer}>
        <Image
          source={{ uri: item.attachment.uri }}
          style={styles.attachmentPreview}
          resizeMode="cover"
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Common.remove', { defaultValue: 'Remove' })}
          style={styles.removeAttachmentBtn}
          onPress={() => removeNewAttachment(item.index)}
        >
          <Icon name="x" color={colors.text.inverse} size={14} strokeWidth={3} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard style={[styles.container, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.hero,
          { backgroundColor: isDark ? colors.palette.ink[900] : colors.palette.teal[50], borderColor: isDark ? colors.palette.ink[700] : colors.palette.teal[100] },
        ]}>
          <View style={[styles.heroIcon, { backgroundColor: surface }]}>
            <Icon name="issues" size={24} color={primary} />
          </View>
          <Typography variant="label" style={[styles.heroEyebrow, { color: primary }, textDirectionStyle(isRtl)]}>
            {t('Issues.reportEyebrow', { defaultValue: isEdit ? 'Update request' : 'Support request' })}
          </Typography>
          <Typography variant="h2" style={[styles.heroTitle, { color: text }, textDirectionStyle(isRtl)]}>
            {t(isEdit ? 'Issues.editTitle' : 'Issues.reportTitle', { defaultValue: isEdit ? 'Update the issue' : 'Tell us what happened' })}
          </Typography>
          <Typography variant="caption" style={[styles.heroSubtitle, { color: mutedText }, textDirectionStyle(isRtl)]}>
            {t('Issues.reportSubtitle', {
              defaultValue: 'Pick the right team, add a clear summary, and attach photos when they help.',
            })}
          </Typography>
        </View>

        {!isEdit ? (
          <Card style={styles.sectionCard}>
            <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
              <View style={[styles.sectionIcon, { backgroundColor: surfaceMuted }]}>
                <Icon name="user" size={20} color={primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Typography variant="h3" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                  {t('Issues.routeTitle', { defaultValue: 'Who should handle it?' })}
                </Typography>
                <Typography variant="caption" style={[{ color: mutedText }, textDirectionStyle(isRtl)]}>
                  {submitBlockReason === 'loading'
                    ? t('Issues.loadingUnitContext')
                    : submitBlockReason === 'missing-unit'
                      ? t('Issues.assignmentRequiredBody')
                      : t('Issues.routeToHelp')}
                </Typography>
              </View>
            </View>
            <Controller
              control={control}
              name="targetRole"
              render={({ field: { value, onChange } }) =>
                renderChips('targetRole', availableTargetRoles, value, onChange)
              }
            />
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
            <View style={[styles.sectionIcon, { backgroundColor: surfaceMuted }]}>
              <Icon name="alert" size={20} color={primary} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Typography variant="h3" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                {t('Issues.detailsTitle', { defaultValue: 'Issue details' })}
              </Typography>
              <Typography variant="caption" style={[{ color: mutedText }, textDirectionStyle(isRtl)]}>
                {t('Issues.detailsDescription', { defaultValue: 'A precise report helps the right person act faster.' })}
              </Typography>
            </View>
          </View>

          <Typography variant="label" style={[styles.label, { color: primary }, textDirectionStyle(isRtl)]}>
            {t('Issues.categoryLabel')}
          </Typography>
          <Controller
            control={control}
            name="category"
            render={({ field: { value, onChange } }) => renderChips('category', CATEGORIES, value, onChange)}
          />

          <Typography variant="label" style={[styles.label, { color: primary }, textDirectionStyle(isRtl)]}>
            {t('Issues.priorityLabel')}
          </Typography>
          <Controller
            control={control}
            name="priority"
            render={({ field: { value, onChange } }) => renderChips('priority', PRIORITIES, value, onChange)}
          />

          <Typography variant="label" style={[styles.label, { color: primary }, textDirectionStyle(isRtl)]}>
            {t('Issues.titleLabel')}
          </Typography>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                accessibilityLabel={t('Issues.titleLabel')}
                style={[styles.input, {
                  backgroundColor: surfaceMuted,
                  borderColor: errors.title ? colors.error : border,
                  color: text,
                }, textDirectionStyle(isRtl)]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                returnKeyType="next"
                onSubmitEditing={() => descriptionRef.current?.focus()}
                placeholder={t('Issues.titlePlaceholder')}
                placeholderTextColor={mutedText}
              />
            )}
          />
          {errors.title ? (
            <Typography variant="error" style={[styles.error, textDirectionStyle(isRtl)]}>{errors.title.message}</Typography>
          ) : (
            <Typography variant="caption" style={[styles.helperText, { color: mutedText }, textDirectionStyle(isRtl)]}>
              {t('Issues.titleHelper', { defaultValue: 'Example: Water leak near the elevator' })}
            </Typography>
          )}

          <Typography variant="label" style={[styles.label, { color: primary }, textDirectionStyle(isRtl)]}>
            {t('Issues.descriptionLabel')}
          </Typography>
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                accessibilityLabel={t('Issues.descriptionLabel')}
                ref={descriptionRef}
                style={[styles.textarea, {
                  backgroundColor: surfaceMuted,
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
                placeholderTextColor={mutedText}
                textAlignVertical="top"
              />
            )}
          />
          {errors.description ? (
            <Typography variant="error" style={[styles.error, textDirectionStyle(isRtl)]}>{errors.description.message}</Typography>
          ) : (
            <Typography variant="caption" style={[styles.helperText, { color: mutedText }, textDirectionStyle(isRtl)]}>
              {t('Issues.descriptionHelper', { defaultValue: 'Include location, timing, and anything urgent.' })}
            </Typography>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={[styles.attachmentHeader, rowDirectionStyle(isRtl)]}>
            <View style={[styles.sectionHeaderText, styles.attachmentHeaderText]}>
              <Typography variant="h3" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                {t('Issues.attachmentsTitle', { defaultValue: 'Photos' })}
              </Typography>
              <Typography variant="caption" style={[{ color: mutedText }, textDirectionStyle(isRtl)]}>
                {t('Issues.attachmentsDescription', { defaultValue: 'Optional, but useful for maintenance and security cases.' })}
              </Typography>
            </View>
            <View style={[styles.counterPill, { backgroundColor: surfaceMuted }]}>
              <Typography variant="caption" style={{ color: mutedText }}>
                {totalCount}/{MAX_ATTACHMENTS}
              </Typography>
            </View>
          </View>

          {attachmentItems.length > 0 ? (
            <FlatList
              data={attachmentItems}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderAttachmentPreview}
              horizontal
              inverted={isRtl}
              showsHorizontalScrollIndicator={false}
              style={styles.attachmentList}
            />
          ) : (
            <View style={[styles.emptyAttachmentState, { backgroundColor: surfaceMuted, borderColor: border }]}>
              <Icon name="camera" color={mutedText} size={26} />
              <Typography variant="caption" style={[{ color: mutedText, textAlign: 'center' }, textDirectionStyle(isRtl)]}>
                {t('Issues.noAttachmentsYet', { defaultValue: 'No photos attached yet.' })}
              </Typography>
            </View>
          )}

          {canAddMore && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('Issues.addAttachment')}
              style={[styles.attachBtn, rowDirectionStyle(isRtl), { borderColor: border, backgroundColor: surfaceMuted }]}
              onPress={showAttachmentOptions}
            >
              <Icon name="plus" color={primary} size={18} />
              <Typography style={[styles.attachBtnText, { color: primary }]}>{t('Issues.addAttachment')}</Typography>
            </TouchableOpacity>
          )}
        </Card>

        {submitDisabled && !isLoading ? (
          <Typography variant="caption" style={[styles.submitHint, { color: mutedText }, textDirectionStyle(isRtl)]}>
            {submitBlockReason === 'missing-unit'
              ? t('Issues.assignmentRequiredBody')
              : t('Issues.submitDisabledHint', { defaultValue: 'Add the required details to submit this issue.' })}
          </Typography>
        ) : null}

        <Button
          title={submitLabel}
          onPress={handleSubmit(handleSave)}
          loading={isLoading}
          disabled={submitDisabled}
          style={styles.submitBtn}
          leftIcon="check"
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  scroll: { padding: layout.screenGutter, paddingBottom: layout.screenBottom + spacing.lg, gap: spacing.md },
  hero: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.ms,
  },
  heroEyebrow: { marginBottom: spacing.xs },
  heroTitle: { marginBottom: spacing.xs, maxWidth: 280 },
  heroSubtitle: { maxWidth: 300 },
  sectionCard: { padding: spacing.md },
  sectionHeader: {
    alignItems: 'center',
    gap: spacing.ms,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1, gap: spacing.xs },
  label: { marginBottom: spacing.sm, marginTop: spacing.md },
  optionGrid: { gap: spacing.sm },
  optionRow: { gap: spacing.sm },
  optionCell: { flex: 1 },
  optionChip: {
    minHeight: componentSize.touch + spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionChipSelected: { borderWidth: 1.5 },
  optionChipPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  optionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { flex: 1, flexShrink: 1, fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: componentSize.input,
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 144,
    fontSize: 16,
    fontWeight: '500',
  },
  error: { marginTop: spacing.xs },
  helperText: { marginTop: spacing.xs },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  attachmentHeaderText: { flexShrink: 1 },
  counterPill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    minHeight: componentSize.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attachBtnText: {
    fontWeight: '800',
  },
  emptyAttachmentState: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  attachmentList: {
    marginTop: -spacing.xs,
  },
  attachmentPreviewContainer: {
    marginEnd: spacing.sm,
    paddingTop: 6,
    paddingEnd: 6,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  attachmentPreview: {
    width: 112,
    height: 112,
    borderRadius: radii.lg,
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
  submitHint: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  submitBtn: { borderRadius: radii.lg },
});
