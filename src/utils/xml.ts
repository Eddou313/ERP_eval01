import { XMLBuilder, XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  trimValues: true,
});

export function xmlToJson<T = unknown>(xml: string): T {
  return parser.parse(xml) as T;
}

export function jsonToXml(json: unknown): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    suppressEmptyNode: true,
  });

  const body = builder.build(json);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}
