import React from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  ViewStyle, 
  useColorScheme, 
  KeyboardAvoidingView, 
  Platform,
  View,
  ScrollView
} from 'react-native';
import { colors, spacing } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  withKeyboard?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  withKeyboard = true,
}) => {
  const isDark = useColorScheme() === 'dark';
  
  const content = (
    <View style={[styles.inner, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}>
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
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
  },
});
