import type { ReactNode } from "react";
import { IS_DEMO } from "@/services";

function Page({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mx-auto max-w-2xl space-y-4 px-4 py-12"><h1 className="text-4xl font-bold">{title}</h1>{children}</div>;
}
const P = ({ children }: { children: ReactNode }) => <p className="text-lg text-ocean-700">{children}</p>;

export function AboutPage() {
  return <Page title="About CoastShield"><P>CoastShield is a hackathon prototype that helps small businesses in coastal Kenya build a simple digital storefront, manage customer requests, and learn practical cybersecurity habits.</P><P>This version runs in demo mode: all data is stored in your own browser and all sample businesses and orders are fictional.</P><P>CoastShield gives guidance only. It cannot guarantee protection from fraud and it does not verify mobile-money payments.</P></Page>;
}

export function PrivacyPage() {
  return (
    <Page title="Privacy notice (demo)">
      <P>{IS_DEMO ? "In demo mode, everything you enter is stored only in your browser on this device. Nothing is sent to a server, and you can erase it from Settings → Reset demo data." : "Your account, storefront and order details are stored on the CoastShield server. Customer contact details are visible only to the business that received the request."}</P>
      <P>{IS_DEMO ? "The security assistant analyses text in your browser and does not store the message." : "The security assistant analyses text on the server and does not store the message or link. Only the risk level and the names of the warning signs found are kept in your history, for up to 90 days, and you can delete them at any time."} Please do not paste PINs, passwords or one-time codes into any tool, including this one.</P>
      <P>In the full version, we plan to collect only what is needed to run a storefront, show contact details only when an owner chooses, and keep security-check data to a minimum. This notice will be updated before any real data is collected.</P>
    </Page>
  );
}

export function ContactPage() {
  return <Page title="Contact"><P>CoastShield is a prototype, so there is no public support line yet. Contact details will be added here by the project team before any real launch.</P><P>If you think you have been targeted by a scam, use your mobile-money provider's or bank's official channels. The incident guides in the Security centre explain what to do first.</P></Page>;
}
