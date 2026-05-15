import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray} from "../../../../utils/helper";
import { mapCarrier, type ModeLivraisonForm, type ModeLivraisonGetResponse, type ModeLivraisonListItem } from "./object";

export async function listModeLivraisonIds(): Promise<number[]> {
  const json = await requestPrestashopXml<any>("/carriers", {
    query: { display: "[id]" },
  });

  const carriersRaw = json?.prestashop?.carriers?.carrier;
  if (!carriersRaw) return [];

  return asArray(carriersRaw)
    .map((carrier: any) => Number(carrier["@_id"] || carrier.id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export async function getDetailModeLivraisonById(id: number): Promise<ModeLivraisonListItem> {
  const json = await requestPrestashopXml<ModeLivraisonGetResponse>(`/carriers/${id}`);
  if (!json?.prestashop?.carrier) {
    throw new Error("Mode de livraison introuvable");
  }

  return mapCarrier(json.prestashop.carrier);
}

export async function getAllModeLivraison(limit?: number): Promise<ModeLivraisonListItem[]> {
  const ids = await listModeLivraisonIds();
  const slice = typeof limit === "number" ? ids.slice(0, limit) : ids;
  const allMode = await Promise.all(slice.map((id) => getDetailModeLivraisonById(id)));
  const reponse:ModeLivraisonListItem[] = [];
  for(const mode of allMode) {
    if(mode.active) {
      reponse.push(mode);
    }
  }
  return reponse;
}

export async function updateModeLivraison(id: number, form: ModeLivraisonForm): Promise<void> {
  const xml = buildPrestashopXml({
    prestashop: {
      carrier: {
        deleted: form.deleted ? 1 : 0,
        is_module: form.is_module ? 1 : 0,
        id_tax_rules_group: form.id_tax_rules_group,
        id_reference: form.id_reference,
        name: form.name,
        active: form.active ? 1 : 0,
        is_free: form.is_free ? 1 : 0,
        url: form.url,
        shipping_handling: form.shipping_handling ? 1 : 0,
        shipping_external: form.shipping_external ? 1 : 0,
        range_behavior: form.range_behavior ? 1 : 0,
        shipping_method: form.shipping_method,
        max_width: form.max_width,
        max_height: form.max_height,
        max_depth: form.max_depth,
        max_weight: form.max_weight,
        grade: form.grade,
        external_module_name: form.external_module_name,
        need_range: form.need_range ? 1 : 0,
        position: form.position,
        delay: form.delay,
      },
    },
  });

  await requestPrestashopXml(`/carriers/${id}`, {
    method: "PUT",
    bodyXml: xml,
  });
}

export const getAllLModeLivaraison = getAllModeLivraison;
export const updateMOdeLivraion = updateModeLivraison;
export const getDetailModeLibvraisonByid = getDetailModeLivraisonById;

export const PRIX_LIVRAISON_STANDARD = 0.0;