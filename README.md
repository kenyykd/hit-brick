[hit-break.netlify.app](https://hit-break.netlify.app/)


# 🎮 打磚遊戲 (Brick Breaker Game)

使用純 JavaScript + HTML5 Canvas 開發、手機優先的打磚遊戲。開發順序與已定案決定見 [docs/dev-roadmap.md](docs/dev-roadmap.md)。

## 🛠️ 技術

- **HTML5 Canvas**：遊戲畫面（球、磚、板、粒子）
- **HTML + CSS**：選單、分數、暫停等介面，疊在 Canvas 上
- **Vite**：開發伺服器與打包，程式拆成 ES Modules
- **Vitest**：碰撞等純函式的單元測試

## 🚀 開發指令

需要 Node.js 22 以上。

```bash
npm install        # 安裝套件
npm run dev        # 開發伺服器（含區網位址，手機可連）
npm run build      # 打包到 dist/
npm run preview    # 預覽打包結果
npm test           # 執行測試
```

### 手機實機測試

1. 手機和電腦連同一個 Wi‑Fi。
2. 執行 `npm run dev`，開啟終端機印出的 `Network:` 網址。
3. 第一次執行時 Windows 防火牆若詢問是否允許 Node.js，請選允許。

### 除錯模式

網址加上 `?debug`，或遊戲中按 `` ` `` 鍵，可顯示 FPS、每幀邏輯步數與碰撞框。

## 📦 部署

Netlify 連 GitHub 自動部署：push 到 `main` 後會執行 `npm run build` 並發布 `dist/`（設定在 `netlify.toml`）。

## 📁 預計資料夾結構

```
src/
  core/      事件系統、遊戲迴圈、數學工具
  physics/   碰撞與反彈（純函式，可單獨測試）
  game/      球、板子、磚塊與每個 tick 的遊戲邏輯
  data/      板子、鍵位等資料定義
  input/     統一輸入（滑鼠、觸控、鍵盤）
  render/    Canvas 繪製、視窗尺寸、除錯層
  ui/        HTML 介面
  levels/    關卡資料（階段 2）
  state/     遊戲流程狀態（階段 3）
  save/      存檔（階段 3）
  powerups/  道具（階段 4）
  audio/     音效（階段 5）
tests/       單元測試與無畫面模擬
```
