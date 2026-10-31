// 上方提示框：成就達成、解鎖慶祝。不擋操作、不打斷遊戲；一次顯示一則，依序排隊。

const SHOW_MS = 2800;

export function createToast(element) {
  const queue = [];
  let timer = null;

  function showNext() {
    const message = queue.shift();
    if (!message) {
      element.hidden = true;
      timer = null;
      return;
    }
    element.textContent = message;
    element.hidden = false;
    // 重新觸發進場動畫
    element.classList.remove("enter");
    void element.offsetWidth;
    element.classList.add("enter");
    timer = setTimeout(showNext, SHOW_MS);
  }

  function show(message) {
    queue.push(message);
    if (!timer) showNext();
  }

  return { show };
}
