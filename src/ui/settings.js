// 設定頁：各項開關（音效等在階段 5 生效）與電腦按鍵自訂。

import { ACTION_LABELS, DEFAULT_KEYBINDINGS, keysLabel, rebind } from "../data/keybindings.js";

export function createSettings({ form, keyList, resetKeysButton, keySection, store, isTouch, onKeybindingsChange }) {
  let capturing = null; // 正在等待新按鍵的動作

  const bindings = () => store.data.settings.keybindings ?? DEFAULT_KEYBINDINGS;

  function setBindings(next) {
    store.update((s) => {
      s.settings.keybindings = next;
    });
    onKeybindingsChange(bindings());
    renderKeys();
  }

  function renderForm() {
    const { settings } = store.data;
    for (const input of form.elements) {
      if (!input.name || !(input.name in settings)) continue;
      if (input.type === "checkbox") input.checked = settings[input.name];
      else input.value = settings[input.name];
    }
  }

  function renderKeys() {
    keyList.replaceChildren();
    const current = bindings();
    for (const [action, label] of Object.entries(ACTION_LABELS)) {
      const row = document.createElement("div");
      row.className = "key-row";
      const name = document.createElement("span");
      name.textContent = label;
      const keys = document.createElement("span");
      keys.className = "key-current";
      keys.textContent = keysLabel(current[action]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "small";
      button.textContent = capturing === action ? "請按新按鍵…" : "變更";
      button.addEventListener("click", () => {
        capturing = capturing === action ? null : action; // 再按一次取消
        renderKeys();
      });
      row.append(name, keys, button);
      keyList.append(row);
    }
  }

  form.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.name) return;
    store.update((s) => {
      s.settings[input.name] = input.type === "checkbox" ? input.checked : input.value;
    });
  });

  resetKeysButton.addEventListener("click", () => {
    capturing = null;
    setBindings(null);
  });

  // 捕獲階段攔下按鍵，避免被其他地方處理
  window.addEventListener(
    "keydown",
    (e) => {
      if (!capturing) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const action = capturing;
      capturing = null;
      setBindings(rebind(bindings(), action, e.code));
    },
    true,
  );

  function render() {
    capturing = null;
    keySection.hidden = isTouch;
    renderForm();
    renderKeys();
  }

  return { render };
}
