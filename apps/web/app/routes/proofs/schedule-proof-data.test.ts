import { describe, expect, it } from "vitest";

import { buildTimelineItems, timelineBarStyle } from "./schedule-proof-data";

describe("prova técnica da linha do tempo", () => {
  it("gera a carga máxima do MVP com identificadores únicos", () => {
    const items = buildTimelineItems(200);

    expect(items).toHaveLength(200);
    expect(new Set(items.map((item) => item.id))).toHaveLength(200);
  });

  it("mantém toda barra dentro da janela de 14 dias", () => {
    for (const item of buildTimelineItems(200)) {
      const span = Math.min(item.durationDays, 14 - item.startDay);

      expect(item.startDay).toBeGreaterThanOrEqual(0);
      expect(item.startDay + span).toBeLessThanOrEqual(14);
      expect(timelineBarStyle(item)).toEqual({
        gridColumn: `${item.startDay + 1} / span ${span}`,
      });
    }
  });
});
