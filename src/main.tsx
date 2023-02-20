import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { install } from "@twind/core";
import config from "../twind.config";

import "./index.css";

install(config);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
