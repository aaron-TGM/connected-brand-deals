#!/usr/bin/env python3
"""Build the Arizona deals files from a retailer-programming sheet.

    python3 tools/build_az.py "Retailer Programming.xlsx"

The sheet has one row per promo with three columns: Promotion, Promo Dates, Retailers
(comma-separated). Each row is matched to a promo in data/az-promos.json by the start of its
Promotion text; the copy shown to shoppers comes from az-promos.json ({brand} becomes the brand
name). Dates come from the sheet ("Nov 25-27", "Nov 24-27", or a date cell). Retailers are
matched to stores with data/az-shop-map.json; every location of a chain is included.

Writes deals-az-YYYY-MM.json for each month in data/promos.json (and any month the sheet covers)
plus deals-az.json (newest month, the fallback). Prints promos or retailers it can't place.
"""
import calendar, datetime, hashlib, json, math, os, re, sys

try:
    import openpyxl
except ImportError:
    sys.exit('Needs openpyxl:  pip install openpyxl')

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
load = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
clean = lambda s: ' '.join(str(s or '').split())
squash = lambda s: re.sub(r'[^a-z0-9]', '', str(s or '').lower())
MONTHS = {m.lower(): i for i, m in enumerate(calendar.month_abbr) if m}


def parse_dates(v, year):
    """-> (yyyy-mm, from_day, to_day)"""
    if isinstance(v, (datetime.date, datetime.datetime)):
        return '%04d-%02d' % (v.year, v.month), v.day, v.day
    t = clean(v)
    m = re.match(r'([A-Za-z]{3})[a-z]*\.?\s*(\d{1,2})(?:\s*[-–]\s*(?:([A-Za-z]{3})[a-z]*\.?\s*)?(\d{1,2}))?', t)
    if not m:
        m2 = re.match(r'(\d{1,2})/(\d{1,2})(?:\s*[-–]\s*(?:\d{1,2}/)?(\d{1,2}))?', t)
        if not m2:
            raise ValueError('Can\'t read the date "%s"' % t)
        mo, a, b = int(m2.group(1)), int(m2.group(2)), int(m2.group(3) or m2.group(2))
        return '%04d-%02d' % (year, mo), a, b
    mo = MONTHS[m.group(1).lower()]
    a = int(m.group(2))
    b = int(m.group(4) or a)
    return '%04d-%02d' % (year, mo), a, b


def tidy(name, renames):
    if name in renames:
        return renames[name]
    n = re.sub(r'\s*\((med/rec|rec)\)\s*', ' ', name, flags=re.I)
    n = re.sub(r'\s*-\s*(rec|med)\s*$', '', n, flags=re.I)
    n = re.sub(r'\s*\(med\)\s*', ' (Medical) ', n, flags=re.I)
    n = re.sub(r'\s*-\s*medical\s*$', ' (Medical)', n, flags=re.I)
    n = re.sub(r'\s*\(AZ\)\s*', ' ', n)
    n = n.replace('Cureleaf', 'Curaleaf')
    return ' '.join(n.split()).strip(' -')


def city_of(addr):
    m = re.search(r',\s*([^,]+?),?\s+(AZ|Arizona)\b', addr or '')
    return m.group(1).strip().title() if m else ''


def strip_utm(u):
    if not u or re.search(r'[()\s]|%20', u.strip()):
        return ''
    u = u.strip()
    if not re.match(r'^https?://', u):
        u = 'https://' + u
    base, _, q = u.partition('?')
    keep = [kv for kv in q.split('&') if kv and not kv.lower().startswith(('utm_', 'y_source'))]
    return base + ('?' + '&'.join(keep) if keep else '')


