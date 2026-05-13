import React from 'react';
import { 
  StyleSheet, 
  View, 
  Pressable, 
  useColorScheme, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Typography } from '../ui/Typography';
import { colors, componentSize, radii, shadows, spacing } from '../../theme';
import { Icon } from '../ui/Icon';
import { centerTextDirectionStyle, useIsRtl, rowDirectionStyle, textDirectionStyle } from '../../i18n/direction';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ 
  title, 
  showBack = true, 
  rightElement 
}) => {
  const navigation = useNavigation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = useIsRtl();

  return (
    <View style={[
      styles.header, 
      { 
        backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
        borderBottomColor: isDark ? colors.border.dark : colors.border.light,
      }
    ]}>
      <SafeAreaView edges={['top']}>
        <View style={[styles.content, rowDirectionStyle(isRtl)]}>
          <View style={[styles.leftContainer, { alignItems: 'flex-start' }]}>
            {showBack && navigation.canGoBack() && (
              <Pressable 
                onPress={() => navigation.goBack()} 
                style={styles.backBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Icon name="arrow-left" color={isDark ? colors.text.primary.dark : colors.text.primary.light} size={22} />
              </Pressable>
            )}
          </View>

          <View style={styles.titleContainer}>
            <Typography numberOfLines={1} style={[styles.title, centerTextDirectionStyle(isRtl)]}>
              {title}
            </Typography>
          </View>

          <View style={[styles.rightContainer, { alignItems: 'flex-end' }]}>
            {rightElement}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    ...shadows.sm,
    zIndex: 10,
  },
  content: {
    height: Platform.OS === 'ios' ? 52 : 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  leftContainer: {
    width: 60,
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 60,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  backBtn: {
    width: componentSize.touch,
    height: componentSize.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
