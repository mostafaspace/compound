import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useRestoreSession } from './src/hooks/useRestoreSession';
import { SplashScreen } from './src/components/layout/SplashScreen';

const AppContent = () => {
  const [isReady, setIsReady] = useState(false);
  const { isRestoring } = useRestoreSession();

  useEffect(() => {
    // Artificial delay for splash screen to show the brand
    const timer = setTimeout(() => {
      if (!isRestoring) {
        setIsReady(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isRestoring]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#010409" />
      <RootNavigator />
      {!isReady && <SplashScreen />}
    </>
  );
};

const App = () => {
  return <AppContent />;
};

export default App;
