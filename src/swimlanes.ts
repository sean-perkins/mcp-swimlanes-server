import { fetch } from "undici";

const BASE_URL = "https://api.swimlanes.io/v1";

export interface ImageRequestBody {
  text: string;
  high_resolution?: boolean;
}

export async function generateDiagramLink(text: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok && response.status !== 201) {
    const body = await safeText(response);
    throw new Error(
      `Failed to generate diagram link (${response.status}): ${body}`
    );
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Missing Location header in response");
  }
  return location;
}

export async function generateImageLink(
  body: ImageRequestBody
): Promise<string> {
  const response = await fetch(`${BASE_URL}/image-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 201) {
    const text = await safeText(response);
    throw new Error(
      `Failed to generate image link (${response.status}): ${text}`
    );
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Missing Location header in response");
  }
  return location;
}

export async function downloadImage(
  body: ImageRequestBody
): Promise<Uint8Array> {
  // This endpoint responds with a 303 and Location pointing to the PNG
  const response = await fetch(`${BASE_URL}/image`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 303) {
    const text = await safeText(response);
    throw new Error(
      `Unexpected status from /image (${response.status}): ${text}`
    );
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Missing Location header in image redirect");
  }

  const imgResponse = await fetch(location);
  if (!imgResponse.ok) {
    const text = await safeText(imgResponse);
    throw new Error(
      `Failed to download image (${imgResponse.status}): ${text}`
    );
  }

  const buffer = new Uint8Array(await imgResponse.arrayBuffer());
  return buffer;
}

async function safeText(res: any): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
