import { RouterProvider } from "react-router-dom";
import { Routes } from "./routes/Routes";
import { ToastProvider } from "./components/ui";

const App = () => {

  return (
    <>
      <RouterProvider router={Routes} />
      <ToastProvider />
    </>
  );

};

export default App;