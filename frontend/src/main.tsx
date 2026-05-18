import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import App from "./App";
import "antd/dist/reset.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={ruRU} theme={{ token: { colorPrimary: "#52c41a" } }}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
