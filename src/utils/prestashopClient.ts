import { jsonToXml, xmlToJson } from "./xml";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class PrestashopWebserviceError extends Error {
  status: number;
  responseText?: string;

  constructor(message: string, status: number, responseText?: string) {
    super(message);
    this.name = "PrestashopWebserviceError";
    this.status = status;
    this.responseText = responseText;
  }
}

function getEnv(name: "VITE_BASE_URL" | "VITE_API_KEY"): string {
  const value = (import.meta as any).env?.[name] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env (Vite variables must be prefixed with VITE_).`,
    );
  }
  return value;
}

export function buildPrestashopProductImageUrl(productId: number, imageId?: number): string {
  const baseUrl = getEnv("VITE_BASE_URL").replace(/\/$/, "");
  const apiKey = getEnv("VITE_API_KEY");
  const imagePath = imageId ? `/images/products/${productId}/${imageId}` : `/images/products/${productId}`;
  return `${baseUrl}${imagePath}?ws_key=${encodeURIComponent(apiKey)}`;
}

function basicAuthHeader(apiKey: string): string {
  // PrestaShop webservice: ws_key as username, empty password
  return `Basic ${btoa(`${apiKey}:`)}`;
}

export async function requestPrestashopXml<T>(
  resourcePath: string,
  opts: {
    method?: HttpMethod;
    query?: Record<string, string | number | boolean | undefined>;
    bodyXml?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const baseUrl = getEnv("VITE_BASE_URL").replace(/\/$/, "");
  const apiKey = getEnv("VITE_API_KEY");
  const method = opts.method ?? "GET";

  // On construit l'URL manuellement au lieu d'utiliser new URL()
  let fullUrl = `${baseUrl}${resourcePath.startsWith("/") ? "" : "/"}${resourcePath}`;

  if (opts.query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.query)) {
      if (value === undefined) continue;
      searchParams.set(key, String(value));
    }
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
  }
  // ----------------------

  if (opts.bodyXml) {
    console.log(`\n===== PrestaShop XML OUT ${method} ${resourcePath} =====\n${opts.bodyXml}\n===== /PrestaShop XML OUT ${method} ${resourcePath} =====\n`);
  }

  const bodyXml = opts.bodyXml?.replace(/^<\?xml[^>]*\?>\s*/i, "");

  const res = await fetch(fullUrl, { // On passe la string directement
    method,
    headers: {
      Authorization: basicAuthHeader(apiKey),
      Accept: "application/xml",
      ...(bodyXml ? { "Content-Type": "application/xml" } : null),
    },
    body: bodyXml,
    signal: opts.signal,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`PrestaShop response body for ${method} ${resourcePath}:`, text);
    throw new PrestashopWebserviceError(
      `PrestaShop Webservice error (${res.status})`,
      res.status,
      text,
    );
  }

  return xmlToJson<T>(text);
}

export function buildPrestashopXml(payload: unknown): string {
  return jsonToXml(payload);
}
