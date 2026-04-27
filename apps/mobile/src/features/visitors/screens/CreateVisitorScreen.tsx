import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  useColorScheme, 
  Image, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

import { RootStackParamList } from '../../../navigation/types';
import { useCreateVisitorMutation, useGetUnitsQuery } from '../../../services/property';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, spacing, shadows } from '../../../theme';

const visitorSchema = z.object({
  visitorName: z.string().min(2, "Name is required (min 2 chars)"),
  visitorPhone: z.string().optional(),
  vehiclePlate: z.string().optional(),
  numberOfVisitors: z.string().regex(/^\d+$/, "Must be a number").transform(Number).pipe(z.number().min(1).max(50)),
  notes: z.string().optional(),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

export const CreateVisitorScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [createVisitor, { isLoading: isCreating }] = useCreateVisitorMutation();
  const { data: units, error: unitsError, isLoading: isUnitsLoading } = useGetUnitsQuery();
  const [photo, setPhoto] = useState<any>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema) as any,
    defaultValues: {
      visitorName: '',
      visitorPhone: '',
      vehiclePlate: '',
      numberOfVisitors: 1 as any,
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
    console.log("Submitting with units:", units, "Error:", unitsError);
    const unitId = units?.[0]?.unitId;
    if (!unitId) {
      const debugInfo = units 
        ? `Units array length: ${units.length}. First item unitId: ${units[0]?.unitId}`
        : `Units is ${units}. Error: ${JSON.stringify(unitsError)}. Loading: ${isUnitsLoading}`;
      Alert.alert(
        "Error", 
        `No unit found to associate this visitor with.\n\nDebug: ${debugInfo}`
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append('unitId', unitId);
      formData.append('visitorName', data.visitorName);
      if (data.visitorPhone) formData.append('visitorPhone', data.visitorPhone);
      if (data.vehiclePlate) formData.append('vehiclePlate', data.vehiclePlate);
      formData.append('numberOfVisitors', data.numberOfVisitors.toString());
      if (data.notes) formData.append('notes', data.notes);
      
      // Default visit times (24h validity)
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

  const sectionStyle = [
    styles.section,
    { 
      backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
      borderColor: isDark ? colors.border.dark : colors.border.light,
    }
  ];

  return (
    <ScreenContainer withKeyboard={true}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Typography variant="h1" style={styles.title}>
            {t("Visitors.createNew", "Invite Guest")}
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            {t("Visitors.subtitle", "Generate a secure QR pass for your visitor")}
          </Typography>
        </View>

        <View style={sectionStyle}>
          <Typography variant="h3" style={styles.sectionTitle}>
            {t("Visitors.visitorDetails", "Visitor Details")}
          </Typography>
          
          <Controller
            control={control}
            name="visitorName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("Visitors.name", "Full Name *")}
                placeholder={t("Visitors.namePlaceholder", "e.g. John Doe")}
                value={value}
                onChangeText={onChange}
                error={errors.visitorName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="visitorPhone"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("Visitors.phone", "Phone Number (Optional)")}
                placeholder="+20 123 456 7890"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                error={errors.visitorPhone?.message}
              />
            )}
          />

          <View style={styles.row}>
            <View style={{ flex: 1.5, marginRight: spacing.md }}>
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
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={sectionStyle}>
          <Typography variant="h3" style={styles.sectionTitle}>
            {t("Visitors.photo", "Visitor Photo (Optional)")}
          </Typography>
          <Typography variant="caption" style={styles.photoHint}>
            {t("Visitors.photoHint", "Adding a photo helps security identify your guest faster.")}
          </Typography>
          
          <TouchableOpacity 
            style={[
              styles.photoPicker, 
              { 
                borderColor: isDark ? colors.border.dark : colors.border.light,
                backgroundColor: isDark ? '#1a202c' : '#f8fafc'
              }
            ]} 
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Typography style={{ color: colors.primary.light, fontWeight: '600' }}>
                  + {t("Visitors.addPhoto", "Add Photo")}
                </Typography>
              </View>
            )}
          </TouchableOpacity>
          {photo && (
            <TouchableOpacity onPress={() => setPhoto(null)} style={styles.removePhoto}>
              <Typography variant="caption" style={{ color: colors.error, fontWeight: '600' }}>
                {t("Common.remove", "Remove Photo")}
              </Typography>
            </TouchableOpacity>
          )}
        </View>

        <View style={sectionStyle}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("Visitors.notes", "Additional Notes")}
                placeholder={t("Visitors.notesPlaceholder", "Any special instructions for the gate...")}
                multiline
                numberOfLines={3}
                style={{ height: 100, textAlignVertical: 'top' }}
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
          <Button 
            variant="outline"
            title={t("Common.cancel", "Cancel")}
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#718096',
    lineHeight: 20,
  },
  section: {
    borderRadius: 24,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    ...shadows.md,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
    color: colors.primary.light,
  },
  row: {
    flexDirection: 'row',
  },
  photoPicker: {
    height: 140,
    width: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoHint: {
    textAlign: 'center',
    color: '#718096',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  removePhoto: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  mainButton: {
    marginBottom: spacing.md,
    height: 60,
    borderRadius: 16,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 0,
  }
});
