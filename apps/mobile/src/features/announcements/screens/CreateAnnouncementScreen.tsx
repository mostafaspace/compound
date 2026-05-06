import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Switch, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { colors, layout, spacing } from '../../../theme';
import { useCreateAnnouncementMutation } from '../../../services/property';

export const CreateAnnouncementScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [createAnnouncement, { isLoading }] = useCreateAnnouncementMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [mustAcknowledge, setMustAcknowledge] = useState(false);

  const handleCreate = async () => {
    if (!title || !content) {
      Alert.alert(t('Common.error'), t('Announcements.fillRequired', 'Please fill in both title and content'));
      return;
    }

    try {
      await createAnnouncement({
        title,
        content,
        category,
        mustAcknowledge,
      }).unwrap();
      Alert.alert(t('Common.success'), t('Announcements.created', 'Announcement created successfully'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('Common.error'), t('Announcements.createFailed', 'Failed to create announcement'));
    }
  };

  return (
    <ScreenContainer withKeyboard={true}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <Typography variant="h2" style={styles.header}>
            {t('Announcements.createNew', 'Create Announcement')}
          </Typography>
          
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
            <View style={styles.categoryRow}>
              {['general', 'maintenance', 'security', 'event'].map((cat) => (
                <Button
                  key={cat}
                  title={cat.toUpperCase()}
                  variant={category === cat ? 'primary' : 'ghost'}
                  onPress={() => setCategory(cat)}
                  style={styles.categoryBtn}
                  textStyle={{ fontSize: 10 }}
                />
              ))}
            </View>
          </View>

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
            title={t('Announcements.publishNow', 'Publish Now')}
            onPress={handleCreate}
            loading={isLoading}
            variant="primary"
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: layout.screenBottom,
  },
  header: {
    marginBottom: layout.sectionGap,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
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
