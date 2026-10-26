// 預留：之後加入雲端存檔與排行榜時實作。
// 遊戲本體永遠不依賴這裡；失敗或沒實作都不影響遊玩。

export const sync = {
  async pushSave(/* save */) {},
  async submitScore(/* { levelId, score, paddleId } */) {},
};
