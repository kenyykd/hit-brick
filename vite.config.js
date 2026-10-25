import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // 讓同一個 Wi-Fi 下的手機能用區網 IP 連到開發伺服器
    host: true,
  },
});
