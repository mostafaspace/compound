import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['compound://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Property: 'property',
          Finance: 'finance',
          Notifications: 'notifications',
          Settings: 'settings',
          OrgChart: 'org-chart',
        },
      },
      Guard: {
        screens: {
          Gate: 'gate',
          Patrol: 'patrol',
          Settings: 'guard-settings',
        },
      },
    },
  },
};
