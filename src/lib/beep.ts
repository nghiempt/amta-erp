"use client";

/*
 * Tiếng "bíp" báo quét thành công — chạy được trên iOS.
 *
 * iOS/WebKit chỉ cho phát âm thanh nếu media element đã được play() ít nhất
 * 1 lần bên trong 1 thao tác chạm của người dùng ("bless"). Ngoài ra Web Audio
 * bị câm khi iPhone gạt im lặng, còn thẻ <audio> thì vẫn kêu — nên dùng <audio>
 * làm kênh chính, Web Audio làm fallback.
 *
 * initBeepUnlock() được AppShell gọi khi app mount: cú chạm ĐẦU TIÊN bất kỳ
 * trong app sẽ prime element bằng 1 file wav im lặng (không nghe thấy gì),
 * sau đó đổi src sang file beep — element đã được bless nên các lần play()
 * sau không cần gesture nữa.
 */

const SILENT_WAV =
  "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const BEEP_WAV = "data:audio/wav;base64,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";

let el: HTMLAudioElement | null = null;
let primed = false;
let listenersAttached = false;

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function prime() {
  try {
    // 1) Bless audio element bằng wav im lặng
    if (!el) {
      el = new Audio(SILENT_WAV);
      el.setAttribute("playsinline", "");
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      el.preload = "auto";
    }
    if (!primed) {
      el.play()
        .then(() => {
          el!.pause();
          el!.src = BEEP_WAV;
          el!.load();
          primed = true;
        })
        .catch(() => {});
    }
    // 2) Mở khoá luôn Web Audio (fallback)
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch {
    // thôi
  }
}

/** Gắn listener prime audio ở cú chạm đầu tiên. Gọi từ AppShell (luôn mounted). */
export function initBeepUnlock() {
  if (listenersAttached || typeof window === "undefined") return () => {};
  listenersAttached = true;
  const handler = () => prime();
  window.addEventListener("pointerdown", handler, { passive: true });
  window.addEventListener("touchstart", handler, { passive: true });
  window.addEventListener("keydown", handler);
  return () => {
    listenersAttached = false;
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("keydown", handler);
  };
}

function beepWebAudio() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const play = () => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 1800;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // thôi
    }
  };
  if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
  else play();
}

/** Phát tiếng bíp báo quét thành công. */
export function beep() {
  try {
    if (el && primed) {
      el.currentTime = 0;
      el.play().catch(() => beepWebAudio());
      return;
    }
  } catch {
    // rơi xuống fallback
  }
  beepWebAudio();
}
