import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Droplets, Download, Loader2 } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import AddWatermarkOptions, { type WatermarkSettings } from "@/components/AddWatermarkOptions";
import RemoveWatermarkOptions from "@/components/RemoveWatermarkOptions";
import { addWatermark, removeWatermark } from "@/lib/watermark";

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>({
    text: "",
    image: null,
    position: "bottom-right",
    opacity: 0.5,
    size: 48,
  });

  const canProcess =
    file &&
    !processing &&
    (mode === "remove" || settings.text || settings.image);

  const isVideo = file?.type.startsWith("video");

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    try {
      if (isVideo) {
        // Video processing would require a backend API
        throw new Error("Video processing requires a cloud API (e.g. Cloudinary). Connect your API key to enable this feature.");
      }
      const blob =
        mode === "add"
          ? await addWatermark(file, settings)
          : await removeWatermark(file);
      setResult(URL.createObjectURL(blob));
    } catch (err: any) {
      alert(err.message || "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `watermarked-${file?.name || "output.png"}`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-5 flex items-center gap-3">
          <Droplets className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">AI Watermark Tool</h1>
            <p className="text-xs text-muted-foreground">Add or remove watermarks from images and videos instantly</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Upload */}
        <FileUploader file={file} onFileSelect={(f) => { setFile(f); setResult(null); }} />

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => { setMode(v as "add" | "remove"); setResult(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="add" className="flex-1">Add Watermark</TabsTrigger>
            <TabsTrigger value="remove" className="flex-1">Remove Watermark</TabsTrigger>
          </TabsList>
          <TabsContent value="add">
            <AddWatermarkOptions settings={settings} onChange={setSettings} />
          </TabsContent>
          <TabsContent value="remove">
            <RemoveWatermarkOptions />
          </TabsContent>
        </Tabs>

        {/* Process */}
        <Button
          className="w-full"
          size="lg"
          disabled={!canProcess}
          onClick={handleProcess}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            "Process"
          )}
        </Button>

        {/* Result */}
        {result && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">Result Preview</p>
            <img src={result} alt="Result" className="rounded-md w-full max-h-96 object-contain bg-muted" />
            <Button variant="outline" className="w-full" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
