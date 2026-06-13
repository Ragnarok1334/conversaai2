"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onVerify, onError, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onVerify, onError, onExpire]);
  
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    if (typeof window !== "undefined" && (window as any).turnstile) {
      setIsReady(true);
    }
  }, [siteKey]);

  useEffect(() => {
    if (!isReady || !siteKey || !containerRef.current) return;

    try {
      widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token: string) => {
          onVerifyRef.current(token);
        },
        "error-callback": () => {
          if (onErrorRef.current) onErrorRef.current();
        },
        "expired-callback": () => {
          if (onExpireRef.current) onExpireRef.current();
        },
      });
    } catch (error) {
      console.error("Error rendering Turnstile:", error);
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetIdRef.current);
      }
    };
  }, [isReady, siteKey]);

  if (!siteKey) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="p-3 mb-4 border border-yellow-500/30 bg-yellow-500/10 rounded-xl text-yellow-500 text-xs text-center w-full">
          [Dev] Falta NEXT_PUBLIC_TURNSTILE_SITE_KEY
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center my-4 w-full">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setIsReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
      <p className="text-[11px] text-slate-500 mt-2 text-center">
        Protegemos el acceso para evitar bots y abuso.
      </p>
    </div>
  );
}
