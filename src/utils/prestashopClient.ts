import { jsonToXml, xmlToJson } from "./xml";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

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

export function getEnv(name: "VITE_BASE_URL" | "VITE_API_KEY"): string {
  const value = import.meta.env[name] as string | undefined;

  if (!value) {
    throw new Error(`Variable ${name} manquante dans le .env`);
  }

  return value;
}

export function getEnvOptional(name: "VITE_BASE_URL_FULL" | "VITE_API_KEY"): string {
  const value = import.meta.env[name] as string | undefined;

  return value?.trim() || "";
}

/**
 * Construit une URL image via le proxy Vite
 */
export function buildPrestashopProductImageUrl(
  productId: number,
  imageId?: number,
): string {
  const baseUrl = getEnvOptional("VITE_BASE_URL_FULL").replace(/\/$/, "");
  const apiKey = getEnvOptional("VITE_API_KEY");

  const fallbackBaseUrl = getEnv("VITE_BASE_URL").replace(/\/$/, "");
  const resolvedBaseUrl = baseUrl ? `${baseUrl}/api` : `${window.location.origin}${fallbackBaseUrl}`;

  const imagePath = imageId
    ? `/images/products/${productId}/${imageId}`
    : `/images/products/${productId}`;
  const query = apiKey ? `?ws_key=${encodeURIComponent(apiKey)}` : "";

  return `${resolvedBaseUrl}${imagePath}${query}`;
}

/**
 * Construit l'URL finale via le proxy /api
 */
function buildApiUrl(
  resourcePath: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const baseUrl = getEnv("VITE_BASE_URL").replace(/\/$/, "");

  const cleanPath = resourcePath.startsWith("/")
    ? resourcePath
    : `/${resourcePath}`;

  const searchParams = new URLSearchParams();

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;

      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();

  return `${baseUrl}${cleanPath}${qs ? `?${qs}` : ""}`;
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
  const method = opts.method ?? "GET";

  const fullUrl = buildApiUrl(resourcePath, opts.query);

  const bodyXml = opts.bodyXml?.replace(/^<\?xml[^>]*\?>\s*/i, "");

  if (bodyXml) {
    console.log(
      `\n===== XML OUT ${method} ${resourcePath} =====\n${bodyXml}\n===== END XML OUT =====\n`,
    );
  }

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        Accept: "application/xml",
        ...(bodyXml
          ? {
              "Content-Type": "application/xml",
            }
          : {}),
      },
      body: bodyXml,
      signal: opts.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      
      // Fallback: certains endpoints n'acceptent pas DELETE directement (405).
      // Pour les DELETE réessayons avec un POST + X-HTTP-Method-Override: DELETE
      if (response.status === 405 && method === "DELETE") {
        try {
          const overrideHeaders: Record<string, string> = {
            Accept: "application/xml",
            "X-HTTP-Method-Override": "DELETE",
          };
          if (bodyXml) overrideHeaders["Content-Type"] = "application/xml";

          const overrideResp = await fetch(fullUrl, {
            method: "POST",
            headers: overrideHeaders,
            body: bodyXml,
            signal: opts.signal,
          });
          const overrideText = await overrideResp.text();
          if (!overrideResp.ok) {
            throw new PrestashopWebserviceError(
              `Erreur PrestaShop (override ${overrideResp.status})`,
              overrideResp.status,
              overrideText,
            );
          }
          if (!overrideText.trim()) return {} as T;
          return xmlToJson<T>(overrideText);
        } catch (err) {
          if (err instanceof PrestashopWebserviceError) throw err;
          // tomberthrough vers l'erreur d'origine
        }
      }

      throw new PrestashopWebserviceError(
        `Erreur PrestaShop (${response.status})`,
        response.status,
        text,
      );
    }

    if (!text.trim()) {
      return {} as T;
    }

    return xmlToJson<T>(text);
  } catch (error: any) {
    if (error instanceof PrestashopWebserviceError) {
      throw error;
    }

    console.error("[Prestashop Client Error]", error);

    throw new PrestashopWebserviceError(
      error.message || "Erreur réseau",
      0,
      error.message,
    );
  }
}

export function buildPrestashopXml(payload: unknown): string {
  return jsonToXml(payload);
}