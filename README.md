[hit-break.netlify.app](https://hit-break.netlify.app/)


# 🎮 打磚遊戲 (Brick Breaker Game)

使用純 JavaScript + HTML5 Canvas 開發、手機優先的打磚遊戲。開發順序與已定案決定見 [docs/dev-roadmap.md](docs/dev-roadmap.md)。

## ⭐ 星星與解鎖

每關最多 3 顆星：過關、達到目標分數、不失去生命。累積星星可以解鎖護盾板、雷射板，以及球和板子的外觀（外觀只改變樣子，不影響手感）。主選單的「成就」可以看 15 個成就的進度。

## 🕹️ 操作

| | 手機 | 電腦 |
|---|---|---|
| 瞄準與發射 | 按住往後拉（彈弓），放開發射；點一下用預設角度 | 滑鼠按住往後拉放開，或 ↑ ↓ / W S 調角度後按空白鍵；點擊直接發射 |
| 移動板子 | 發射後在任意位置左右拖曳 | 滑鼠移動，或 ← → / A D |
| 技能（護盾板、雷射板） | 能量滿時按右下角發光的按鈕 | 空白鍵（沒持球時）、右鍵或右下角按鈕 |
| 暫停 | 右上角暫停鈕 | Esc / P（可在設定頁自訂按鍵） |

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

- `?debug&level=3`：跳過選單直接開始第 3 關（不受解鎖限制，只在除錯模式有效）
- `?debug&level=sandbox`：沙盒關，四種磚都有，用來測試
- 除錯模式下可在瀏覽器 console 用 `__game`、`__app` 檢查狀態
- 除錯模式下遊戲中按數字鍵 `1`～`6` 直接拿道具、`0` 充滿技能能量；所有板子都已解鎖

### 存檔

進度與設定存在瀏覽器的 localStorage（`hit-brick-save`）。想重來可以在 console 執行 `localStorage.removeItem("hit-brick-save")` 後重新整理。

### 關卡格式

關卡在 [src/levels/levels.js](src/levels/levels.js)，新增一關只要加一筆資料。用文字排磚，每列字元數要一樣（9～10 欄）：

| 字元 | 磚塊 |
|---|---|
| `.` | 空格 |
| `N` | 普通磚 |
| `2` / `3` | 多次擊破磚（打 2 / 3 下） |
| `#` | 不可破壞磚 |
| `*` | 爆炸磚（炸掉上下左右 4 格，可連鎖） |

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
  state/     遊戲流程狀態機
  save/      存檔、關卡進度與星星、預留的雲端同步介面
  achievements/ 成就追蹤（只訂閱事件）
  powerups/  道具（階段 4）
  audio/     音效（目前只有解鎖，音效在階段 5）
tests/       單元測試與無畫面模擬
```
