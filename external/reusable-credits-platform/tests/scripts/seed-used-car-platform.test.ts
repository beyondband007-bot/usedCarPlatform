import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const seed = require("../../scripts/seed-used-car-platform.cjs") as {
  APPLICATION: { code: string };
  FUNCTIONS: Array<{ code: string; defaultPoints: string }>;
  RECHARGE_PRODUCTS: Array<{ name: string; amount: string; points: string }>;
};

describe("usedCarPlatform seed catalog", () => {
  it("registers the expected application code", () => {
    expect(seed.APPLICATION.code).toBe("used-car-platform");
  });

  it("keeps usedCarPlatform function pricing aligned with the integration contract", () => {
    const prices = new Map(seed.FUNCTIONS.map((item) => [item.code, item.defaultPoints]));

    expect(prices).toEqual(
      new Map([
        ["showroom-light", "30.0000"],
        ["outdoor-scene", "30.0000"],
        ["road-motion", "30.0000"],
        ["sky-studio", "30.0000"],
        ["paint-refresh", "30.0000"],
        ["light-consistency", "30.0000"],
        ["interior-clean", "30.0000"],
        ["interior-collage", "30.0000"],
        ["watermark-remove", "30.0000"],
        ["batch-new-exterior", "30.0000"],
        ["batch-new-interior", "30.0000"]
      ])
    );
  });

  it("provides the three usedCarPlatform recharge products", () => {
    expect(seed.RECHARGE_PRODUCTS).toMatchObject([
      { name: "Enterprise Basic", amount: "980.00", points: "20000.0000" },
      { name: "Enterprise Team", amount: "3980.00", points: "100000.0000" },
      { name: "Enterprise Flagship", amount: "9800.00", points: "800000.0000" }
    ]);
  });
});
