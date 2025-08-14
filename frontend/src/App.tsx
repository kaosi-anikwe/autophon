import { RouterProvider } from "react-router-dom";

import { router } from "./lib/router";
import { AppInitializer } from "./components/layout/AppInitializer";
import { ToastProvider } from "./contexts/ToastContext";

function App() {
  return (
    <AppInitializer>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppInitializer>
  );
}

export default App;
