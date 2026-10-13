import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Printer } from "lucide-react";
import { Button } from "./Button";
import { useToast } from "@/app/ToastProvider";

export function useCopy() {
  const { toast } = useToast();
  return async (text: string, what = "Link") => {
    try { await navigator.clipboard.writeText(text); toast(`${what} copied.`); }
    catch { toast("Could not copy automatically. Select the text and copy it manually.", "error"); }
  };
}

export function QrCard({ url, name }: { url: string; name: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const copy = useCopy();
  const { toast } = useToast();

  // XMLSerializer adds the xmlns attribute that browsers require to load an SVG as an image.
  const svgMarkup = () => { const el = wrap.current?.querySelector("svg"); return el ? new XMLSerializer().serializeToString(el) : ""; };

  const downloadPng = () => {
    const svg = svgMarkup();
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 1024;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      c.toBlob((b) => {
        if (!b) return toast("Could not create the image.", "error");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = "coastshield-qr.png"; a.click();
        URL.revokeObjectURL(a.href);
        toast("QR code downloaded.");
      });
    };
    img.onerror = () => toast("Could not create the image.", "error");
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const print = () => {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return toast("Allow pop-ups to print, or download the image instead.", "error");
    const d = w.document;
    d.title = `${name} QR code`;
    const box = d.createElement("div");
    box.style.cssText = "font-family:system-ui;text-align:center;padding:32px";
    const h = d.createElement("h1"); h.textContent = name; h.style.fontSize = "24px";
    const p = d.createElement("p"); p.textContent = "Scan to see our storefront"; 
    const holder = d.createElement("div"); holder.innerHTML = svgMarkup(); holder.style.cssText = "width:320px;margin:16px auto";
    const u = d.createElement("p"); u.textContent = url; u.style.cssText = "font-size:12px;word-break:break-all";
    box.append(h, p, holder, u); d.body.append(box);
    w.focus(); w.print();
  };

  return (
    <div className="text-center">
      <div ref={wrap} className="mx-auto inline-block rounded-2xl border border-sand-200 bg-white p-3">
        <QRCodeSVG value={url} size={176} level="M" marginSize={1} title={`QR code for ${name}`} />
      </div>
      <p className="mx-auto mt-3 max-w-[16rem] break-all text-xs text-ocean-600">{url}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => copy(url)}><Copy className="h-4 w-4" />Copy link</Button>
        <Button size="sm" variant="secondary" onClick={downloadPng}><Download className="h-4 w-4" />Download</Button>
        <Button size="sm" variant="secondary" onClick={print}><Printer className="h-4 w-4" />Print</Button>
      </div>
    </div>
  );
}
