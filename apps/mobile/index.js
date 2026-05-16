import 'react-native-gesture-handler';
import React from 'react';
import { AppRegistry, View } from "react-native";
import messaging from '@react-native-firebase/messaging';
import { Provider } from "react-redux";
import { store } from "./src/store";
import { configureScrollDefaults } from "./src/utils/configureScrollDefaults";

import "./i18n";
import App from "./App";

configureScrollDefaults();

messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
  // Background/quit state messages handled by OS notification tray
});

import { useSelector } from 'react-redux';
import { selectLanguagePreference } from './src/store/systemSlice';
import { isRtlLanguage, applyNativeDirection } from './src/i18n/direction';

const Root = () => {
  const language = useSelector(selectLanguagePreference);
  const isRtl = isRtlLanguage(language);

  // Sync native manager
  React.useEffect(() => {
    applyNativeDirection(language);
  }, [language]);

  return (
    <View style={{ flex: 1 }} key={language}>
      <App />
    </View>
  );
};

const Main = () => (
  <Provider store={store}>
    <Root />
  </Provider>
);

AppRegistry.registerComponent("Compound", () => Main);
