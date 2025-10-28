import React from "react";
import ReactDOM from "react-dom/client";
import ReefLoggerPro from "./App";
import "./index.css"; // crea un archivo vacío si no usas estilos

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReefLoggerPro />
  </React.StrictMode>
);

