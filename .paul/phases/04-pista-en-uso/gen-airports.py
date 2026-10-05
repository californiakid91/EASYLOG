#!/usr/bin/env python3
"""Genera AIRPORT_DB (OurAirports → IATA, ICAO, lat/lon, pistas con rumbo verdadero) y lo inserta en index.html.

Uso:  python3 gen-airports.py [airports.csv runways.csv]
Sin argumentos descarga los CSV de https://davidmegginson.github.io/ourairports-data/ (datos de dominio público).
Formato de cada entrada (separadas por ';', ordenadas por IATA):
    IATA ICAO lat lon le/he:rumboLe,le/he:rumboLe
Idempotente: con los mismos CSV deja index.html igual.
"""
import csv
import io
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'index.html'))
BASE = 'https://davidmegginson.github.io/ourairports-data/'
EXTRA = {'ES', 'PT', 'GR', 'CY', 'TR', 'MA', 'TN', 'DZ', 'EG', 'JO', 'IL', 'LB', 'GE', 'AM', 'AZ', 'CV'}
EXCLUDE = {'RU', 'BY', 'UA', 'KZ'}
RWY_ID = re.compile(r'\d{2}[LRC]?')
START, END = '// <AIRPORT_DB>', '// </AIRPORT_DB>'


def rows(src):
    if os.path.exists(src):
        with open(src, encoding='utf-8') as fh:
            return list(csv.DictReader(fh))
    data = urllib.request.urlopen(BASE + src).read().decode('utf-8')
    return list(csv.DictReader(io.StringIO(data)))


def main():
    a_src, r_src = (sys.argv[1], sys.argv[2]) if len(sys.argv) == 3 else ('airports.csv', 'runways.csv')
    aps = {}
    for a in rows(a_src):
        iata = a['iata_code'].strip().upper()
        if not re.fullmatch(r'[A-Z]{3}', iata):
            continue
        if not (a['type'] in ('large_airport', 'medium_airport') or (a['type'] == 'small_airport' and a['scheduled_service'] == 'yes')):
            continue
        if a['iso_country'] in EXCLUDE or not (a['continent'] == 'EU' or a['iso_country'] in EXTRA):
            continue
        icao = next((c for c in (a.get('icao_code', ''), a['gps_code'], a['ident']) if re.fullmatch(r'[A-Z]{4}', c.strip().upper())), '').strip().upper() or '-'
        prev = aps.get(iata)
        # IATA repetido: preferir el de servicio regular y tipo mayor
        rank = (a['scheduled_service'] == 'yes', a['type'] == 'large_airport', a['type'] == 'medium_airport')
        if prev and prev['rank'] >= rank:
            continue
        aps[iata] = {'ident': a['ident'], 'icao': icao, 'lat': float(a['latitude_deg']), 'lon': float(a['longitude_deg']), 'rank': rank, 'rw': []}
    by_ident = {v['ident']: v for v in aps.values()}
    for r in rows(r_src):
        ap = by_ident.get(r['airport_ident'])
        if not ap or r['closed'] != '0':
            continue
        le, he = r['le_ident'].strip().upper(), r['he_ident'].strip().upper()
        if not RWY_ID.fullmatch(le) or not RWY_ID.fullmatch(he):
            continue
        try:
            if int(float(r['length_ft'] or 0)) < 4000:
                continue
            hdg = str(round(float(r['le_heading_degT'])) % 360) if r['le_heading_degT'] else f'~{int(le[:2]) * 10 % 360}'
        except ValueError:
            continue
        ap['rw'].append(f'{le}/{he}:{hdg}')
    out = ';'.join(f"{k} {v['icao']} {v['lat']:.4f} {v['lon']:.4f} {','.join(sorted(v['rw']))}".rstrip() for k, v in sorted(aps.items()))
    block = f"{START}\n// Generado por .paul/phases/04-pista-en-uso/gen-airports.py desde OurAirports — no editar a mano\nconst AIRPORT_DB = '{out}';\n{END}"
    with open(INDEX, encoding='utf-8') as fh:
        html = fh.read()
    if START in html:
        html = re.sub(re.escape(START) + r'[\s\S]*?' + re.escape(END), lambda _: block, html, count=1)
    else:
        anchor = re.search(r'^const AIRPORTS = \{[\s\S]*?^\};\n', html, re.MULTILINE)
        if not anchor:
            sys.exit('No encuentro el objeto AIRPORTS en index.html')
        html = html[:anchor.end()] + '\n' + block + '\n' + html[anchor.end():]
    with open(INDEX, 'w', encoding='utf-8') as fh:
        fh.write(html)
    print(f'{len(aps)} aeropuertos, {sum(len(v["rw"]) for v in aps.values())} pistas, bloque {len(block)} bytes')


if __name__ == '__main__':
    main()
