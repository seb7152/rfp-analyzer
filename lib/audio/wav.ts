/**
 * Browser-side audio for dictation: the microphone is recorded with
 * MediaRecorder in whatever container the browser offers (webm/opus on
 * Chrome, mp4/aac on Safari), then decoded and re-encoded as WAV PCM 16 bits,
 * 16 kHz, mono, which every audio model accepts and which weighs 1,9 Mo per
 * minute. Nothing here runs on the server.
 */

export const DICTATION_SAMPLE_RATE = 16_000;

/** Decodes any recorded blob and returns 16 kHz mono samples in [-1, 1]. */
export async function decodeToMono(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(bytes.slice(0));
    const length = Math.ceil(decoded.duration * DICTATION_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, length, DICTATION_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    void ctx.close();
  }
}

/** WAV container around PCM 16 bits mono. */
export function encodeWav(samples: Float32Array, sampleRate = DICTATION_SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function recordingToWav(blob: Blob): Promise<Blob> {
  return encodeWav(await decodeToMono(blob));
}

/** The container this browser can record; MediaRecorder throws on an unknown one. */
export function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
}
