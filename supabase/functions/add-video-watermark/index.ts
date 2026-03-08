import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createSignature(params: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(params + apiSecret);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      throw new Error("Cloudinary credentials not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const watermarkType = formData.get("watermarkType") as string; // "text" or "image"
    const text = formData.get("text") as string | null;
    const position = formData.get("position") as string || "bottom-right";
    const opacity = parseInt(formData.get("opacity") as string || "50", 10);
    const size = parseInt(formData.get("size") as string || "48", 10);
    const color = (formData.get("color") as string || "#ffffff").replace("#", "");
    const font = formData.get("font") as string || "Arial";
    const watermarkImage = formData.get("watermarkImage") as File | null;

    if (!file) {
      throw new Error("No video file provided");
    }

    // Map position to Cloudinary gravity
    const gravityMap: Record<string, string> = {
      "top-left": "north_west",
      "top-right": "north_east",
      "center": "center",
      "bottom-left": "south_west",
      "bottom-right": "south_east",
    };
    const gravity = gravityMap[position] || "south_east";

    // Map font to Cloudinary font family
    const fontMap: Record<string, string> = {
      "sans-serif": "Arial",
      "serif": "Times New Roman",
      "monospace": "Courier New",
      "'Georgia', serif": "Georgia",
      "'Courier New', monospace": "Courier New",
      "'Impact', sans-serif": "Impact",
    };
    const cloudinaryFont = fontMap[font] || "Arial";

    // Step 1: Upload video to Cloudinary
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = `timestamp=${timestamp}`;
    const signature = await createSignature(paramsToSign, API_SECRET);

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", API_KEY);
    uploadForm.append("timestamp", timestamp);
    uploadForm.append("signature", signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: "POST", body: uploadForm }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      throw new Error(`Cloudinary upload failed [${uploadRes.status}]: ${errBody}`);
    }

    const uploadData = await uploadRes.json();
    const publicId = uploadData.public_id;
    const format = uploadData.format || "mp4";

    let overlayPublicId: string | null = null;

    // Step 2: Build transformation URL
    let transformation: string;

    if (watermarkType === "image" && watermarkImage) {
      // Upload watermark image first
      const wmTimestamp = Math.floor(Date.now() / 1000).toString();
      const wmParamsToSign = `timestamp=${wmTimestamp}`;
      const wmSignature = await createSignature(wmParamsToSign, API_SECRET);

      const wmForm = new FormData();
      wmForm.append("file", watermarkImage);
      wmForm.append("api_key", API_KEY);
      wmForm.append("timestamp", wmTimestamp);
      wmForm.append("signature", wmSignature);

      const wmUploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: wmForm }
      );

      if (!wmUploadRes.ok) {
        throw new Error("Failed to upload watermark image");
      }

      const wmData = await wmUploadRes.json();
      overlayPublicId = wmData.public_id;

      // Image overlay: l_<public_id>,w_<size>,o_<opacity>,g_<gravity>
      const encodedId = overlayPublicId!.replace(/\//g, ":");
      transformation = `l_${encodedId},h_${size},o_${opacity},g_${gravity},x_20,y_20`;
    } else if (watermarkType === "text" && text) {
      // Text overlay: l_text:<font>_<size>:<text>,co_rgb:<color>,o_<opacity>,g_<gravity>
      const encodedText = encodeURIComponent(text).replace(/%20/g, "%20");
      transformation = `l_text:${cloudinaryFont}_${size}:${encodedText},co_rgb:${color},o_${opacity},g_${gravity},x_20,y_20`;
    } else {
      throw new Error("No watermark text or image provided");
    }

    const finalUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transformation}/${publicId}.${format}`;

    // Step 3: Fetch the processed video
    const mediaRes = await fetch(finalUrl);
    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      console.error("Cloudinary transform error:", errText);
      throw new Error(`Failed to fetch processed video [${mediaRes.status}]`);
    }

    const mediaBlob = await mediaRes.blob();
    const arrayBuffer = await mediaBlob.arrayBuffer();

    // Step 4: Cleanup - delete uploaded assets from Cloudinary
    const cleanup = async (pid: string, type: string) => {
      const ts = Math.floor(Date.now() / 1000).toString();
      const ps = `public_id=${pid}&timestamp=${ts}`;
      const sig = await createSignature(ps, API_SECRET);
      fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: pid, api_key: API_KEY, timestamp: ts, signature: sig }),
      }).catch((e) => console.error("Cleanup failed:", e));
    };

    cleanup(publicId, "video");
    if (overlayPublicId) cleanup(overlayPublicId, "image");

    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": mediaBlob.type || "video/mp4",
        "Content-Disposition": `attachment; filename="watermarked.${format}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error processing video:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
