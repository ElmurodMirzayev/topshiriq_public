// Клиентское сжатие видео через WebCodecs (аппаратное ускорение).
//
// Почему не ffmpeg.wasm: ffmpeg.wasm кодирует libx264 ПРОГРАММНО внутри
// WebAssembly — однопоточно, без GPU. Это медленно даже для 14 МБ и совершенно
// неприемлемо для 100–200 МБ.
//
// mediabunny использует WebCodecs API (VideoEncoder/VideoDecoder), который на
// Android/Telegram WebView задействует АППАРАТНЫЙ кодек устройства. Это в разы
// быстрее, не требует загрузки тяжёлого WASM-ядра (~25 МБ) и не блокирует UI.
import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
} from 'mediabunny';

// Файлы меньше этого размера не сжимаем — выигрыш незаметен, а время и расход
// батареи не оправданы.
const MIN_SIZE_TO_COMPRESS = 3 * 1024 * 1024; // 3 МБ

// Целевая доля от исходного битрейта: ~70% => примерно −30% размера.
const TARGET_BITRATE_RATIO = 0.7;
// Нижняя граница видеобитрейта, чтобы не «убить» качество на длинных видео.
const MIN_VIDEO_BITRATE = 300_000; // 300 кбит/с

export interface CompressCallbacks {
  onProgress?: (pct: number) => void;
  onPhase?: (text: string) => void;
}

// Поддерживает ли среда аппаратное кодирование видео через WebCodecs.
export function isHardwareCompressionSupported(): boolean {
  return typeof window !== 'undefined' &&
    typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder !== 'undefined' &&
    typeof (window as unknown as { VideoDecoder?: unknown }).VideoDecoder !== 'undefined';
}

function baseName(name: string): string {
  return (name || 'video').replace(/\.[^.]+$/, '');
}

// Оценивает исходный видеобитрейт (бит/с) максимально дёшево:
// сначала пробуем метаданные, и только при их отсутствии считаем по пакетам.
async function estimateVideoBitrate(
  videoTrack: Awaited<ReturnType<Input['getPrimaryVideoTrack']>>,
  file: File,
  durationSec: number | null,
): Promise<number | null> {
  if (!videoTrack) return null;
  const fromMeta = (await videoTrack.getAverageBitrate()) || (await videoTrack.getBitrate());
  if (fromMeta && Number.isFinite(fromMeta) && fromMeta > 0) return fromMeta;

  if (durationSec && durationSec > 0) {
    // Грубая оценка по всему файлу (включает аудио — это нормально для цели).
    return (file.size * 8) / durationSec;
  }

  try {
    const stats = await videoTrack.computePacketStats(120);
    if (stats && stats.averageBitrate > 0) return stats.averageBitrate;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Сжимает один видеофайл примерно на 30%, сохраняя разрешение и качество,
 * используя аппаратный кодек устройства (WebCodecs через mediabunny).
 *
 * Возвращает сжатый File (mp4) либо ИСХОДНЫЙ файл, если сжатие не нужно или
 * не дало выигрыша. Никогда не выбрасывает исключение наружу — при любой
 * проблеме отправляется оригинал, чтобы ҳисобот всё равно ушёл.
 */
export async function compressVideo(file: File, { onProgress, onPhase }: CompressCallbacks = {}): Promise<File> {
  // 1. Мелкие файлы и неподдерживаемые среды — без обработки.
  if (!file || file.size < MIN_SIZE_TO_COMPRESS || !isHardwareCompressionSupported()) {
    return file;
  }

  try {
    if (onPhase) onPhase('Видео таҳлил қилинмоқда...');

    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return file; // нет видеодорожки — отправляем как есть

    const duration = await input.computeDuration().catch(() => null);
    const srcBitrate = await estimateVideoBitrate(videoTrack, file, duration);

    // Не можем оценить битрейт — не рискуем, отправляем оригинал.
    if (!srcBitrate || srcBitrate <= 0) return file;

    const targetBitrate = Math.max(
      Math.round(srcBitrate * TARGET_BITRATE_RATIO),
      MIN_VIDEO_BITRATE,
    );

    // Целевой битрейт не ниже исходного — сжимать нечего.
    if (targetBitrate >= srcBitrate) return file;

    // 2. Готовим конвертацию: тот же контейнер mp4, H.264 (avc) с аппаратным
    //    ускорением. Разрешение НЕ меняем (width/height не задаём). Аудио по
    //    умолчанию копируется без перекодирования, если совместимо.
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({
      input,
      output,
      video: {
        codec: 'avc',
        bitrate: targetBitrate,
        hardwareAcceleration: 'prefer-hardware',
      },
    });

    // Если конвертация невалидна (видеодорожку нельзя закодировать в этой
    // среде) — откатываемся на оригинал.
    if (!conversion.isValid) return file;

    if (onProgress) onProgress(0);
    conversion.onProgress = (p: number) => {
      if (onProgress) onProgress(Math.max(0, Math.min(100, Math.round(p * 100))));
    };

    if (onPhase) onPhase('Видео сиқилмоқда...');
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0) return file;

    // Если «сжатый» файл не меньше оригинала — оригинал лучше.
    if (buffer.byteLength >= file.size) return file;

    if (onProgress) onProgress(100);
    const outName = `${baseName(file.name)}_compressed.mp4`;
    return new File([buffer], outName, { type: 'video/mp4', lastModified: Date.now() });
  } catch (err) {
    // Любая ошибка обработки не должна срывать отправку ҳисобот.
    console.log('[v0] video compression failed, sending original:', err instanceof Error ? err.message : err);
    return file;
  }
}
