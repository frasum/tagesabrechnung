import { describe, it, expect } from "vitest";
import { distributeByHoursCocoModel, eurosToCents } from "./tipPoolCoco";

const shares = (d: ReturnType<typeof distributeByHoursCocoModel>) =>
  Array.from(d.sharesCents.values());

describe("distributeByHoursCocoModel (COCO parity)", () => {
  it("Pool 100 € · Stunden 5/3/2 → 50/30/20, Rest 0", () => {
    const d = distributeByHoursCocoModel(eurosToCents(100), [
      { key: "a", hours: 5 },
      { key: "b", hours: 3 },
      { key: "c", hours: 2 },
    ]);
    expect(shares(d)).toEqual([5000, 3000, 2000]);
    expect(d.restCents).toBe(0);
  });

  it("Pool 100 € · 3×gleiche Stunden → 3×33 €, Rest 1 €", () => {
    const d = distributeByHoursCocoModel(eurosToCents(100), [
      { key: "a", hours: 4 },
      { key: "b", hours: 4 },
      { key: "c", hours: 4 },
    ]);
    expect(shares(d)).toEqual([3300, 3300, 3300]);
    expect(d.restCents).toBe(100);
  });

  it("Pool 79,73 € · 4×gleiche Stunden → 4×19 €, Rest 3,73 €", () => {
    const d = distributeByHoursCocoModel(eurosToCents(79.73), [
      { key: "a", hours: 2 },
      { key: "b", hours: 2 },
      { key: "c", hours: 2 },
      { key: "d", hours: 2 },
    ]);
    expect(shares(d)).toEqual([1900, 1900, 1900, 1900]);
    expect(d.restCents).toBe(373);
  });

  it("Alle Stunden 0/fehlend → alle Anteile 0, Rest = Pool", () => {
    const d = distributeByHoursCocoModel(eurosToCents(50), [
      { key: "a", hours: 0 },
      { key: "b", hours: 0 },
    ]);
    expect(shares(d)).toEqual([0, 0]);
    expect(d.restCents).toBe(5000);
  });

  it("Teilnehmer ohne Stunden neben zweien mit → 0 €, Rest korrekt", () => {
    const d = distributeByHoursCocoModel(eurosToCents(100), [
      { key: "a", hours: 5 },
      { key: "b", hours: 5 },
      { key: "c", hours: 0 },
    ]);
    expect(d.sharesCents.get("a")).toBe(5000);
    expect(d.sharesCents.get("b")).toBe(5000);
    expect(d.sharesCents.get("c")).toBe(0);
    expect(d.restCents).toBe(0);
  });
});
