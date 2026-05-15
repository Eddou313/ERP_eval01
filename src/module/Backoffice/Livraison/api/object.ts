import { boolFromPrestashop, numFromPrestashop, stringFromPrestashop, textFromUnknown } from "../../../../utils/helper";

export type ModeLivraisonForm = {
  deleted: boolean;
  is_module: boolean;
  id_tax_rules_group: number;
  id_reference: number;
  name: string;
  active: boolean;
  is_free: boolean;
  url: string;
  shipping_handling: boolean;
  shipping_external: boolean;
  range_behavior: boolean;
  shipping_method: number;
  max_width: number;
  max_height: number;
  max_depth: number;
  max_weight: number;
  grade: number;
  external_module_name: string;
  need_range: boolean;
  position: number;
  delay: string;
};

export type ModeLivraisonListItem = ModeLivraisonForm & {
  id: number;
};

export type ModeLivraisonGetResponse = {
  prestashop: {
    carrier: {
      id?: unknown;
      deleted?: unknown;
      is_module?: unknown;
      id_tax_rules_group?: unknown;
      id_reference?: unknown;
      name?: unknown;
      active?: unknown;
      is_free?: unknown;
      url?: unknown;
      shipping_handling?: unknown;
      shipping_external?: unknown;
      range_behavior?: unknown;
      shipping_method?: unknown;
      max_width?: unknown;
      max_height?: unknown;
      max_depth?: unknown;
      max_weight?: unknown;
      grade?: unknown;
      external_module_name?: unknown;
      need_range?: unknown;
      position?: unknown;
      delay?: unknown;
    };
  };
};

export function mapCarrier(carrier: ModeLivraisonGetResponse["prestashop"]["carrier"]): ModeLivraisonListItem {
  return {
    id: numFromPrestashop(carrier.id),
    deleted: boolFromPrestashop(carrier.deleted),
    is_module: boolFromPrestashop(carrier.is_module),
    id_tax_rules_group: numFromPrestashop(carrier.id_tax_rules_group),
    id_reference: numFromPrestashop(carrier.id_reference),
    name: textFromUnknown(carrier.name),
    active: boolFromPrestashop(carrier.active),
    is_free: boolFromPrestashop(carrier.is_free),
    url: stringFromPrestashop(carrier.url),
    shipping_handling: boolFromPrestashop(carrier.shipping_handling),
    shipping_external: boolFromPrestashop(carrier.shipping_external),
    range_behavior: boolFromPrestashop(carrier.range_behavior),
    shipping_method: numFromPrestashop(carrier.shipping_method),
    max_width: numFromPrestashop(carrier.max_width),
    max_height: numFromPrestashop(carrier.max_height),
    max_depth: numFromPrestashop(carrier.max_depth),
    max_weight: numFromPrestashop(carrier.max_weight),
    grade: numFromPrestashop(carrier.grade),
    external_module_name: textFromUnknown(carrier.external_module_name),
    need_range: boolFromPrestashop(carrier.need_range),
    position: numFromPrestashop(carrier.position),
    delay: textFromUnknown(carrier.delay),
  };
}