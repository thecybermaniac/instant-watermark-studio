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
    if (!file) {
      throw new Error("No file provided");
    }

    const isVideo = file.type.startsWith("video");
    const resourceType = isVideo ? "video" : "image";

    // Step 1: Upload to Cloudinary
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = `timestamp=${timestamp}`;
    const signature = await createSignature(paramsToSign, API_SECRET);

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", API_KEY);
    uploadForm.append("timestamp", timestamp);
    uploadForm.append("signature", signature);

    // For videos, set eager transformations and use notification_url for async processing
    if (isVideo) {
      // Add eager transformation for video watermark removal
      const eagerParams = "e_gen_remove:prompt_watermark";
      uploadForm.append("eager", eagerParams);
      uploadForm.append("eager_async", "false"); // wait for transformation
    }

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      { method: "POST", body: uploadForm }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      throw new Error(`Cloudinary upload failed [${uploadRes.status}]: ${errBody}`);
    }

    const uploadData = await uploadRes.json();
    const publicId = uploadData.public_id;
    const format = uploadData.format || (isVideo ? "mp4" : "png");

    // Step 2: Build processed URL
    let finalUrl: string;

    if (isVideo) {
      // Check if eager transformation succeeded
      if (uploadData.eager && uploadData.eager.length > 0 && uploadData.eager[0].secure_url) {
        finalUrl = uploadData.eager[0].secure_url;
      } else {
        // Fallback: apply video enhancement transformations
        finalUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/e_improve,e_sharpen:100/${publicId}.${format}`;
      }
    } else {
      // Image: try gen_remove, fallback to enhance
      const processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_gen_remove:prompt_watermark/${publicId}.${format}`;
      const checkRes = await fetch(processedUrl, { method: "HEAD" });
      finalUrl = checkRes.ok
        ? processedUrl
        : `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_improve,e_sharpen:100/${publicId}.${format}`;
    }

    // Step 3: Fetch the processed file
    const mediaRes = await fetch(finalUrl);
    if (!mediaRes.ok) {
      throw new Error(`Failed to fetch processed ${resourceType} [${mediaRes.status}]`);
    }

    const mediaBlob = await mediaRes.blob();
    const arrayBuffer = await mediaBlob.arrayBuffer();

    // Step 4: Cleanup - delete from Cloudinary
    const deleteTimestamp = Math.floor(Date.now() / 1000).toString();
    const deleteParamsToSign = `public_id=${publicId}&timestamp=${deleteTimestamp}`;
    const deleteSignature = await createSignature(deleteParamsToSign, API_SECRET);

    fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_id: publicId,
        api_key: API_KEY,
        timestamp: deleteTimestamp,
        signature: deleteSignature,
      }),
    }).catch((e) => console.error("Cleanup failed:", e));

    const contentType = isVideo ? (mediaBlob.type || "video/mp4") : (mediaBlob.type || "image/png");
    const filename = isVideo ? `processed.${format}` : `processed.${format}`;

    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error processing media:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
