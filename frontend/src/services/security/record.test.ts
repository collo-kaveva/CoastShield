// One-off generator: records the reference engine's output for the shared corpus. Run: RECORD=1 npx vitest run record
import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { analyzeMessage, analyzeUrl } from "./analyzer";

it.skipIf(!process.env.RECORD)("records expected results", () => {
  const src = JSON.parse(readFileSync("../shared/security_inputs.json", "utf8"));
  src.cases = src.cases.map((c: { kind: string; input: string }) => {
    const r = c.kind === "message" ? analyzeMessage(c.input) : analyzeUrl(c.input);
    return { ...c, expected: { risk: r.risk, indicators: r.indicators.map((i) => i.id), ...(c.kind === "url" ? { valid: (r as { valid: boolean }).valid } : {}) } };
  });
  writeFileSync("../shared/security_cases.json", JSON.stringify(src, null, 1));
});
