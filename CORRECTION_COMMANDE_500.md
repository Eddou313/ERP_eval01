# Fix: PrestaShop POST /orders 500 Error

## Problem
POST /orders was returning 500 with an empty response body despite a well-formed XML payload. This was caused by including read-only fields that PrestaShop auto-generates or rejects during order creation.

## Root Cause
The original `buildOrderXml()` function included fields that must NOT be sent during order creation:
- `valid` - PrestaShop determines this automatically based on payment module
- `invoice_number` - Auto-assigned by PrestaShop
- `invoice_date` - Auto-assigned when order is created  
- `delivery_date` - Auto-assigned
- `delivery_number` - Auto-assigned
- `mobile_theme` - Optional, 0 by default
- Empty `secure_key` - Critical field that must contain customer's security key

## Solution

### 1. Added Customer Secure Key Import
File: [src/module/Backoffice/commande/api/commandesApi.ts](src/module/Backoffice/commande/api/commandesApi.ts)

```typescript
import { getClient } from "../../client/api/clientApi";
```

The `getClient()` function fetches the customer with their `secure_key` field.

### 2. Created Minimal Creation Payload
New function `buildOrderXmlForCreation()` that includes ONLY these fields:

**Required Identifiers:**
- `id_cart`, `id_customer`, `id_address_delivery`, `id_address_invoice`
- `id_currency`, `id_lang`, `id_carrier`

**Payment Info:**
- `payment`, `module`, `secure_key` (fetched from customer)

**State & Totals:**
- `current_state`
- `total_paid`, `total_paid_tax_incl`, `total_paid_tax_excl`, `total_paid_real`
- `total_products`, `total_products_wt`
- `total_shipping`, `total_shipping_tax_incl`, `total_shipping_tax_excl`
- `total_discounts`, `total_discounts_tax_incl`, `total_discounts_tax_excl`
- `total_wrapping`, `total_wrapping_tax_incl`, `total_wrapping_tax_excl`

**Configuration:**
- `carrier_tax_rate`, `round_mode`, `round_type`, `conversion_rate`

**Optional Fields:**
- `gift`, `recyclable` 
- `note`, `gift_message` (if present)

### 3. Updated createOrder() Function
- Fetches customer's `secure_key` if not provided in form
- Uses new `buildOrderXmlForCreation()` instead of `buildOrderXml()`
- Gracefully handles missing secure_key with fallback

## XML Comparison

### BEFORE (500 Error)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order>
    <id_cart>14</id_cart>
    <id_customer>5</id_customer>
    ...
    <valid>0</valid>                    <!-- ❌ Read-only -->
    <invoice_number/>                   <!-- ❌ Auto-assigned -->
    <invoice_date>2026-05-13</invoice_date>  <!-- ❌ Auto-assigned -->
    <delivery_date>2026-05-13</delivery_date>  <!-- ❌ Auto-assigned -->
    <delivery_number/>                  <!-- ❌ Auto-assigned -->
    <secure_key/>                       <!-- ❌ Empty! -->
    <mobile_theme>0</mobile_theme>      <!-- ❌ Unnecessary -->
  </order>
</prestashop>
```

### AFTER (Minimal & Valid)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order>
    <id_cart>14</id_cart>
    <id_customer>5</id_customer>
    <id_address_delivery>7</id_address_delivery>
    <id_address_invoice>7</id_address_invoice>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_carrier>2</id_carrier>
    <payment>Paiement à la livraison</payment>
    <module>cash</module>
    <secure_key>{{ customer.secure_key }}</secure_key>  <!-- ✅ From customer -->
    <current_state>1</current_state>
    <total_paid>45.88</total_paid>
    <total_paid_tax_incl>45.88</total_paid_tax_incl>
    <total_paid_tax_excl>45.88</total_paid_tax_excl>
    <total_paid_real>45.88</total_paid_real>
    <total_products>45.88</total_products>
    <total_products_wt>45.88</total_products_wt>
    <total_shipping>0</total_shipping>
    <total_shipping_tax_incl>0</total_shipping_tax_incl>
    <total_shipping_tax_excl>0</total_shipping_tax_excl>
    <total_discounts>0</total_discounts>
    <total_discounts_tax_incl>0</total_discounts_tax_incl>
    <total_discounts_tax_excl>0</total_discounts_tax_excl>
    <carrier_tax_rate>0</carrier_tax_rate>
    <total_wrapping>0</total_wrapping>
    <total_wrapping_tax_incl>0</total_wrapping_tax_incl>
    <total_wrapping_tax_excl>0</total_wrapping_tax_excl>
    <round_mode>0</round_mode>
    <round_type>0</round_type>
    <conversion_rate>1</conversion_rate>
    <gift>0</gift>
    <recyclable>0</recyclable>
    <!-- ✅ Removed: valid, invoice_number, invoice_date, delivery_date, delivery_number, mobile_theme -->
  </order>
</prestashop>
```

## Testing the Fix

### Next Steps:
1. Open the FrontOffice checkout workflow
2. Fill in all required fields (address, shipping, payment)
3. Click "Confirmer la commande"
4. Expected: Order created successfully (should see order ID in success alert)
5. Check console logs for new minimal XML payload

### Expected XML Log Output:
The console will now show the minimal creation payload (not the update payload with all fields).

## Files Modified
- [src/module/Backoffice/commande/api/commandesApi.ts](src/module/Backoffice/commande/api/commandesApi.ts)
  - Added `import { getClient } from "../../client/api/clientApi"`
  - Added `buildOrderXmlForCreation()` function
  - Updated `createOrder()` to fetch secure_key and use minimal payload

## Backwards Compatibility
- `buildOrderXml()` remains unchanged for UPDATE operations
- `updateOrder()`, `updateImportOrder()` continue to use full XML payload
- Only `createOrder()` (POST) uses the new minimal payload
