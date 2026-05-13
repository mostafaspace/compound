import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

const ELIGIBILITY_OPTIONS: PollEligibility[] = ['owners_only', 'owners_and_residents', 'all_verified'];

export const CreatePollScreen = () => {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
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

  const renderOption = ({ item: option, index }: { item: { label: string }; index: number }) => (
    <View style={[styles.optionRow, rowDirectionStyle(isRtl)]}>
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
          style={[styles.removeButton, isRtl ? { marginStart: 0, marginEnd: spacing.xs } : { marginStart: spacing.xs, marginEnd: 0 }]}
        >
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEligibility = ({ item: val }: { item: PollEligibility }) => (
    <TouchableOpacity
      onPress={() => setEligibility(val)}
      style={[
        styles.chip,
        eligibility === val && styles.chipActive
      ]}
    >
      <Typography
        variant="caption"
        color={eligibility === val ? 'white' : 'primary'}
        style={textDirectionStyle(isRtl)}
      >
        {t(`Polls.eligibility_${val}`, { defaultValue: val.replace('_', ' ') })}
      </Typography>
    </TouchableOpacity>
  );

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t('Common.error'), t('Polls.titleRequired'));
      return;
    }

    const validOptions = options.filter(o => o.label.trim() !== '');
    if (validOptions.length < 2) {
      Alert.alert(t('Common.error'), t('Polls.optionsRequired'));
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

      Alert.alert(t('Common.success'), t('Polls.created'), [
        { text: t('Common.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert(t('Common.error'), t('Polls.createFailed'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Typography variant="h2" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {t('Polls.basicInfo')}
        </Typography>
        
        <Card style={styles.card}>
          <Input
            label={t('Polls.title')}
            placeholder={t('Polls.titlePlaceholder')}
            value={title}
            onChangeText={setTitle}
          />
          <Input
            label={t('Polls.description')}
            placeholder={t('Polls.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={[styles.textArea, textDirectionStyle(isRtl)]}
          />
        </Card>

        <Typography variant="h2" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {t('Polls.options')}
        </Typography>

        <Card style={styles.card}>
          <FlatList
            data={options}
            keyExtractor={(_, index) => `poll-option-${index}`}
            renderItem={renderOption}
            scrollEnabled={false}
          />
          
          {options.length < 10 && (
            <Button 
              variant="outline" 
              onPress={addOption}
              title={t('Polls.addOption')}
              style={styles.addOptionButton}
            />
          )}
        </Card>

        <Typography variant="h2" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {t('Polls.settings')}
        </Typography>

        <Card style={styles.card}>
          <Typography variant="body" color="secondary" style={[styles.label, textDirectionStyle(isRtl)]}>
            {t('Polls.eligibility')}
          </Typography>
          <FlatList
            data={ELIGIBILITY_OPTIONS}
            keyExtractor={(val) => val}
            renderItem={renderEligibility}
            horizontal
            inverted={isRtl}
            scrollEnabled={false}
            contentContainerStyle={[styles.chipContainer, rowDirectionStyle(isRtl)]}
          />

          <View style={styles.divider} />

          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={[styles.datePickerToggle, rowDirectionStyle(isRtl)]}
          >
            <View style={textDirectionStyle(isRtl)}>
              <Typography variant="body" color="secondary" style={textDirectionStyle(isRtl)}>
                {t('Polls.endDate')}
              </Typography>
              <Typography variant="body" style={textDirectionStyle(isRtl)}>
                {endsAt.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')} {endsAt.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
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
          title={t('Polls.createPoll')}
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
    marginStart: spacing.xs,
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
    marginStart: spacing.xs,
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
