import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, layout, spacing } from '../../../theme';
import { selectCurrentUser } from '../../../store/authSlice';
import { 
  useGetBuildingsQuery, 
  useGetUnitsByBuildingQuery, 
  useCreateResidentInvitationMutation 
} from '../../../services/admin';

export const CreateInvitationScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();
  const user = useSelector(selectCurrentUser);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    buildingId: '',
    unitId: '',
    role: 'resident',
  });

  const { data: buildings = [], isLoading: loadingBuildings } = useGetBuildingsQuery(user?.compoundId || '');
  const { data: units = [], isLoading: loadingUnits } = useGetUnitsByBuildingQuery(formData.buildingId, {
    skip: !formData.buildingId,
  });
  const [createInvitation, { isLoading: isSubmitting }] = useCreateResidentInvitationMutation();

  const handleCreate = async () => {
    if (!formData.email || !formData.unitId || !formData.name) {
      Alert.alert(t('Common.error'), t('Admin.fillAllFields', 'Please fill all required fields'));
      return;
    }

    try {
      await createInvitation({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        unitId: formData.unitId,
        role: formData.role,
      }).unwrap();
      
      Alert.alert(
        t('Common.success'), 
        t('Admin.invitationSent', 'Invitation sent successfully'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(t('Common.error'), t('Admin.invitationFailed', 'Failed to send invitation'));
    }
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Typography variant="h2" style={styles.title}>
          {t('Admin.newInvitation', 'New Resident Invitation')}
        </Typography>
        
        <View style={styles.section}>
          <Input
            label={t('Admin.residentName', 'Resident Full Name')}
            placeholder="John Doe"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          
          <Input
            label={t('Admin.email', 'Email Address')}
            placeholder="john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
          />

          <Input
            label={t('Admin.phone', 'Phone Number (Optional)')}
            placeholder="+201..."
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="caption" style={styles.label}>
            {t('Admin.building', 'Select Building')}
          </Typography>
          <View style={styles.pickerContainer}>
            {loadingBuildings ? (
              <ActivityIndicator color={colors.primary.light} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {buildings.map((building: any) => (
                  <TouchableOpacity
                    key={building.id}
                    onPress={() => setFormData({ ...formData, buildingId: building.id, unitId: '' })}
                    style={[
                      styles.chip,
                      formData.buildingId === building.id && styles.activeChip,
                      { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }
                    ]}
                  >
                    <Typography variant="caption" style={formData.buildingId === building.id ? styles.activeChipText : {}}>
                      {building.name}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {formData.buildingId ? (
            <>
              <Typography variant="caption" style={[styles.label, { marginTop: spacing.md }]}>
                {t('Admin.unit', 'Select Unit')}
              </Typography>
              <View style={styles.pickerContainer}>
                {loadingUnits ? (
                  <ActivityIndicator color={colors.primary.light} />
                ) : (
                  <View style={styles.unitsGrid}>
                    {units.map((unit: any) => (
                      <TouchableOpacity
                        key={unit.id}
                        onPress={() => setFormData({ ...formData, unitId: unit.id })}
                        style={[
                          styles.unitChip,
                          formData.unitId === unit.id && styles.activeChip,
                          { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }
                        ]}
                      >
                        <Typography variant="caption" style={formData.unitId === unit.id ? styles.activeChipText : {}}>
                          {unit.unitNumber}
                        </Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Typography variant="caption" style={styles.label}>
            {t('Admin.role', 'Account Role')}
          </Typography>
          <View
            style={[
              styles.roleOption,
              styles.lockedRole,
              { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }
            ]}
          >
            <Typography variant="body" style={styles.lockedRoleText}>
              {t('Roles.resident', 'Resident')}
            </Typography>
          </View>
          <Typography variant="caption" style={styles.helperText}>
            {t('Admin.defaultResidentHelp', 'All new users start as residents. Admin roles are assigned later after verification.')}
          </Typography>
        </View>

        <Button
          title={t('Admin.sendInvitation', 'Send Invitation')}
          onPress={handleCreate}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
  },
  title: {
    marginBottom: layout.sectionGap,
  },
  section: {
    marginBottom: layout.sectionGap,
  },
  label: {
    marginBottom: spacing.sm,
    color: colors.text.secondary.light,
    fontWeight: '600',
  },
  pickerContainer: {
    minHeight: 50,
    justifyContent: 'center',
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginEnd: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  unitChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    minWidth: 70,
    alignItems: 'center',
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activeChip: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.light,
  },
  activeChipText: {
    color: '#FFF',
    fontWeight: '700',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleOption: {
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  activeRole: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.light,
  },
  lockedRole: {
    justifyContent: 'center',
  },
  lockedRoleText: {
    fontWeight: '700',
  },
  helperText: {
    marginTop: spacing.sm,
    color: colors.text.secondary.light,
  },
  submitButton: {
    marginTop: spacing.lg,
    height: 56,
    borderRadius: 28,
  },
});
