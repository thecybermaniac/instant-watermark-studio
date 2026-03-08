import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [showResult, setShowResult] = useState(false);
  const [resultIsVideo, setResultIsVideo] = useState(false);
  const defaultSettings: WatermarkSettings = {
    text: "",
    image: null,
    type: "text",
    position: "bottom-right",
    opacity: 0.5,
    size: 48,
    color: "#ffffff",
    font: "sans-serif",
  };
  const [settings, setSettings] = useState<WatermarkSettings>(defaultSettings);

  const canProcess =
    file &&
    !processing &&
    (mode === "remove" || (settings.type === "text" && settings.text) || (settings.type === "image" && settings.image));

  const isVideo = file?.type.startsWith("video");

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    try {
      let blob: Blob;
      if (mode === "add") {
        if (isVideo) {
          throw new Error("Video watermark addition is not yet supported. Use image files for now.");
        }
        blob = await addWatermark(file, settings);
      } else {
        // Both image and video removal go through Cloudinary
        blob = await removeWatermark(file);
      }
      setResult(URL.createObjectURL(blob));
      setResultIsVideo(isVideo || false);
      setShowResult(true);
      setFile(null);
      setSettings(defaultSettings);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-3">
          <Droplets className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">AI Watermark Tool</h1>
            <p className="text-xs text-muted-foreground">Add or remove watermarks from images and videos instantly</p>
          </div>
        </div>
      </header>

      {/* Main - Horizontal Layout */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6 min-h-0">
        {/* Left: Upload */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 min-h-0">
          <FileUploader file={file} onFileSelect={(f) => { setFile(f); setResult(null); }} />
        </div>

        {/* Right: Options + Process */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 min-h-0 overflow-y-auto px-1">
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
        </div>
      </main>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Result Preview</DialogTitle>
            <DialogDescription>Your processed {resultIsVideo ? "video" : "image"} is ready to download.</DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              {resultIsVideo ? (
                <video src={result} controls className="rounded-md w-full max-h-[60vh] bg-muted" />
              ) : (
                <img src={result} alt="Result" className="rounded-md w-full max-h-[60vh] object-contain bg-muted" />
              )}
              <Button variant="outline" className="w-full" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
