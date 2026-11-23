#!/usr/bin/env python3
"""Refresh data/locator.json from the store locator on connectedcannabisco.com/pages/find-products.

The locator (Stockist widget "map_2qzx277q") only returns 100 stores per search, so this tiles
California with searches and splits any tile that hits the cap. Run it once a month or whenever
new shops are added to the locator:

    python3 tools/fetch_locator.py
"""
import json, os, time, urllib.request

TAG = 'map_2qzx277q'
URL = 'https://stockist.co/api/v1/' + TAG + '/locations/search?latitude=%f&longitude=%f&distance=%f&per_page=100'
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'locator.json')
seen = {}


def query(lat, lng, radius):
    for _ in range(3):
        try:
            req = urllib.request.Request(URL % (lat, lng, radius), headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as f:
                return json.load(f)['locations']
        except Exception:
            time.sleep(2)
    return []


def tile(lat, lng, radius, depth=0):
    found = query(lat, lng, radius)
    time.sleep(0.15)
    for x in found:
        seen[x['id']] = x
    if len(found) >= 100 and depth < 6:  # capped: split into smaller tiles
        half = radius / 2
        dlat = half / 69.0
        dlng = dlat / 0.82
        for a, b in [(lat + dlat, lng + dlng), (lat + dlat, lng - dlng), (lat - dlat, lng + dlng), (lat - dlat, lng - dlng), (lat, lng)]:
            tile(a, b, half * 1.45, depth + 1)


lat = 32.5
while lat <= 42.01:
    lng = -124.5
    while lng <= -114:
        tile(lat, lng, 60)
        lng += 1.0
    lat += 1.0

keep = ['id', 'name', 'latitude', 'longitude', 'full_address', 'website', 'phone']
rows = sorted(({k: x.get(k) for k in keep} for x in seen.values()), key=lambda x: (x['name'] or '', x['id']))
with open(OUT, 'w') as f:
    json.dump(rows, f, indent=0, ensure_ascii=False)
print('saved %d stores to %s' % (len(rows), os.path.normpath(OUT)))
