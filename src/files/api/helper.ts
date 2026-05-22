export function buildXmlWithLanguage(
  resource: string,
  fields: Record<string, unknown>,
  nameValue: string,
  extraNamedFields?: Record<string, string> // ex: { public_name: "taille" }
): string {
  const innerFields = Object.entries(fields)
    .map(([k, v]) => `    <${k}><![CDATA[${v ?? ""}]]></${k}>`)
    .join("\n");
 
  const namedFields = [
    `    <name>\n      <language id="1"><![CDATA[${nameValue}]]></language>\n    </name>`,
    ...Object.entries(extraNamedFields ?? {}).map(
      ([k, v]) => `    <${k}>\n      <language id="1"><![CDATA[${v}]]></language>\n    </${k}>`
    ),
  ].join("\n");
 
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">`,
    `  <${resource}>`,
    innerFields,
    namedFields,
    `  </${resource}>`,
    `</prestashop>`,
  ].join("\n");
}