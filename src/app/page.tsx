import Script from "next/script";
import { LightLanding } from "@/components/marketing/LightLanding";

export default function Home() {
  return (
    <>
      <LightLanding />
      <Script
        id="conversaai-landing-webchat"
        src="/widget.js?v=20260910-2"
        data-assistant-id="ae7e4724-0f87-4b0b-b276-daadfef72331"
        strategy="afterInteractive"
      />
    </>
  );
}
