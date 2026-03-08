import { Wand2 } from "lucide-react";

export default function RemoveWatermarkOptions() {
  return (
    <div className="rounded-lg border border-border bg-accent/30 p-6 text-center space-y-3">
      <Wand2 className="mx-auto h-10 w-10 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">AI Watermark Removal</h3>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
        Our AI automatically detects and removes watermarks from your images.
        Upload your file and click Process — the AI handles the rest.
      </p>
    </div>
  );
}
