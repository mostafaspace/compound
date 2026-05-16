import { FlatList, ScrollView, SectionList } from 'react-native';

const scrollDefaults = {
  automaticallyAdjustContentInsets: false,
  contentInsetAdjustmentBehavior: 'never',
  showsVerticalScrollIndicator: false,
} as const;

export const configureScrollDefaults = () => {
  for (const Component of [ScrollView, FlatList, SectionList] as Array<any>) {
    Component.defaultProps = {
      ...(Component.defaultProps ?? {}),
      ...scrollDefaults,
    };
  }
};
