import { RouterProvider } from "react-router-dom";

import { router } from "./lib/router";
import { ToastProvider } from "./contexts/ToastContext";
import { AppConfigProvider } from "./contexts/AppConfigContext";
import { AppInitializer } from "./components/layout/AppInitializer";

function App() {
  return (
    <AppInitializer>
      <ToastProvider>
        <AppConfigProvider>
          <RouterProvider router={router} />
        </AppConfigProvider>
      </ToastProvider>
    </AppInitializer>
  );
}

export default App;
