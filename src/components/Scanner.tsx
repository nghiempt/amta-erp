"use client";

import { useEffect, useRef, useState } from "react";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import Quagga from "@ericblade/quagga2";
import { SwitchCamera, ImageUp, Video, VideoOff } from "lucide-react";

// Dùng bản wasm serve từ chính app (tránh phụ thuộc CDN ngoài)
const enginePromise = prepareZXingModule({
  overrides: {
    locateFile: (path: string) =>
      path.endsWith(".wasm") ? "/zxing_reader.wasm" : path,
  },
  fireImmediately: true,
});

// Mọi format (Code128/ITF/Code39/QR...), dò kỹ, thử xoay/đảo màu
const READ_OPTS = {
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
} as const;

// Engine thứ 2: Quagga2 (thuật toán khác zxing, mạnh với barcode 1D in nhiệt)
function decodeWithQuagga(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    Quagga.decodeSingle(
      {
        src,
        numOfWorkers: 0,
        locate: true,
        decoder: {
          readers: ["code_128_reader", "i2of5_reader", "code_39_reader", "ean_reader"],
        },
      },
      (result) => resolve(result?.codeResult?.code ?? null)
    );
  });
}

// Tiếng "bíp" báo quét thành công
let audioCtx: AudioContext | null = null;
function beep() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1800;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {
    // trình duyệt chặn audio — thôi
  }
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [camIndex, setCamIndex] = useState(-1);
  const [error, setError] = useState("");
  const [engineReady, setEngineReady] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [hud, setHud] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
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
    if (!cameraOn) return; // tắt camera — cleanup phía dưới đã stop stream
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
  }, [cameraOn]);

  // Đổi camera theo lựa chọn
  useEffect(() => {
    if (!cameraOn || camIndex < 0 || !cameras[camIndex]) return;
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
  }, [camIndex, cameras, cameraOn]);

  // Vòng lặp dò mã: chụp khung hình vào canvas → readBarcodes
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && !pausedRef.current) {
        try {
          if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const results = await readBarcodes(imageData, READ_OPTS);
          let text = results.find((r) => r.text)?.text || "";
          // engine 2: Quagga — chạy mỗi 3 khung hình một lần cho nhẹ máy
          if (!text && !stopped && scanCountRef.current % 3 === 0) {
            text = (await decodeWithQuagga(canvas.toDataURL("image/png"))) || "";
          }
          scanCountRef.current++;
          if (!stopped)
            setHud(`${video.videoWidth}×${video.videoHeight} · đã dò ${scanCountRef.current} khung hình`);
          if (!stopped && text) {
            setDetectError("");
            beep();
            onScanRef.current(text);
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
      const results = await readBarcodes(file, READ_OPTS);
      let text = results.find((r) => r.text)?.text || "";
      if (!text) {
        const url = URL.createObjectURL(file);
        try {
          text = (await decodeWithQuagga(url)) || "";
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (text) {
        beep();
        onScanRef.current(text);
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
            className={`w-full min-h-64 max-h-96 object-cover rounded-2xl bg-black ${cameraOn ? "" : "hidden"}`}
          />
          {!cameraOn && (
            <div className="w-full min-h-64 rounded-2xl bg-slate-900 flex flex-col items-center justify-center gap-3 text-slate-400">
              <VideoOff className="w-8 h-8" />
              <p className="text-sm">Camera đang tắt</p>
              <button
                type="button"
                onClick={() => setCameraOn(true)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium active:scale-95 transition inline-flex items-center gap-1.5"
              >
                <Video className="w-4 h-4" /> Bật camera
              </button>
            </div>
          )}
          {cameraOn && !engineReady && !detectError && (
            <p className="absolute top-3 left-3 right-3 text-center text-xs text-white bg-black/60 rounded-lg px-3 py-1.5">
              Đang tải bộ giải mã…
            </p>
          )}
          {cameraOn && engineReady && !detectError && hud && (
            <p className="absolute top-3 left-3 right-32 text-center text-[11px] text-white/90 bg-black/50 rounded-lg px-3 py-1">
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
          {cameraOn && (
            <button
              type="button"
              onClick={() => setCameraOn(false)}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 text-white text-xs font-medium backdrop-blur active:scale-95 transition"
            >
              <VideoOff className="w-4 h-4" /> Tắt camera
            </button>
          )}
        </>
      )}
      {cameraOn && cameras.length > 1 && !error && (
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
