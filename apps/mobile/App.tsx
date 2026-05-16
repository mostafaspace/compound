import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import BootSplash from 'react-native-bootsplash';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useRestoreSession } from './src/hooks/useRestoreSession';
import { SplashScreen } from './src/components/layout/SplashScreen';
import { SystemStatusFallback } from './src/components/layout/SystemStatusFallback';
import { useDispatch, useSelector } from 'react-redux';
import { selectConnectionStatus, selectIsOffline, selectLanguagePreference, setOfflineState } from './src/store/systemSlice';
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
  const connectionStatus = useSelector(selectConnectionStatus);
  const language = useSelector(selectLanguagePreference);
  const dispatch = useDispatch();

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

  React.useEffect(() => {
    const handleNetworkState = (state: NetInfoState) => {
      if (state.isConnected === false || state.isInternetReachable === false) {
        dispatch(setOfflineState({ isOffline: true, reason: 'no_internet' }));
        return;
      }

      if (connectionStatus === 'no_internet') {
        dispatch(setOfflineState({ isOffline: false }));
      }
    };

    const unsubscribe = NetInfo.addEventListener(handleNetworkState);
    void NetInfo.fetch().then(handleNetworkState);

    return unsubscribe;
  }, [connectionStatus, dispatch]);

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