def miles(a, b):
    r = math.pi / 180
    x = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(x))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cfg, smap, ca = load('data/az-promos.json'), load('data/az-shop-map.json'), load('data/promos.json')
    brand = dict(ca['brand']); brand.update(cfg.get('brand', {}))
    BN = brand['name']
    fill = lambda v: v.replace('{brand}', BN) if isinstance(v, str) else v
    locator = [s for s in load('data/locator.json') if re.search(r'\b(AZ|Arizona)\b', s.get('full_address') or '')]
    renames = smap.get('rename', {})

    # read sheet rows
    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
    rows = []
    for ws in wb:
        it = ws.iter_rows(values_only=True)
        head = [squash(h) for h in next(it, [])]
        if not {'promotion', 'retailers'} <= set(head):
            continue
        ci = {k: head.index(k) for k in ('promotion', 'promodates', 'retailers') if k in head}
        for r in it:
            if r and r[ci['promotion']]:
                rows.append((clean(r[ci['promotion']]), r[ci['promodates']] if 'promodates' in ci else None, clean(r[ci['retailers']])))
    if not rows:
        sys.exit('No sheet with Promotion / Promo Dates / Retailers columns found.')

    promos, unplaced, missing = [], [], set()
    for text, dates, retailers in rows:
        pc = next((p for p in cfg['promos'] if squash(text).startswith(squash(p['match']))), None)
        if not pc:
            unplaced.append(text)
            continue
        ym, a, b = parse_dates(dates, cfg.get('year', datetime.date.today().year))
        p = {k: fill(v) for k, v in pc.items() if k != 'match'}
        p.update({'ym': ym, 'from': a, 'to': b, 'retailers': [x.strip() for x in retailers.split(',') if x.strip()]})
        promos.append(p)

    # stores for each retailer
    shops = {}
    for p in promos:
        for ret in p['retailers']:
            m = smap['retailers'].get(ret)
            if m is None:
                missing.add(ret)
                continue
            found = []
            pats = [re.compile(x, re.I) for x in m.get('match', [])]
            for s in locator:
                if s['name'] and any(x.search(s['name']) for x in pats):
                    found.append({'key': s['id'], 'n': tidy(s['name'], renames), 'a': clean(s.get('full_address')), 'c': smap.get('city', {}).get(s['name'], ''),
                                  'lat': float(s['latitude']) if s.get('latitude') else None,
                                  'lng': float(s['longitude']) if s.get('longitude') else None,
                                  'u': strip_utm(m.get('url') if (m.get('url') and len(pats) and m.get('urlAll')) else s.get('website'))})
            for loc in m.get('locations', []):  # stores the locator doesn't have
                found.append({'key': loc['name'], 'n': loc['name'], 'a': loc.get('address', ''), 'lat': loc.get('lat'), 'lng': loc.get('lng'),
                              'u': strip_utm(loc.get('url') or m.get('url'))})
            if not found:
                found.append({'key': ret, 'n': m.get('name', ret), 'a': '', 'lat': None, 'lng': None, 'u': strip_utm(m.get('url')), 'c': m.get('city', '')})
            kept = []
            for f in found:  # the locator lists some stores twice under slightly different names
                if any(k['lat'] is not None and f['lat'] is not None and miles((k['lat'], k['lng']), (f['lat'], f['lng'])) < 0.15 for k in kept):
                    continue
                kept.append(f)
            for f in kept:
                sid = re.sub(r'[^a-z0-9]+', '-', f['n'].lower()).strip('-')[:40] + '-' + hashlib.md5(('az' + f['key']).encode()).hexdigest()[:4]
                row = shops.setdefault(sid, {'id': sid, 'n': f['n'], 'c': f.get('c') or city_of(f['a']), 'a': f['a'],
                                             'lat': round(f['lat'], 5) if f['lat'] is not None else None,
                                             'lng': round(f['lng'], 5) if f['lng'] is not None else None, 'u': f['u'], 'flags': set()})
                row['flags'].add(p['ym'] + ':' + p['id'])

    months = sorted(set(ca['months']) | {p['ym'] for p in promos})
    newest = months[-1]
    for ym in months:
        dated = [{k: v for k, v in p.items() if k not in ('ym', 'retailers')} for p in promos if p['ym'] == ym]
        ids = [p['id'] for p in dated]
        out_shops = []
        for s in sorted(shops.values(), key=lambda s: s['n'].lower()):
            pl = [i for i in ids if ym + ':' + i in s['flags']]
            if pl:
                row = {k: v for k, v in s.items() if k != 'flags' and v not in ('', None, False)}
                row['p'] = pl
                out_shops.append(row)
        title = datetime.date(int(ym[:4]), int(ym[5:]), 1).strftime('%B')
        data = {'month': ym, 'title': title, 'months': months, 'state': 'az', 'stateName': 'Arizona',
                'states': ca.get('states', []), 'brand': brand, 'lede': fill(cfg['lede']), 'finePrint': fill(cfg.get('finePrint', ca['finePrint'])),
                'dated': dated, 'weekly': [], 'shops': out_shops}
        for name in ['deals-az-%s.json' % ym] + (['deals-az.json'] if ym == newest else []):
            with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        print('deals-az-%s.json  %d shops  %s' % (ym, len(out_shops), {i: sum(1 for s in out_shops if i in s['p']) for i in ids}))
    print('deals-az.json     = %s (fallback)' % newest)
    if unplaced:
        print('\nPromos in the sheet with no entry in data/az-promos.json (left off):\n  ' + '\n  '.join(unplaced))
    if missing:
        print('\nRetailers not in data/az-shop-map.json (left off):\n  ' + '\n  '.join(sorted(missing)))


if __name__ == '__main__':
    main()
