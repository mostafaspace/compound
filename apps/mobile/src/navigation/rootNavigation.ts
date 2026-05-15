import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function openNotificationsCenter() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('NotificationsCenter');
  }
}
