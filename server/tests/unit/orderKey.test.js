import { generateKeyBetween } from "fractional-indexing";

describe("orderKey - generateKeyBetween", () => {
  test("generates key after existing key", () => {
    const key = generateKeyBetween("a0", null);
    expect(key > "a0").toBe(true);
  });

  test("generates key before existing key", () => {
    const key = generateKeyBetween(null, "a0");
    expect(key < "a0").toBe(true);
  });

  test("generates key between two keys", () => {
    const key = generateKeyBetween("a0", "a2");
    expect(key > "a0").toBe(true);
    expect(key < "a2").toBe(true);
  });

  test("generates key for empty columnName (both null)", () => {
    const key = generateKeyBetween(null, null);
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  test("generates key before Zz", () => {
    const key = generateKeyBetween(null, "Zz");
    expect(key < "Zz").toBe(true);
  });

  test("generates key after Zz", () => {
    const key = generateKeyBetween("Zz", null);
    expect(key > "Zz").toBe(true);
  });

  test("generates key between Zz and a0", () => {
    const key = generateKeyBetween("Zz", "a0");
    expect(key > "Zz").toBe(true);
    expect(key < "a0").toBe(true);
  });

  test("throws when before >= after", () => {
    expect(() => generateKeyBetween("a2", "a0")).toThrow();
  });

  test("multiple sequential keys are ordered correctly", () => {
    const k1 = generateKeyBetween(null, null);
    const k2 = generateKeyBetween(k1, null);
    const k3 = generateKeyBetween(k2, null);
    expect(k1 < k2).toBe(true);
    expect(k2 < k3).toBe(true);
  });

  test("inserting between produces correct ordering", () => {
    const k1 = generateKeyBetween(null, null);
    const k3 = generateKeyBetween(k1, null);          
    const k2 = generateKeyBetween(k1, k3);
    expect(k1 < k2).toBe(true);
    expect(k2 < k3).toBe(true);
  });
});