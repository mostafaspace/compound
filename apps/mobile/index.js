import 'react-native-gesture-handler';
import { AppRegistry } from "react-native";
import messaging from '@react-native-firebase/messaging';
import { Provider } from "react-redux";
import { store } from "./src/store";

import "./i18n";
import App from "./App";

messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
  // Background/quit state messages handled by OS notification tray
});

const Root = () => (
  <Provider store={store}>
    <App />
  </Provider>
);

AppRegistry.registerComponent("Compound", () => Root);
