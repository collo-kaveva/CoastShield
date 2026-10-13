import type { OpeningHours } from "@/types";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const defaultHours = (): OpeningHours[] =>
  DAYS.map((day) => ({ day, open: "08:00", close: "17:00", closed: day === "Sunday" }));

export const summariseHours = (hours: OpeningHours[]) => {
  const open = hours.filter((h) => !h.closed);
  if (open.length === 0) return "Hours not set";
  const first = open[0];
  const same = open.every((h) => h.open === first.open && h.close === first.close);
  if (same) return `${open[0].day.slice(0, 3)}–${open[open.length - 1].day.slice(0, 3)}, ${first.open}–${first.close}`;
  return `Open ${open.length} days a week`;
};
