import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useRef } from "react";
import { Upload, Type, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WatermarkSettings {
  text: string;
  image: File | null;
  type: "text" | "image";
  position: string;
  opacity: number;
  size: number;
  color: string;
  font: string;
}

const POSITIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "center", label: "Center" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

const FONTS = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Impact', sans-serif", label: "Impact" },
];

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface Props {
  settings: WatermarkSettings;
  onChange: (s: WatermarkSettings) => void;
}

export default function AddWatermarkOptions({ settings, onChange }: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Type Radio Cards */}
      <div className="space-y-2">
        <Label>Watermark Type</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChange({ ...settings, type: "text" })}
            className={cn(
              "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all",
              settings.type === "text"
                ? "border-primary bg-accent shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <Type className={cn("h-5 w-5 shrink-0", settings.type === "text" ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium text-foreground">Text</p>
              <p className="text-xs text-muted-foreground">Custom text watermark</p>
            </div>
          </button>
          <button
            onClick={() => onChange({ ...settings, type: "image" })}
            className={cn(
              "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all",
              settings.type === "image"
                ? "border-primary bg-accent shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <ImageIcon className={cn("h-5 w-5 shrink-0", settings.type === "image" ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium text-foreground">Image</p>
              <p className="text-xs text-muted-foreground">Logo or image overlay</p>
            </div>
          </button>
        </div>
      </div>

      {/* Text Watermark Options */}
      {settings.type === "text" && (
        <>
          <div className="space-y-2">
            <Label>Watermark Text</Label>
            <Input
              placeholder="Enter watermark text..."
              value={settings.text}
              onChange={(e) => onChange({ ...settings, text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Font</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => onChange({ ...settings, font: f.value })}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs transition-colors",
                    settings.font === f.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  )}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ ...settings, color: c })}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    settings.color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={settings.color}
                onChange={(e) => onChange({ ...settings, color: e.target.value })}
                className="h-7 w-7 rounded-full cursor-pointer border border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Font Size: {settings.size}px</Label>
            <Slider
              value={[settings.size]}
              onValueChange={([v]) => onChange({ ...settings, size: v })}
              min={12}
              max={200}
              step={4}
            />
          </div>

          {/* Live Preview */}
          {settings.text && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-md border border-border bg-muted/50 p-4 flex items-center justify-center min-h-[60px] overflow-hidden">
                <span
                  style={{
                    fontFamily: settings.font,
                    fontSize: `${Math.min(settings.size, 64)}px`,
                    color: settings.color,
                    opacity: settings.opacity,
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                  className="truncate max-w-full"
                >
                  {settings.text}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Image Watermark Options */}
      {settings.type === "image" && (
        <div className="space-y-2">
          <Label>Upload Watermark Image</Label>
          <div
            onClick={() => imgInputRef.current?.click()}
            className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <Upload className="h-4 w-4" />
            {settings.image ? settings.image.name : "Choose image..."}
          </div>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              onChange({ ...settings, image: f });
            }}
          />
        </div>
      )}

      {/* Shared Options */}
      <div className="space-y-2">
        <Label>Position</Label>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ ...settings, position: p.value })}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                settings.position === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Opacity: {Math.round(settings.opacity * 100)}%</Label>
        <Slider
          value={[settings.opacity]}
          onValueChange={([v]) => onChange({ ...settings, opacity: v })}
          min={0.05}
          max={1}
          step={0.05}
        />
      </div>

      {settings.type === "image" && (
        <div className="space-y-2">
          <Label>Size: {settings.size}px</Label>
          <Slider
            value={[settings.size]}
            onValueChange={([v]) => onChange({ ...settings, size: v })}
            min={12}
            max={200}
            step={4}
          />
        </div>
      )}
    </div>
  );
}
