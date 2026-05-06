import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetUnitsQuery } from '../../../services/property';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';

export const PropertyScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  
  const { data: units = [], isLoading, refetch } = useGetUnitsQuery();

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={styles.header}>
        <Typography variant="h2">
          {t("Property.unit")} {item.unitNumber}
        </Typography>
        <View style={styles.badge}>
          <Typography variant="label" style={styles.badgeText}>{item.blockName || item.buildingName}</Typography>
        </View>
      </View>
      <Typography variant="body" style={styles.detail}>{item.propertyType} • {item.area} sqm</Typography>
      <Typography variant="caption">{item.address}</Typography>
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={units}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Property.empty")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 11,
  },
  detail: {
    color: colors.text.secondary.light,
    marginTop: 2,
    marginBottom: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
