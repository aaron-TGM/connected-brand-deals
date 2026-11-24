# Connected deals calendar

A monthly calendar of the Connected promos that California retailers are running. Shoppers pick their shop (by name, city or "Near me"), see that shop's deals, and click through to the shop's website.

**Preview:** https://aaron-tgm.github.io/connected-brand-deals/

**Install on the Shopify site** (Online Store → Customize → the page → Add section → Custom Liquid). Paste:

```html
<div id="cc-deals"></div>
<script src="https://aaron-tgm.github.io/connected-brand-deals/embed.js" defer></script>
```

To remove it, delete that section.

## How it works

| File | What it is |
|---|---|
| `embed.js` | The whole calendar: styles and logic, no dependencies. |
| `deals-YYYY-MM.json` | One month's promos and participating shops. The calendar loads the current month (Pacific time) automatically, and shoppers can switch months. |
| `deals.json` | Fallback if a month's file is missing (always the newest month). |
| `data/promos.json` | Promo wording, dates, and which tracker column each promo reads its "Yes" shops from. |
| `data/shop-map.json` | Links each tracker "Parent Customer" to its stores in the store locator. |
| `data/locator.json` | Store names, addresses, websites and map coordinates from the find-products store locator. |
| `tools/build.py` | Turns a tracker export into the `deals-*.json` files. |
| `tools/fetch_locator.py` | Refreshes `data/locator.json` from the store locator. |

**What's public.** Only shop names, addresses, websites and which promos they're running. The build reads only the "Parent Customer" column and the Yes/No promo columns. Salespeople, tiers and notes are never read, and the spreadsheet itself is never committed (`*.xlsx` is in `.gitignore`).

## Updating

### New tracker export (daily/weekly)

```bash
python3 tools/build.py "CA Marketing x Sales Cheat Sheet.xlsx"
```

Then commit the changed `deals-*.json` and `deals.json`. Deal changes go live as soon as they're pushed.

The build prints any tracker account that isn't in `data/shop-map.json` yet. Add a line for it:

- If it's in the store locator: `"Account Name": { "match": ["^Locator Store Name$"] }`. A chain like `"^Catalyst - "` lists every matching store.
- If it isn't: `"Account Name": { "name": "Shop Name", "city": "City", "url": "https://..." }`.

### New month or new promo

Add the month to `data/promos.json`. Each promo has:

- **Dated promos** (`dated`): `from`/`to` are dates of the month. `feature: true` gives it the countdown banner.
- **Weekly promos** (`weekly`): shown as "1 day a week" or "2–3 days a week". Shops pick their own day, so these aren't pinned to calendar dates.
- **Wording**: use only what's on the Q4 Promotions tab.
- **`column`**: the start of the tracker column header (line breaks and spaces are ignored).

Publish next month any time before the 1st. It switches over at midnight Pacific.

### Store locator changed

```bash
python3 tools/fetch_locator.py
```

Then rebuild.

## Testing

Serve the folder with `python3 -m http.server 8765` and open http://localhost:8765/. You can preset a shop with `?shop=<id>`; the ids are in the `deals-*.json` files.

## Caching

- Data files are fetched with `no-cache`, so deal changes are live right away.
- `embed.js` is cached by GitHub Pages for about 10 minutes. Hard-refresh to see a code change.

## Arizona

The calendar has a **California | Arizona** switch.
- **Default state:** California. Visitors whose device is set to Arizona time start on Arizona, and the page remembers the last state picked.
- **Linking:** `?state=az` in the page URL (or `data-state="az"` on the div) opens Arizona.

| File | What it is |
|---|---|
| `deals-az-YYYY-MM.json` / `deals-az.json` | Arizona month files and the fallback. |
| `data/az-promos.json` | Arizona promo copy. Each sheet row is matched by the start of its "Promotion" text. `{brand}` becomes the brand name. Deals are brand products only. |
| `data/az-shop-map.json` | Arizona retailer → stores. Every location of a chain is included. Stores missing from the locator are listed by hand under `locations`; Ponderosa's stores are listed as JARS, since JARS bought Ponderosa. |

To update from a new Arizona programming sheet (columns: Promotion, Promo Dates, Retailers):

```bash
python3 tools/build_az.py "Retailer Programming.xlsx"
```

The build prints any promo or retailer it can't place. Add those to `az-promos.json` or `az-shop-map.json`, then re-run. Dates in the sheet can be "Nov 25-27", "Nov 24-27", "11/25" or a date cell. Arizona days run on Arizona time.
