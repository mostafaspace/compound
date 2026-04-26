import 'react-native-gesture-handler';
import { AppRegistry } from "react-native";
import { Provider } from "react-redux";
import { store } from "./src/store";

import "./i18n";
import App from "./App";

const Root = () => (
  <Provider store={store}>
    <App />
  </Provider>
);

AppRegistry.registerComponent("Compound", () => Root);
