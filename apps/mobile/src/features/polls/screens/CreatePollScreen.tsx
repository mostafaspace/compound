import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Typography } from '../../../components/ui/Typography';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, spacing } from '../../../theme';
import { useCreatePollMutation } from '../../../services/polls';
import { selectCurrentUser } from '../../../store/authSlice';
import { PollScope, PollEligibility } from '@compound/contracts';

export const CreatePollScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useSelector(selectCurrentUser);
  const [createPoll, { isLoading }] = useCreatePollMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<PollScope>('compound');
  const [eligibility, setEligibility] = useState<PollEligibility>('owners_and_residents');
  const [options, setOptions] = useState([{ label: '' }, { label: '' }]);
  const [endsAt, setEndsAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { label: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, label: string) => {
    const newOptions = [...options];
    newOptions[index].label = label;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t('Common.error'), t('Polls.titleRequired', 'Title is required'));
      return;
    }

    const validOptions = options.filter(o => o.label.trim() !== '');
    if (validOptions.length < 2) {
      Alert.alert(t('Common.error'), t('Polls.optionsRequired', 'At least 2 options are required'));
      return;
    }

    try {
      await createPoll({
        title,
        description,
        scope,
        eligibility,
        options: validOptions,
        endsAt: endsAt.toISOString(),
        compoundId: user?.compoundId || '',
      }).unwrap();

      Alert.alert(t('Common.success'), t('Polls.created', 'Poll created successfully'), [
        { text: t('Common.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert(t('Common.error'), t('Polls.createFailed', 'Failed to create poll'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Polls.basicInfo', 'Basic Information')}
        </Typography>
        
        <Card style={styles.card}>
          <Input
            label={t('Polls.title', 'Poll Title')}
            placeholder={t('Polls.titlePlaceholder', 'e.g., Annual Compound Meeting Date')}
            value={title}
            onChangeText={setTitle}
          />
          <Input
            label={t('Polls.description', 'Description (Optional)')}
            placeholder={t('Polls.descriptionPlaceholder', 'Provide details about this poll...')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </Card>

        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Polls.options', 'Poll Options')}
        </Typography>

        <Card style={styles.card}>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <View style={styles.optionInputWrapper}>
                <Input
                  placeholder={t('Polls.optionN', { n: index + 1, defaultValue: `Option ${index + 1}` })}
                  value={option.label}
                  onChangeText={(text) => updateOption(index, text)}
                />
              </View>
              {options.length > 2 && (
                <TouchableOpacity 
                  onPress={() => removeOption(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={24} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {options.length < 10 && (
            <Button 
              variant="outline" 
              onPress={addOption}
              title={t('Polls.addOption', 'Add Option')}
              style={styles.addOptionButton}
            />
          )}
        </Card>

        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Polls.settings', 'Targeting & Settings')}
        </Typography>

        <Card style={styles.card}>
          <Typography variant="body" color="secondary" style={styles.label}>
            {t('Polls.eligibility', 'Who can vote?')}
          </Typography>
          <View style={styles.chipContainer}>
            {(['owners_only', 'owners_and_residents', 'all_verified'] as PollEligibility[]).map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setEligibility(val)}
                style={[
                  styles.chip,
                  eligibility === val && styles.chipActive
                ]}
              >
                <Typography 
                  variant="caption" 
                  color={eligibility === val ? 'white' : 'primary'}
                >
                  {t(`Polls.eligibility_${val}`, val.replace('_', ' '))}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={styles.datePickerToggle}
          >
            <View>
              <Typography variant="body" color="secondary">
                {t('Polls.endDate', 'Closing Date')}
              </Typography>
              <Typography variant="body">
                {endsAt.toLocaleDateString()} {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </View>
            <Ionicons name="calendar-outline" size={24} color={colors.primary.main} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={endsAt}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setEndsAt(date);
              }}
              minimumDate={new Date()}
            />
          )}
        </Card>

        <Button
          variant="primary"
          onPress={handleCreate}
          loading={isLoading}
          title={t('Polls.createPoll', 'Create Poll')}
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    padding: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  optionInputWrapper: {
    flex: 1,
  },
  removeButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  addOptionButton: {
    marginTop: spacing.sm,
    borderStyle: 'dashed',
  },
  label: {
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.primary.main,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
  datePickerToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
});
