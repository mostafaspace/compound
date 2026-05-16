import React from 'react';
import { 
  StyleSheet, 
  ViewStyle, 
  StyleProp,
  useColorScheme, 
  KeyboardAvoidingView, 
  Platform,
  View,
  ScrollView,
  FlatList,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { colors, layout } from '../../theme';
import { appDirectionStyle, useIsRtl } from '../../i18n/direction';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  withKeyboard?: boolean;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
}

const DEFAULT_EDGES: readonly ('top' | 'right' | 'bottom' | 'left')[] = ['left', 'right'];
const SCROLLABLE_CHILD_TYPES = new Set<unknown>([ScrollView, FlatList, SectionList]);

const hasDirectScrollableChild = (children: React.ReactNode) => {
  const childArray = React.Children.toArray(children);

  if (childArray.length !== 1 || !React.isValidElement(childArray[0])) {
    return false;
  }

  return SCROLLABLE_CHILD_TYPES.has(childArray[0].type);
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  withKeyboard = true,
  edges = DEFAULT_EDGES,
}) => {
  const isDark = useColorScheme() === 'dark';
  const isRtl = useIsRtl();
  const flattenedStyle = StyleSheet.flatten(style);
  const disablesContainerPadding = flattenedStyle?.padding === 0 || (!scrollable && hasDirectScrollableChild(children));
  
  const content = (
    <View style={[styles.inner, appDirectionStyle(isRtl), style, disablesContainerPadding && styles.noPadding]}>
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
            <ScrollView
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={[styles.scrollGrow, appDirectionStyle(isRtl)]}
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardAvoidingView>
      ) : scrollable ? (
        <ScrollView
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[styles.scrollGrow, appDirectionStyle(isRtl)]}
          showsVerticalScrollIndicator={false}
        >
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
  noPadding: {
    padding: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingVertical: 0,
  },
});
