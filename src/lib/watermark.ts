import type { WatermarkSettings } from "@/components/AddWatermarkOptions";
import type { ProgressState } from "@/components/ProcessingProgress";

function getCoords(
  position: string,
  canvasW: number,
  canvasH: number,
  wmW: number,
  wmH: number,
  pad = 20
): [number, number] {
  switch (position) {
    case "top-left":
      return [pad, pad + wmH];
    case "top-right":
      return [canvasW - wmW - pad, pad + wmH];
    case "center":
      return [(canvasW - wmW) / 2, (canvasH + wmH) / 2];
    case "bottom-left":
      return [pad, canvasH - pad];
    case "bottom-right":
      return [canvasW - wmW - pad, canvasH - pad];
    default:
      return [(canvasW - wmW) / 2, (canvasH + wmH) / 2];
  }
}

type OnProgress = (state: ProgressState) => void;

function uploadWithProgress(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  onProgress?: OnProgress
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ stage: "uploading", percent: Math.round((e.loaded / e.total) * 100) });
      }
    });

    xhr.upload.addEventListener("load", () => {
      onProgress?.({ stage: "processing", percent: 0 });
    });

    xhr.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ stage: "downloading", percent: Math.round((e.loaded / e.total) * 100) });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
      } else {
        // Try to parse error from response
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const err = JSON.parse(reader.result as string);
            reject(new Error(err.error || `Processing failed (${xhr.status})`));
          } catch {
            reject(new Error(`Processing failed (${xhr.status})`));
          }
        };
        reader.onerror = () => reject(new Error(`Processing failed (${xhr.status})`));
        reader.readAsText(xhr.response as Blob);
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", url);
    xhr.responseType = "blob";
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.send(formData);
  });
}

export async function addWatermark(
  file: File,
  settings: WatermarkSettings,
  onProgress?: OnProgress
): Promise<Blob> {
  const isVideo = file.type.startsWith("video");

  if (isVideo) {
    return addVideoWatermark(file, settings, onProgress);
  }

  // Image processing is instant, no progress needed
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      ctx.globalAlpha = settings.opacity;

      if (settings.type === "image" && settings.image) {
        const wmImg = new Image();
        wmImg.onload = () => {
          const ratio = wmImg.width / wmImg.height;
          const wmH = settings.size;
          const wmW = wmH * ratio;
          const [x, y] = getCoords(settings.position, canvas.width, canvas.height, wmW, wmH);
          ctx.drawImage(wmImg, x, y - wmH, wmW, wmH);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas export failed")), "image/png");
        };
        wmImg.onerror = () => reject(new Error("Failed to load watermark image"));
        wmImg.src = URL.createObjectURL(settings.image);
      } else if (settings.type === "text" && settings.text) {
        ctx.font = `${settings.size}px ${settings.font}`;
        ctx.fillStyle = settings.color;
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 2;
        const metrics = ctx.measureText(settings.text);
        const wmW = metrics.width;
        const wmH = settings.size;
        const [x, y] = getCoords(settings.position, canvas.width, canvas.height, wmW, wmH);
        ctx.strokeText(settings.text, x, y);
        ctx.fillText(settings.text, x, y);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas export failed")), "image/png");
      } else {
        reject(new Error("No watermark text or image provided"));
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

async function addVideoWatermark(
  file: File,
  settings: WatermarkSettings,
  onProgress?: OnProgress
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("watermarkType", settings.type);
  formData.append("position", settings.position);
  formData.append("opacity", Math.round(settings.opacity * 100).toString());
  formData.append("size", settings.size.toString());
  formData.append("color", settings.color);
  formData.append("font", settings.font);

  if (settings.type === "text" && settings.text) {
    formData.append("text", settings.text);
  } else if (settings.type === "image" && settings.image) {
    formData.append("watermarkImage", settings.image);
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  onProgress?.({ stage: "uploading", percent: 0 });

  return uploadWithProgress(
    `${supabaseUrl}/functions/v1/add-video-watermark`,
    formData,
    { apikey: supabaseKey },
    onProgress
  );
}

export async function removeWatermark(
  file: File,
  onProgress?: OnProgress
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  onProgress?.({ stage: "uploading", percent: 0 });

  return uploadWithProgress(
    `${supabaseUrl}/functions/v1/remove-watermark`,
    formData,
    { apikey: supabaseKey },
    onProgress
  );
}
