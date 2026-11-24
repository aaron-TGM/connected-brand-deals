#!/usr/bin/env python3
"""Build the public deals files from the sales tracker export.

    python3 tools/build.py "CA Marketing x Sales Cheat Sheet.xlsx"

Reads only three things from each tracker row: the 'Parent Customer' name and the Yes/No cell for
each promo column named in data/promos.json. Salespeople, tiers and notes are never read or written,
so nothing internal ends up in the public files. Do not commit the .xlsx (it's in .gitignore).

Writes deals-YYYY-MM.json for every month in data/promos.json, and copies the current month to
deals.json (the fallback). Prints any tracker account that isn't in data/shop-map.json yet.
"""
import datetime, hashlib, json, os, re, sys

try:
    import openpyxl
except ImportError:
    sys.exit('Needs openpyxl:  pip install openpyxl')

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
load = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
squash = lambda s: re.sub(r'\s+', '', str(s or '')).lower()
clean = lambda s: ' '.join(str(s or '').split())


def read_tracker(path, promos):
    """-> {account name: set(promo ids)} for every month in promos.json"""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out = {}
    for ym, mon in promos['months'].items():
        for p in mon['dated'] + mon['weekly']:
            ws = wb[p['sheet']]
            rows = ws.iter_rows(values_only=True)
            head = next(rows)
            want = squash(p['column'])
            col = next((i for i, h in enumerate(head) if squash(h).startswith(want)), None)
            if col is None:
                sys.exit('Column "%s" not found on sheet "%s"' % (p['column'], p['sheet']))
            name_col = next(i for i, h in enumerate(head) if squash(h) == 'parentcustomer')
            for r in rows:
                name = clean(r[name_col]) if len(r) > name_col else ''
                if name and len(r) > col and str(r[col] or '').strip().lower() == 'yes':
                    out.setdefault(name, set()).add(ym + ':' + p['id'])
    return out


def city_of(addr):
    if not addr:
        return ''
    a = addr.strip()
    m = re.match(r'^Delivery Service,\s*([^,]+)', a, re.I)
    if m:
        return m.group(1).strip().title()
    parts = [x.strip() for x in a.split(',') if x.strip()]
    parts = [x for x in parts if not re.fullmatch(r'(CA|Ca|California)?\s*\d{5}(-\d{4})?|CA|Ca|California', x)]
    if len(parts) >= 2:
        c = re.sub(r'\s+(CA|Ca|California)(\s+\d{5}(-\d{4})?)?$', '', parts[-1]).strip()
        c = re.sub(r'\s+\d{5}(-\d{4})?$', '', c).strip()
        return c.title() if c.isupper() or c.islower() else c
    m = re.search(r'([A-Za-z .]+?),?\s+(CA|California)\b', a)
    return m.group(1).strip() if m else ''


CITY_FIX = {'N H St San Bernardino': 'San Bernardino', 'San Fernando Rd Pacoima': 'Pacoima', 'South St Artesia': 'Artesia',
            'San Jose': 'San Jose', 'N Hollywood': 'North Hollywood', 'S Lake Tahoe': 'South Lake Tahoe', 'Thousand Plms': 'Thousand Palms'}


def fix_city(c):
    c = CITY_FIX.get(c, c)
    return c[:1].upper() + c[1:] if c else c


def strip_utm(u):
    if not u or re.search(r'[()\s]|%20', u.strip()):  # junk like "site.com/(714)%20555-1234"
        return ''
    u = u.strip()
    if not re.match(r'^https?://', u):
        u = 'https://' + u
    base, _, q = u.partition('?')
    keep = [kv for kv in q.split('&') if kv and not kv.lower().startswith(('utm_', 'y_source'))]
    return base + ('?' + '&'.join(keep) if keep else '')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    promos, smap, locator = load('data/promos.json'), load('data/shop-map.json'), load('data/locator.json')
    accounts = read_tracker(sys.argv[1], promos)
    renames = smap.get('rename', {})
    shops, missing, unmatched_regex = {}, [], []

    for acct, flags in sorted(accounts.items()):
        m = smap['accounts'].get(acct)
        if m is None:
            missing.append(acct)
            continue
        stores = []
        if 'match' in m:
            pats = [re.compile(p, re.I) for p in m['match']]
            stores = [s for s in locator if s['name'] and any(p.search(s['name']) for p in pats)]
            if not stores:
                unmatched_regex.append(acct)
        if stores:
            seen = set()
            for s in sorted(stores, key=lambda s: (renames.get(s['name'], s['name']), s['id'])):
                lat, lng = s.get('latitude'), s.get('longitude')
                key = (round(float(lat), 3), round(float(lng), 3)) if lat and lng else s['name']
                if key in seen:  # the locator lists some stores twice
                    continue
                seen.add(key)
                name = m.get('rename') if (m.get('rename') and len(stores) == 1) else renames.get(s['name'], s['name'])
                addr = clean(s.get('full_address'))
                sid = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:40] + '-' + hashlib.md5(s['id'].encode()).hexdigest()[:4]
                shops[sid] = {
                    'id': sid, 'n': name, 'c': fix_city(city_of(addr)),
                    'a': '' if addr.lower().startswith('delivery service') else addr,
                    'dl': addr.lower().startswith('delivery service') or 'delivery' in name.lower(),
                    'lat': round(float(lat), 5) if lat else None, 'lng': round(float(lng), 5) if lng else None,
                    'u': strip_utm(m.get('url') if (m.get('url') and len(stores) == 1) else s.get('website')), 'flags': set(flags)}
        else:
            name = m.get('name', acct)
            sid = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:40] + '-' + hashlib.md5(acct.encode()).hexdigest()[:4]
            shops[sid] = {'id': sid, 'n': name, 'c': m.get('city', ''), 'a': '', 'dl': 'delivery' in name.lower(),
                          'lat': None, 'lng': None, 'u': strip_utm(m.get('url', '')), 'flags': set(flags)}

    months = sorted(promos['months'])
    for ym, mon in promos['months'].items():
        ids = [p['id'] for p in mon['dated'] + mon['weekly']]
        out_shops = []
        for s in sorted(shops.values(), key=lambda s: s['n'].lower()):
            p = [i for i in ids if ym + ':' + i in s['flags']]
            if p:
                row = {k: v for k, v in s.items() if k != 'flags' and v not in ('', None, False)}
                row['p'] = p
                out_shops.append(row)
        strip = lambda p: {k: v for k, v in p.items() if k not in ('sheet', 'column')}
        data = {
            'month': ym, 'title': mon['title'], 'months': months,
            'state': 'ca', 'stateName': 'California', 'states': promos.get('states', []),
            'brand': promos['brand'], 'lede': promos['lede'], 'finePrint': promos['finePrint'],
            'dated': [strip(p) for p in mon['dated']], 'weekly': [strip(p) for p in mon['weekly']],
            'shops': out_shops,
        }
        with open(os.path.join(ROOT, 'deals-%s.json' % ym), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        counts = {i: sum(1 for s in out_shops if i in s['p']) for i in ids}
        print('deals-%s.json  %d shops  %s' % (ym, len(out_shops), counts))
        if ym == months[-1]:  # fallback = newest month, so a missing file never shows an old month
            with open(os.path.join(ROOT, 'deals.json'), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
            print('deals.json     = %s (fallback)' % ym)

    if missing:
        print('\nNOT IN data/shop-map.json yet (left off the calendar):\n  ' + '\n  '.join(missing))
    if unmatched_regex:
        print('\n"match" found no locator store (listed by name only):\n  ' + '\n  '.join(unmatched_regex))


if __name__ == '__main__':
    main()
