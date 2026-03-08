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

/**
 * Client-side watermark removal using frequency-domain inspired approach.
 * Uses multiple canvas passes to suppress semi-transparent overlays (typical watermarks).
 * For production-grade AI removal, integrate an inpainting API.
 */
export async function removeWatermark(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // Pass 1: Draw original
      ctx.drawImage(img, 0, 0);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Analyze image to find potential watermark pixels
      // Watermarks are typically semi-transparent overlays with uniform color
      // We detect pixels that deviate from local neighborhood averages
      const kernelSize = 3;
      const half = Math.floor(kernelSize / 2);
      const output = new Uint8ClampedArray(data.length);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Calculate local average (excluding center pixel)
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              if (kx === 0 && ky === 0) continue;
              const nx = x + kx, ny = y + ky;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                rSum += data[nIdx];
                gSum += data[nIdx + 1];
                bSum += data[nIdx + 2];
                count++;
              }
            }
          }

          if (count > 0) {
            const avgR = rSum / count;
            const avgG = gSum / count;
            const avgB = bSum / count;

            // Check if pixel deviates significantly (potential watermark)
            const diffR = Math.abs(data[idx] - avgR);
            const diffG = Math.abs(data[idx + 1] - avgG);
            const diffB = Math.abs(data[idx + 2] - avgB);
            const totalDiff = diffR + diffG + diffB;

            // Watermark pixels tend to be brighter/lighter than surroundings
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const avgBrightness = (avgR + avgG + avgB) / 3;
            const brightnessDiff = brightness - avgBrightness;

            // Blend toward local average for suspected watermark pixels
            if (totalDiff > 15 && brightnessDiff > 5) {
              const blendFactor = Math.min(0.8, totalDiff / 100);
              output[idx] = Math.round(data[idx] * (1 - blendFactor) + avgR * blendFactor);
              output[idx + 1] = Math.round(data[idx + 1] * (1 - blendFactor) + avgG * blendFactor);
              output[idx + 2] = Math.round(data[idx + 2] * (1 - blendFactor) + avgB * blendFactor);
            } else {
              output[idx] = data[idx];
              output[idx + 1] = data[idx + 1];
              output[idx + 2] = data[idx + 2];
            }
          } else {
            output[idx] = data[idx];
            output[idx + 1] = data[idx + 1];
            output[idx + 2] = data[idx + 2];
          }
          output[idx + 3] = data[idx + 3]; // alpha
        }
      }

      // Apply processed data
      const resultData = new ImageData(output, width, height);
      ctx.putImageData(resultData, 0, 0);

      // Second smoothing pass to reduce artifacts
      const smoothCanvas = document.createElement("canvas");
      smoothCanvas.width = width;
      smoothCanvas.height = height;
      const smoothCtx = smoothCanvas.getContext("2d")!;
      
      // Slight blur to smooth edges
      smoothCtx.filter = "blur(0.5px)";
      smoothCtx.drawImage(canvas, 0, 0);
      smoothCtx.filter = "none";
      
      // Blend with sharpened original for detail preservation
      smoothCtx.globalAlpha = 0.4;
      smoothCtx.globalCompositeOperation = "source-over";
      smoothCtx.drawImage(canvas, 0, 0);

      smoothCanvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Export failed")),
        "image/png"
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
