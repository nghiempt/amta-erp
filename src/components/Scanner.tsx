"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner({
  onScan,
  paused = false,
}: {
  onScan: (text: string) => void;
  paused?: boolean;
}) {
  const ref = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    ref.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.75, height: Math.min(w, h) * 0.5 }) },
        (text) => {
          if (!pausedRef.current) onScanRef.current(text);
        },
        () => {}
      )
      .catch((err) => {
        const el = document.getElementById("qr-reader");
        if (el)
          el.innerHTML = `<div class="p-6 text-center text-sm text-red-600 bg-red-50 rounded-2xl">Không mở được camera: ${err}. Hãy cấp quyền camera cho trình duyệt.</div>`;
      });

    return () => {
      if (stopped) return;
      stopped = true;
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, []);

  return <div id="qr-reader" className="w-full overflow-hidden rounded-2xl bg-black" />;
}
