/**
 * Generates a simple PNG placeholder for demo/sample observations.
 * Browser-only — uses canvas.
 */
export async function createSamplePlaceholderImageBlob(
  caption: string,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Placeholder images can only be generated in the browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 450;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#e2e8f0");
  gradient.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Sample Photo", canvas.width / 2, canvas.height / 2 - 28);

  ctx.fillStyle = "#64748b";
  ctx.font = "16px system-ui, sans-serif";
  wrapCanvasText(ctx, caption, canvas.width / 2, canvas.height / 2 + 8, 680, 22);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Fictional demo image — replace with site photos", canvas.width / 2, canvas.height - 48);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create placeholder image."));
      },
      "image/png",
      0.92,
    );
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((lineText, index) => {
    ctx.fillText(lineText, x, startY + index * lineHeight);
  });
}
