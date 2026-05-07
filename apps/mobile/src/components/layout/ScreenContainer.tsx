import React from 'react';
import { 
  StyleSheet, 
  ViewStyle, 
  StyleProp,
  useColorScheme, 
  KeyboardAvoidingView, 
  Platform,
  View,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { colors, layout } from '../../theme';
import { selectLanguagePreference } from '../../store/systemSlice';
import { appDirectionStyle, isRtlLanguage } from '../../i18n/direction';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  withKeyboard?: boolean;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
}

const DEFAULT_EDGES: readonly ('top' | 'right' | 'bottom' | 'left')[] = ['left', 'right'];

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  withKeyboard = true,
  edges = DEFAULT_EDGES,
}) => {
  const isDark = useColorScheme() === 'dark';
  const language = useSelector(selectLanguagePreference);
  const isRtl = isRtlLanguage(language);
  
  const content = (
    <View style={[styles.inner, appDirectionStyle(isRtl), style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}
      edges={edges}
    >
      {withKeyboard ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          {scrollable ? (
            <ScrollView contentContainerStyle={styles.scrollGrow}>
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardAvoidingView>
      ) : scrollable ? (
        <ScrollView contentContainerStyle={styles.scrollGrow}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollGrow: {
    flexGrow: 1,
    paddingBottom: layout.screenBottom,
  },
  inner: {
    flex: 1,
    paddingHorizontal: layout.screenGutter,
    paddingTop: layout.screenTop,
  },
});
