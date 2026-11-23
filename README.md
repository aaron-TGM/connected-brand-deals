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
