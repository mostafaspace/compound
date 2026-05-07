import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useRestoreSession } from './src/hooks/useRestoreSession';
import { SplashScreen } from './src/components/layout/SplashScreen';
import { SystemStatusFallback } from './src/components/layout/SystemStatusFallback';
import { useSelector } from 'react-redux';
import { selectIsOffline, selectLanguagePreference } from './src/store/systemSlice';
import { appDirectionStyle, applyNativeDirection, isRtlLanguage } from './src/i18n/direction';

const hideBootSplash = async () => {
  try {
    await BootSplash.hide({ fade: true });
  } catch (e) {
    console.warn('BootSplash.hide failed:', e);
  }
};

const AppContent = () => {
  const [isReady, setIsReady] = React.useState(false);
  const { isRestoring } = useRestoreSession();
  const isOffline = useSelector(selectIsOffline);
  const language = useSelector(selectLanguagePreference);

  React.useEffect(() => {
    // Hide native bootsplash overlay immediately
    hideBootSplash();

    const timer = setTimeout(() => {
      if (!isRestoring) {
        setIsReady(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isRestoring]);

  React.useEffect(() => {
    applyNativeDirection(language);
  }, [language]);

  return (
    <View style={[styles.root, appDirectionStyle(isRtlLanguage(language))]}>
      <StatusBar barStyle="light-content" backgroundColor="#010409" />
      {!isReady ? <SplashScreen /> : <RootNavigator />}
      {isOffline && <SystemStatusFallback />}
    </View>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
