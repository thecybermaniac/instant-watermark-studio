import type { WatermarkSettings } from "@/components/AddWatermarkOptions";

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

export async function addWatermark(
  file: File,
  settings: WatermarkSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      ctx.globalAlpha = settings.opacity;

      if (settings.image) {
        // Image watermark
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
      } else if (settings.text) {
        // Text watermark
        ctx.font = `${settings.size}px sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
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

export async function removeWatermark(file: File): Promise<Blob> {
  // Client-side demo: applies a slight blur to simulate removal
  // For production, integrate Cloudinary AI or an inpainting API
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = "blur(0.5px)";
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      // Second pass for sharpness
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Export failed")), "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
