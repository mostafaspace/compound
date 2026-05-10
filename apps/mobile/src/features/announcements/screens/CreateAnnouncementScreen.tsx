import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Switch, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, layout, spacing, radii } from '../../../theme';
import { useCreateAnnouncementMutation, usePreviewAnnouncementRecipientsMutation } from '../../../services/property';
import { useGetBuildingsQuery } from '../../../services/admin';
import { selectCurrentUser } from '../../../store/authSlice';

export const CreateAnnouncementScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useSelector(selectCurrentUser);
  const [createAnnouncement, { isLoading: isCreating }] = useCreateAnnouncementMutation();
  const [previewRecipients, { data: previewData, isLoading: isPreviewing }] = usePreviewAnnouncementRecipientsMutation();
  
  const { data: buildings, isLoading: isLoadingBuildings } = useGetBuildingsQuery(user?.compoundId || '', {
    skip: !user?.compoundId
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [mustAcknowledge, setMustAcknowledge] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'building'>('all');
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);

  // Update preview whenever targeting changes
  useEffect(() => {
    const triggerPreview = async () => {
      try {
        await previewRecipients({
          targetType,
          targetIds: targetType === 'building' ? selectedBuildings : undefined,
        }).unwrap();
      } catch (err) {
        console.error('Preview failed', err);
      }
    };
    
    const timeoutId = setTimeout(triggerPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [targetType, selectedBuildings, previewRecipients]);

  const toggleBuilding = (id: string) => {
    if (selectedBuildings.includes(id)) {
      setSelectedBuildings(selectedBuildings.filter(b => b !== id));
    } else {
      setSelectedBuildings([...selectedBuildings, id]);
    }
  };

  const handleCreate = async () => {
    if (!title || !content) {
      Alert.alert(t('Common.error'), t('Announcements.fillRequired', 'Please fill in both title and content'));
      return;
    }

    if (targetType === 'building' && selectedBuildings.length === 0) {
      Alert.alert(t('Common.error'), t('Announcements.selectBuilding', 'Please select at least one building'));
      return;
    }

    try {
      await createAnnouncement({
        title,
        content,
        category,
        mustAcknowledge,
        targetType,
        targetIds: targetType === 'building' ? selectedBuildings : undefined,
      }).unwrap();
      Alert.alert(t('Common.success'), t('Announcements.created', 'Announcement created successfully'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('Common.error'), t('Announcements.createFailed', 'Failed to create announcement'));
    }
  };

  return (
    <ScreenContainer withKeyboard={true} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.title', 'Title')}</Typography>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('Announcements.titlePlaceholder', 'e.g. Maintenance Work')}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.category', 'Category')}</Typography>
            <View style={styles.chipRow}>
              {['general', 'maintenance', 'security', 'event'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    category === cat && styles.chipActive
                  ]}
                >
                  <Typography 
                    variant="caption" 
                    color={category === cat ? 'white' : 'primary'}
                    style={{ fontWeight: '700' }}
                  >
                    {cat.toUpperCase()}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.targeting', 'Targeting')}</Typography>
            <View style={styles.targetRow}>
              <TouchableOpacity
                onPress={() => setTargetType('all')}
                style={[styles.targetBtn, targetType === 'all' && styles.targetBtnActive]}
              >
                <Ionicons 
                  name="people-outline" 
                  size={20} 
                  color={targetType === 'all' ? 'white' : colors.primary.main} 
                />
                <Typography variant="caption" color={targetType === 'all' ? 'white' : 'primary'} style={styles.targetBtnLabel}>
                  {t('Announcements.targetAll', 'Entire Compound')}
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTargetType('building')}
                style={[styles.targetBtn, targetType === 'building' && styles.targetBtnActive]}
              >
                <Ionicons 
                  name="business-outline" 
                  size={20} 
                  color={targetType === 'building' ? 'white' : colors.primary.main} 
                />
                <Typography variant="caption" color={targetType === 'building' ? 'white' : 'primary'} style={styles.targetBtnLabel}>
                  {t('Announcements.targetBuilding', 'Specific Buildings')}
                </Typography>
              </TouchableOpacity>
            </View>

            {targetType === 'building' && (
              <View style={styles.buildingList}>
                {isLoadingBuildings ? (
                  <ActivityIndicator size="small" color={colors.primary.main} />
                ) : (
                  buildings?.map((building) => (
                    <TouchableOpacity
                      key={building.id}
                      onPress={() => toggleBuilding(building.id)}
                      style={[
                        styles.buildingItem,
                        selectedBuildings.includes(building.id) && styles.buildingItemActive
                      ]}
                    >
                      <Typography 
                        variant="caption" 
                        color={selectedBuildings.includes(building.id) ? 'white' : 'secondary'}
                      >
                        {building.name}
                      </Typography>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          <Card style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.text.secondary.light} />
              <Typography variant="body" color="secondary" style={styles.label}>
                {t('Announcements.targetType', 'Target Audience')}
              </Typography>
            </View>
            {isPreviewing ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : (
              <Typography variant="h2" color="primary">
                {previewData?.recipientCount ?? 0} <Typography variant="body">{t('Announcements.recipients', 'recipients')}</Typography>
              </Typography>
            )}
          </Card>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.content', 'Content')}</Typography>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder={t('Announcements.contentPlaceholder', 'Write your announcement here...')}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.switchGroup}>
            <View style={{ flex: 1 }}>
              <Typography variant="body" style={{ fontWeight: '600' }}>
                {t('Announcements.mustAcknowledge', 'Must Acknowledge')}
              </Typography>
              <Typography variant="caption" style={{ color: '#64748b' }}>
                {t('Announcements.ackDescription', 'Residents will see an "Acknowledge" button')}
              </Typography>
            </View>
            <Switch
              value={mustAcknowledge}
              onValueChange={setMustAcknowledge}
              trackColor={{ false: '#cbd5e1', true: colors.primary.light }}
              thumbColor="#fff"
            />
          </View>

          <Button
            title={t('Announcements.create', 'Create Announcement')}
            onPress={handleCreate}
            loading={isCreating}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: layout.screenBottom,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
  },
  textArea: {
    height: 120,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'white',
  },
  chipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  targetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  targetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'white',
  },
  targetBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  targetBtnLabel: {
    marginLeft: 6,
    fontWeight: '700',
  },
  buildingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#f1f5f9',
    borderRadius: radii.md,
  },
  buildingItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buildingItemActive: {
    backgroundColor: colors.secondary.main,
    borderColor: colors.secondary.main,
  },
  previewCard: {
    padding: spacing.md,
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    alignItems: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewLabel: {
    marginLeft: 6,
    color: '#0369a1',
    fontWeight: '600',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitBtn: {
    marginTop: spacing.md,
    height: 56,
    borderRadius: 16,
  },
});
