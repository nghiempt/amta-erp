"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeDetector, prepareZXingModule } from "barcode-detector/ponyfill";
import { SwitchCamera, ImageUp } from "lucide-react";

// Dùng bản wasm serve từ chính app (tránh phụ thuộc CDN ngoài)
const enginePromise = prepareZXingModule({
  overrides: {
    locateFile: (path: string) =>
      path.endsWith(".wasm") ? "/zxing_reader.wasm" : path,
  },
  fireImmediately: true,
});

// Barcode phiếu TikTok là Code 128; QR cho mã nội bộ AMTA
const detector = new BarcodeDetector({ formats: ["qr_code", "code_128"] });

// Samsung/Chrome hay mở camera với focus cố định — ép lấy nét liên tục
async function enableContinuousFocus(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    const caps = track.getCapabilities?.() as
      | (MediaTrackCapabilities & { focusMode?: string[] })
      | undefined;
    if (caps?.focusMode?.includes("continuous")) {
      await track.applyConstraints({
        advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
      });
    }
  } catch {
    // không hỗ trợ — thôi
  }
}

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [camIndex, setCamIndex] = useState(-1);
  const [error, setError] = useState("");
  const [engineReady, setEngineReady] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [hud, setHud] = useState("");
  const scanCountRef = useRef(0);

  // Nạp engine wasm — lỗi thì hiện rõ thay vì im lặng
  useEffect(() => {
    let cancelled = false;
    enginePromise
      .then(() => !cancelled && setEngineReady(true))
      .catch((err) => !cancelled && setDetectError(`Không tải được bộ giải mã: ${err}`));
    return () => {
      cancelled = true;
    };
  }, []);

  // Mở camera lần đầu (facingMode: environment) rồi liệt kê camera để đổi
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        await enableContinuousFocus(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        if (!cancelled) setCameras(cams);
      } catch (err) {
        if (!cancelled)
          setError(`Không mở được camera: ${err}. Hãy cấp quyền camera cho trình duyệt.`);
      }
    }
    init();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Đổi camera theo lựa chọn
  useEffect(() => {
    if (camIndex < 0 || !cameras[camIndex]) return;
    let cancelled = false;

    async function switchCam() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: cameras[camIndex].id },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        await enableContinuousFocus(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        // camera bị chiếm — bỏ qua
      }
    }
    switchCam();
    return () => {
      cancelled = true;
    };
  }, [camIndex, cameras]);

  // Vòng lặp dò mã
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !pausedRef.current) {
        try {
          const results = await detector.detect(video);
          scanCountRef.current++;
          if (!stopped)
            setHud(`${video.videoWidth}×${video.videoHeight} · đã dò ${scanCountRef.current} khung hình`);
          if (!stopped && results.length && results[0].rawValue) {
            setDetectError("");
            onScanRef.current(results[0].rawValue);
          }
        } catch (err) {
          if (!stopped) setDetectError(`Lỗi giải mã: ${err}`);
          console.error("Scanner detect error:", err);
        }
      }
      timer = setTimeout(tick, 150);
    }
    tick();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  // Quét từ ảnh chụp sẵn — fallback khi camera không lấy nét được
  async function scanFromFile(file: File) {
    setDetectError("");
    try {
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();
      if (results.length && results[0].rawValue) {
        onScanRef.current(results[0].rawValue);
      } else {
        setDetectError("Không tìm thấy barcode trong ảnh — chụp gần và rõ nét hơn thử");
      }
    } catch (err) {
      setDetectError(`Lỗi đọc ảnh: ${err}`);
    }
  }

  return (
    <div className="relative" id="qr-reader">
      {error ? (
        <div className="p-6 text-center text-sm text-red-600 bg-red-50 rounded-2xl">{error}</div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full min-h-64 max-h-96 object-cover rounded-2xl bg-black"
          />
          {!engineReady && !detectError && (
            <p className="absolute top-3 left-3 right-3 text-center text-xs text-white bg-black/60 rounded-lg px-3 py-1.5">
              Đang tải bộ giải mã…
            </p>
          )}
          {engineReady && !detectError && hud && (
            <p className="absolute top-3 left-3 right-3 text-center text-[11px] text-white/90 bg-black/50 rounded-lg px-3 py-1">
              {hud}
            </p>
          )}
          {detectError && (
            <p className="absolute top-3 left-3 right-3 text-center text-xs text-white bg-red-600/85 rounded-lg px-3 py-1.5 break-all">
              {detectError}
            </p>
          )}
          {/* Quét từ ảnh — dùng camera máy chụp (lấy nét tốt) rồi decode */}
          <label className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 text-white text-xs font-medium backdrop-blur active:scale-95 transition cursor-pointer">
            <ImageUp className="w-4 h-4" /> Quét từ ảnh
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && scanFromFile(e.target.files[0])}
            />
          </label>
        </>
      )}
      {cameras.length > 1 && !error && (
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
