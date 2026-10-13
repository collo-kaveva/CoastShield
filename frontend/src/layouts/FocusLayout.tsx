import { Outlet } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { DemoNotice } from "./DemoNotice";

export function FocusLayout() {
  return (
    <div className="min-h-screen bg-sand-100">
      <header className="border-b border-sand-200 bg-white"><div className="mx-auto flex h-16 max-w-3xl items-center px-4"><Logo to="/" /></div></header>
      <main id="main"><div className="mx-auto max-w-2xl px-4 pt-6"><DemoNotice /></div><Outlet /></main>
    </div>
  );
}
