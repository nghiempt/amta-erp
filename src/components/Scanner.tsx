"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { SwitchCamera } from "lucide-react";

const QR_CONFIG = {
  fps: 10,
  qrbox: (w: number, h: number) => {
    const size = Math.max(150, Math.floor(Math.min(w, h) * 0.75));
    return { width: size, height: Math.max(100, Math.floor(size * 0.65)) };
  },
};

export default function Scanner({
  onScan,
  paused = false,
}: {
  onScan: (text: string) => void;
  paused?: boolean;
}) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [camIndex, setCamIndex] = useState(-1);

  // Lấy danh sách camera, ưu tiên camera sau
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      Html5Qrcode.getCameras()
        .then((cams) => {
          if (cancelled || !cams.length) return;
          setCameras(cams);
          const backIdx = cams.findIndex((c) => /back|rear|sau|environment/i.test(c.label));
          // nhiều máy Android liệt kê cam sau ở cuối danh sách
          setCamIndex(backIdx >= 0 ? backIdx : cams.length - 1);
        })
        .catch((err) => {
          if (cancelled) return;
          const el = document.getElementById("qr-reader");
          if (el)
            el.innerHTML = `<div class="p-6 text-center text-sm text-red-600 bg-red-50 rounded-2xl">Không mở được camera: ${err}. Hãy cấp quyền camera cho trình duyệt.</div>`;
        });
    }, 150); // né mount "nháp" của React Strict Mode
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Start / restart khi đổi camera
  useEffect(() => {
    if (camIndex < 0 || !cameras[camIndex]) return;
    let cancelled = false;

    const run = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        if (scannerRef.current?.isScanning) await scannerRef.current.stop();
        if (cancelled) return;
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode("qr-reader");
        await scannerRef.current.start(
          cameras[camIndex].id,
          QR_CONFIG,
          (text) => {
            if (!pausedRef.current) onScanRef.current(text);
          },
          () => {}
        );
        if (cancelled) await scannerRef.current.stop();
      } catch {
        // camera bị chiếm hoặc bị gỡ giữa chừng — bỏ qua
      } finally {
        busyRef.current = false;
      }
    };
    run();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s && !busyRef.current && s.isScanning) {
        s.stop().catch(() => {});
      }
    };
  }, [camIndex, cameras]);

  return (
    <div className="relative">
      <div id="qr-reader" className="w-full min-h-64 overflow-hidden rounded-2xl bg-black" />
      {cameras.length > 1 && (
        <button
          type="button"
          onClick={() => setCamIndex((i) => (i + 1) % cameras.length)}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 text-white text-xs font-medium backdrop-blur active:scale-95 transition"
        >
          <SwitchCamera className="w-4 h-4" /> Đổi camera
        </button>
      )}
    </div>
  );
}
