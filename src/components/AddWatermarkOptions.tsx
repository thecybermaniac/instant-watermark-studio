import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useRef } from "react";
import { Upload } from "lucide-react";

export interface WatermarkSettings {
  text: string;
  image: File | null;
  position: string;
  opacity: number;
  size: number;
}

const POSITIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "center", label: "Center" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

interface Props {
  settings: WatermarkSettings;
  onChange: (s: WatermarkSettings) => void;
}

export default function AddWatermarkOptions({ settings, onChange }: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Text Watermark</Label>
        <Input
          placeholder="Enter watermark text..."
          value={settings.text}
          onChange={(e) => onChange({ ...settings, text: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Or Upload Watermark Image</Label>
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
            onChange({ ...settings, image: f, text: f ? "" : settings.text });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Position</Label>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ ...settings, position: p.value })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                settings.position === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
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
    </div>
  );
}
