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
import { Typography } from '../ui/Typography';
import { colors, shadows } from '../../theme';

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

  return (
    <View style={[
      styles.header, 
      { 
        backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
        borderBottomColor: isDark ? '#1E293B' : '#F1F5F9'
      }
    ]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.content}>
          <View style={styles.leftContainer}>
            {showBack && navigation.canGoBack() && (
              <Pressable 
                onPress={() => navigation.goBack()} 
                style={styles.backBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Typography style={[styles.backIcon, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  ←
                </Typography>
              </Pressable>
            )}
          </View>

          <View style={styles.titleContainer}>
            <Typography numberOfLines={1} style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {title}
            </Typography>
          </View>

          <View style={styles.rightContainer}>
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
    paddingHorizontal: 8,
  },
  leftContainer: {
    width: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: Platform.OS === 'ios' ? -2 : 0,
  },
});
