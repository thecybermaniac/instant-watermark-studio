import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Step 1: Upload image to Cloudinary
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("upload_preset", "ml_default"); // unsigned preset fallback
    uploadForm.append("api_key", API_KEY);

    // Generate signature for authenticated upload
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = `timestamp=${timestamp}`;

    // Create SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + API_SECRET);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const authUploadForm = new FormData();
    authUploadForm.append("file", file);
    authUploadForm.append("api_key", API_KEY);
    authUploadForm.append("timestamp", timestamp);
    authUploadForm.append("signature", signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: authUploadForm }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      throw new Error(`Cloudinary upload failed [${uploadRes.status}]: ${errBody}`);
    }

    const uploadData = await uploadRes.json();
    const publicId = uploadData.public_id;

    // Step 2: Generate URL with content-aware fill to remove watermarks
    // Using Cloudinary's gen_remove effect for AI-powered removal
    // Fallback: use e_improve + e_sharpen for enhancement-based approach
    const processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_gen_remove:prompt_watermark/${publicId}.${uploadData.format || "png"}`;

    // Verify the processed URL works
    const checkRes = await fetch(processedUrl, { method: "HEAD" });
    
    let finalUrl: string;
    if (checkRes.ok) {
      finalUrl = processedUrl;
    } else {
      // Fallback: use enhance + sharpen transformations
      finalUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_improve,e_sharpen:100/${publicId}.${uploadData.format || "png"}`;
    }

    // Step 3: Fetch the processed image and return it
    const imageRes = await fetch(finalUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch processed image [${imageRes.status}]`);
    }

    const imageBlob = await imageRes.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();

    // Step 4: Delete the uploaded image from Cloudinary (no permanent storage)
    const deleteTimestamp = Math.floor(Date.now() / 1000).toString();
    const deleteParamsToSign = `public_id=${publicId}&timestamp=${deleteTimestamp}`;
    const deleteData = encoder.encode(deleteParamsToSign + API_SECRET);
    const deleteHashBuffer = await crypto.subtle.digest("SHA-1", deleteData);
    const deleteHashArray = Array.from(new Uint8Array(deleteHashBuffer));
    const deleteSignature = deleteHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Fire and forget the delete
    fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_id: publicId,
        api_key: API_KEY,
        timestamp: deleteTimestamp,
        signature: deleteSignature,
      }),
    }).catch((e) => console.error("Cleanup failed:", e));

    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": imageBlob.type || "image/png",
        "Content-Disposition": `attachment; filename="processed.png"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error processing image:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
