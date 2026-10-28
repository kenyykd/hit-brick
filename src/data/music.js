// 背景音樂（8-bit 風格，程式合成）。每一格是一個八分音符，「-」是休止。
// 各聲部長度可以不同，各自循環。

export const TRACKS = {
  menu: {
    bpm: 96,
    voices: [
      {
        wave: "square",
        volume: 0.05,
        length: 0.8, // 每個音佔一格的比例
        notes: "C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - E5 - G5 - C6 - B5 - A5 - G5 - F5 - E5 - D5 - - -",
      },
      { wave: "triangle", volume: 0.09, length: 1.6, notes: "C3 - - - G2 - - - F2 - - - G2 - - -" },
    ],
  },
  game: {
    bpm: 140,
    voices: [
      {
        wave: "square",
        volume: 0.045,
        length: 0.7,
        notes:
          "A4 - C5 E5 A5 - G5 E5 F5 - E5 C5 D5 - E5 - A4 - C5 E5 A5 - B5 C6 B5 A5 G5 E5 A5 - - -",
      },
      {
        wave: "triangle",
        volume: 0.1,
        length: 0.9,
        notes: "A2 - A3 - A2 - A3 - F2 - F3 - G2 - G3 - A2 - A3 - A2 - A3 - E2 - E3 - A2 - A3 -",
      },
    ],
  },
};
