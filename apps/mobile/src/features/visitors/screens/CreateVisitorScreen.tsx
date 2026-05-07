import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  useColorScheme, 
  Image, 
  TouchableOpacity, 
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useSelector } from 'react-redux';
import { getEffectiveRoleType } from '@compound/contracts';

import { RootStackParamList } from '../../../navigation/types';
import { useCreateVisitorMutation, useGetUnitsQuery } from '../../../services/property';
import { useGetBuildingsQuery, useGetUnitsByBuildingQuery } from '../../../services/admin';
import { selectCurrentUser } from '../../../store/authSlice';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, layout, spacing } from '../../../theme';
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

const { width } = Dimensions.get('window');

const visitorSchema = z.object({
  visitorName: z.string().min(2, "Name is required (min 2 chars)"),
  visitorPhone: z.string().optional(),
  vehiclePlate: z.string().optional(),
  numberOfVisitors: z.string().regex(/^\d+$/, "Must be a number").transform(Number).pipe(z.number().min(1).max(50)),
  notes: z.string().optional(),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

export const CreateVisitorScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';

  const [createVisitor, { isLoading: isCreating }] = useCreateVisitorMutation();
  const { data: units, isLoading: isUnitsLoading } = useGetUnitsQuery();
  
  const { data: buildings } = useGetBuildingsQuery(user?.compoundId || '', { skip: !isAdmin });
  const { data: fallbackUnits } = useGetUnitsByBuildingQuery(buildings?.[0]?.id || '', { skip: !isAdmin || !buildings?.[0] });

  const [photo, setPhoto] = useState<any>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema) as any,
    defaultValues: {
      visitorName: '',
      visitorPhone: '',
      vehiclePlate: '',
      numberOfVisitors: '1' as any,
      notes: '',
    }
  });

  const handlePickImage = () => {
    Alert.alert(
      t("Visitors.photoSource", "Visitor Photo"),
      t("Visitors.photoSourceDesc", "Choose how to add a photo of the visitor"),
      [
        {
          text: t("Common.camera", "Camera"),
          onPress: () => launchCamera({ mediaType: 'photo', quality: 0.7 }, (res) => {
            if (res.assets && res.assets[0]) setPhoto(res.assets[0]);
          }),
        },
        {
          text: t("Common.gallery", "Gallery"),
          onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (res) => {
            if (res.assets && res.assets[0]) setPhoto(res.assets[0]);
          }),
        },
        { text: t("Common.cancel", "Cancel"), style: 'cancel' }
      ]
    );
  };

  const onSubmit = async (data: VisitorFormData) => {
    const unitId = units?.[0]?.unitId || fallbackUnits?.[0]?.id;

    if (!unitId) {
      Alert.alert(
        "Error", 
        "No unit found to associate this visitor with. Please contact management."
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append('unitId', String(unitId));
      formData.append('visitorName', data.visitorName);
      if (data.visitorPhone) formData.append('visitorPhone', data.visitorPhone);
      if (data.vehiclePlate) formData.append('vehiclePlate', data.vehiclePlate);
      formData.append('numberOfVisitors', data.numberOfVisitors.toString());
      if (data.notes) formData.append('notes', data.notes);
      
      formData.append('visitStartsAt', new Date().toISOString());
      formData.append('visitEndsAt', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (photo) {
        formData.append('picture', {
          uri: photo.uri,
          type: photo.type,
          name: photo.fileName || 'visitor.jpg',
        } as any);
      }

      const result = await createVisitor(formData).unwrap();
      
      navigation.navigate('ShareVisitorPass', { visitorId: result.id });
    } catch (err) {
      console.error("Failed to create visitor", err);
      Alert.alert("Error", "Could not create visitor request. Please try again.");
    }
  };

  return (
    <ScreenContainer withKeyboard={true} edges={['left', 'right', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
          <Typography variant="label" style={[styles.cardHeader, textDirectionStyle(isRtl)]}>
            {t("Visitors.visitorDetails", "Visitor Information")}
          </Typography>
          
          <Controller
            control={control}
            name="visitorName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("Visitors.name", "Full Name")}
                placeholder={t("Visitors.namePlaceholder", "Enter name...")}
                value={value}
                onChangeText={onChange}
                error={errors.visitorName?.message}
                containerStyle={styles.inputContainer}
              />
            )}
          />

          <Controller
            control={control}
            name="visitorPhone"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("Visitors.phone", "Phone Number")}
                placeholder="+20 123 456 7890"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                error={errors.visitorPhone?.message}
                containerStyle={styles.inputContainer}
              />
            )}
          />

          <View style={[styles.row, rowDirectionStyle(isRtl)]}>
            <View style={{ flex: 1.5, marginEnd: spacing.md }}>
              <Controller
                control={control}
                name="vehiclePlate"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("Visitors.vehiclePlate", "Vehicle Plate")}
                    placeholder="ABC 123"
                    value={value}
                    onChangeText={onChange}
                    error={errors.vehiclePlate?.message}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="numberOfVisitors"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("Visitors.guests", "Guests")}
                    keyboardType="number-pad"
                    value={value?.toString()}
                    onChangeText={onChange}
                    error={errors.numberOfVisitors?.message}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
          <Typography variant="label" style={[styles.cardHeader, textDirectionStyle(isRtl)]}>
            {t("Visitors.photo", "Visitor Photo (Optional)")}
          </Typography>
          
          <TouchableOpacity 
            style={[
              styles.photoPicker, 
              { 
                backgroundColor: isDark ? '#1a202c' : '#f8fafc',
                borderColor: isDark ? colors.border.dark : colors.border.light,
              }
            ]} 
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <View style={styles.iconCircle}>
                  <Icon name="camera" color={colors.primary.light} size={24} />
                </View>
                <Typography variant="body" style={[{ fontWeight: '600', color: colors.primary.light }, textDirectionStyle(isRtl)]}>
                  {t("Visitors.addPhoto", "Capture or Upload")}
                </Typography>
                <Typography variant="caption" style={styles.photoHint}>
                  {t("Visitors.photoHint", "Helps security identify your guest faster")}
                </Typography>
              </View>
            )}
          </TouchableOpacity>
          {photo && (
            <TouchableOpacity onPress={() => setPhoto(null)} style={styles.removePhoto}>
              <Typography variant="caption" style={{ color: colors.error, fontWeight: '600' }}>
                {t("Common.remove", "Change Photo")}
              </Typography>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("Visitors.notes", "Security Notes")}
                placeholder={t("Visitors.notesPlaceholder", "Any special instructions...")}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
                value={value}
                onChangeText={onChange}
                error={errors.notes?.message}
              />
            )}
          />
        </View>

        <View style={styles.footer}>
          <Button 
            title={t("Common.saveAndShare", "Generate & Share QR Pass")}
            onPress={handleSubmit(onSubmit)}
            loading={isCreating}
            style={styles.mainButton}
          />
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.cancelLink}
          >
            <Typography variant="body" style={styles.cancelText}>
              {t("Common.cancel", "Cancel")}
            </Typography>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: layout.screenTop,
    paddingBottom: layout.screenBottom,
  },
  header: {
    marginBottom: layout.sectionGap,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    letterSpacing: -0.8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subtitle: {
    color: colors.text.secondary.light,
    fontSize: 14,
  },
  card: {
    borderRadius: 24,
    padding: layout.cardPadding,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  cardHeader: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  photoPicker: {
    height: 180,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photoHint: {
    textAlign: 'center',
    color: colors.text.secondary.light,
    marginTop: 4,
    fontSize: 12,
  },
  removePhoto: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  mainButton: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.cta.light,
  },
  cancelLink: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  cancelText: {
    color: colors.text.secondary.light,
    fontWeight: '600',
  },
});
