# Master Tax Table

This document is the single reference for **where we ship** (from the shipping docs in this folder) and **what tax/VAT rate to charge** per country. The app uses [lib/tax-rates.ts](../../lib/tax-rates.ts) for checkout; keep that file in sync when you add or change countries or rates here.

Rates are standard VAT/GST/sales tax percentages (approximate). Confirm with your accountant for filing. Tax is applied to **subtotal + shipping** at checkout.

---

## Canada & United States

| Country name   | ISO code | Tax rate (%) | Notes                                      |
|----------------|----------|--------------|--------------------------------------------|
| Canada         | CA       | 5            | GST federal; use state overrides for HST/PST |
| United States  | US       | 0            | No federal sales tax; use state overrides  |

---

## United Kingdom

| Country name        | ISO code | Tax rate (%) | Notes     |
|--------------------|----------|--------------|-----------|
| United Kingdom     | GB       | 20           | UK VAT    |

---

## European Union (EU 27)

| Country name   | ISO code | Tax rate (%) | Notes   |
|----------------|----------|--------------|---------|
| Austria        | AT       | 20           | EU VAT  |
| Belgium        | BE       | 21           | EU VAT  |
| Bulgaria       | BG       | 20           | EU VAT  |
| Croatia        | HR       | 25           | EU VAT  |
| Cyprus         | CY       | 19           | EU VAT  |
| Czech Republic | CZ       | 21           | EU VAT  |
| Denmark        | DK       | 25           | EU VAT  |
| Estonia        | EE       | 20           | EU VAT  |
| Finland        | FI       | 24           | EU VAT  |
| France         | FR       | 20           | EU VAT  |
| Germany        | DE       | 19           | EU VAT  |
| Greece         | GR       | 24           | EU VAT  |
| Hungary        | HU       | 27           | EU VAT  |
| Ireland        | IE       | 23           | EU VAT  |
| Italy          | IT       | 22           | EU VAT  |
| Latvia         | LV       | 21           | EU VAT  |
| Lithuania      | LT       | 21           | EU VAT  |
| Luxembourg     | LU       | 17           | EU VAT  |
| Malta          | MT       | 18           | EU VAT  |
| Netherlands    | NL       | 21           | EU VAT  |
| Poland         | PL       | 23           | EU VAT  |
| Portugal       | PT       | 23           | EU VAT  |
| Romania        | RO       | 19           | EU VAT  |
| Slovakia       | SK       | 20           | EU VAT  |
| Slovenia       | SI       | 22           | EU VAT  |
| Spain          | ES       | 21           | EU VAT  |
| Sweden         | SE       | 25           | EU VAT  |

---

## EFTA & Northern Europe (non-EU)

| Country name   | ISO code | Tax rate (%) | Notes        |
|----------------|----------|--------------|--------------|
| Iceland        | IS       | 24           | VAT         |
| Liechtenstein  | LI       | 8.1          | VAT         |
| Norway         | NO       | 25           | VAT         |
| Switzerland    | CH       | 8.1          | VAT         |

*(Denmark, Estonia, Finland, Latvia, Lithuania, Sweden are in the EU table above.)*

---

## Australia

| Country name | ISO code | Tax rate (%) | Notes   |
|--------------|----------|--------------|---------|
| Australia    | AU       | 10           | GST     |

---

## Other (shipping docs / common)

| Country name        | ISO code | Tax rate (%) | Notes              |
|---------------------|----------|--------------|--------------------|
| Japan               | JP       | 10           | Consumption tax   |
| Moldova, Republic of| MD      | 20           | VAT (approx.)     |

---

## Syncing with the app

When you add or change a row in this table, update [lib/tax-rates.ts](../../lib/tax-rates.ts):

- **Country-level rate:** Add or edit the entry in `TAX_RATES_BY_COUNTRY` (key = ISO code, value = rate percent).
- **State/province override (e.g. Canadian provinces, US states):** Add or edit the entry in `TAX_RATES_BY_STATE` (key = state/province code, value = rate percent).

Countries not in `TAX_RATES_BY_COUNTRY` use `DEFAULT_TAX_RATE_PERCENT` (0).
