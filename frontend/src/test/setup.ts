import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement <dialog> modal methods.
const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
if (typeof proto.showModal !== "function") {
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  proto.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
}
window.scrollTo = () => {};
Object.assign(navigator, { clipboard: { writeText: async () => {} } });

afterEach(() => cleanup());
