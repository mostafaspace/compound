import AsyncStorage from '@react-native-async-storage/async-storage';

export enum StorageKey {
  LANGUAGE = 'app_language',
  COLOR_SCHEME = 'app_color_scheme',
}

export const Storage = {
  async set(key: StorageKey, value: string) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error(`Error saving to storage: ${key}`, e);
    }
  },

  async get(key: StorageKey): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error(`Error reading from storage: ${key}`, e);
      return null;
    }
  },

  async remove(key: StorageKey) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing from storage: ${key}`, e);
    }
  },
};
