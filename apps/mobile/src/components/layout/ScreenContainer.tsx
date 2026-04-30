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
import { colors, spacing } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  withKeyboard?: boolean;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  withKeyboard = true,
  edges,
}) => {
  const isDark = useColorScheme() === 'dark';
  
  const content = (
    <View style={[styles.inner, style]}>
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
      ) : (
        scrollable ? (
          <ScrollView contentContainerStyle={styles.scrollGrow}>
            {content}
          </ScrollView>
        ) : (
          content
        )
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
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.md, // Base padding
    paddingTop: spacing.md,
  },
});
