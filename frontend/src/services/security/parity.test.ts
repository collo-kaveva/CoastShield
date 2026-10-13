// Runs the SAME shared corpus the Python engine is tested against, so the two engines cannot silently drift apart.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeMessage, analyzeUrl } from "./analyzer";

const cases = JSON.parse(readFileSync("../shared/security_cases.json", "utf8")).cases as {
  id: string; kind: "message" | "url"; input: string; expected: { risk: string; indicators: string[]; valid?: boolean };
}[];

describe("shared security corpus", () => {
  it.each(cases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const r = c.kind === "message" ? analyzeMessage(c.input) : analyzeUrl(c.input);
    expect(r.risk).toBe(c.expected.risk);
    expect(r.indicators.map((i) => i.id)).toEqual(c.expected.indicators);
    if (c.kind === "url") expect((r as { valid: boolean }).valid).toBe(c.expected.valid);
  });
});
