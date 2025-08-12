import { RouterProvider } from "react-router-dom";

import { router } from "./lib/router";
import { AppInitializer } from "./components/layout/AppInitializer";

function App() {
  return (
    <AppInitializer>
      <RouterProvider router={router} />
    </AppInitializer>
  );
}

export default App;
