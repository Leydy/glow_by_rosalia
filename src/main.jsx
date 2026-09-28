import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Punto de arranque: React toma el <div id="root"> del index.html
// y dibuja dentro el componente App (toda nuestra aplicación).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
