'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ROOMS, AMENITIES } from '@/lib/sandbox-media';
import { MET_PLACES, placesForAmenity, amenityKey, floorLabel } from '@/lib/met-places';

function mapLabel(text: string, width: number) {
  const limit = Math.max(16, Math.floor(width / 6.8));
  return text.split(' ').reduce<string[]>((lines, word) => { const last = lines.length - 1; if (last >= 0 && `${lines[last]} ${word}`.length <= limit) lines[last] += ` ${word}`; else lines.push(word); return lines; }, []);
}
import type { PageDoc } from '@/lib/types';
import { useSandboxControls } from './sandbox-controls';

export default function MetMapSandbox({ doc }: { doc: PageDoc }) {
  const s = useStore(st => st.sandboxSessions['met-map'])!;
  const { act, node, control, running, targetId, isAwaiting } = useSandboxControls(doc);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [searching, setSearching] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const zoom = s.mapZoom || 1;
  const rooms = ROOMS.filter(r => r.floor === s.mapFloor);
  const selected = rooms.find(r => r.id === s.selected);
  const matches = ROOMS.filter(r => `${r.title} ${r.gallery} ${r.detail}`.toLowerCase().includes(s.query.toLowerCase()));
  const choose = (id: string, floor: number) => { if (floor !== s.mapFloor) act(`floor-${floor}`); act(`room-${id}`); setSearching(false); };
  const places = s.mapAmenity ? placesForAmenity(s.mapAmenity) : s.query ? MET_PLACES.filter(p => `${p.name} ${p.category} ${p.detail}`.toLowerCase().includes(s.query.toLowerCase())) : [];
  const selectedPlace = MET_PLACES.find(p => p.id === s.mapPlace);
  const destination = selected ? { x: selected.x + selected.w / 2, y: selected.y + selected.h / 2 } : selectedPlace;
  useEffect(() => { if (s.mapAmenity) { setPan({ x: -140, y: 0 }); setSearching(true); } }, [s.mapAmenity]);
  useEffect(() => { setSearching(Boolean(s.query || s.mapAmenity)); }, [s.query, s.mapAmenity]);
  useEffect(() => { if (selectedPlace) { setPan({ x: selectedPlace.x - 900, y: selectedPlace.y - 440 }); setSearching(true); } }, [s.mapPlace]);
  return <div className="met-app">
    <svg ref={svg} className="met-map-canvas" viewBox={`${pan.x + 700 - 700 / zoom} ${pan.y + 440 - 440 / zoom} ${1400 / zoom} ${880 / zoom}`} aria-label={`Interactive museum map, Floor ${s.mapFloor}`} onPointerDown={e => { if (e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const d = drag.current; if (!d) return; if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) d.moved = true; if (d.moved) { const scale = 1400 / (zoom * (svg.current?.clientWidth || 1400)); setPan({ x: d.px - (e.clientX - d.x) * scale, y: d.py - (e.clientY - d.y) * scale }); } }} onPointerUp={e => { if (!drag.current?.moved) { const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-room], [data-place]'); if (target) { const place = target.getAttribute('data-place'); const id = place ? `place-${place}` : `room-${target.getAttribute('data-room')}`; if (!running || isAwaiting(id)) { if (place) act(id); else choose(target.getAttribute('data-room')!, s.mapFloor); } } } drag.current = null; }}>
      <defs><pattern id="city-blocks" width="165" height="160" patternUnits="userSpaceOnUse"><rect width="165" height="160" fill="#e7e4df" /><path d="M15 15h125v105H90v20H15z" fill="#d0cdc7" /><path d="M55 60v90m55-100v65" stroke="#e7e4df" strokeWidth="12" /></pattern><pattern id="plan-grid" width="36" height="37" patternUnits="userSpaceOnUse"><rect width="36" height="37" fill="#f8f7fc" stroke="#b5b5c2" strokeWidth="1" /><path d="M13 0h9" stroke="#fff" strokeWidth="3" /><text x="18" y="24" textAnchor="middle" fill="#a0a1af" fontSize="10">{s.mapFloor === 2 ? '201' : '521'}</text></pattern><pattern id="gallery-floor" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#f9f8fc" /><circle cx="2" cy="2" r=".4" fill="#dedce5" /></pattern></defs>
      <rect x="-3000" y="-3000" width="7000" height="7000" fill="#d7e7ad" />
      <path d="M0 30Q220 0 310 100T700 120T1100 180T1420 400L1400 0z" fill="#cee09e" />
      <path d="M1390 65Q1190 140 1260 350T1400 530" fill="#a9d9e6" stroke="#c7dc9f" strokeWidth="22" />
      <g fill="none" stroke="#eeeadd" strokeWidth="3">{Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${i * 155 - 80} 0 Q${i * 120 + 180} 200 ${i * 140 - 30} 410 T${i * 145 + 100} 720`} />)}<path d="M0 410Q130 360 250 440T620 330T1050 420T1430 310M0 180Q270 190 450 100T800 180T1400 270" /></g>
      <path d="M0 110Q220 50 390 125T780 145T1140 240T1450 330M175 0Q195 160 240 210T250 400M245 475Q175 600 180 740M1210 0Q1070 160 1130 290M1140 390Q1075 550 1045 740" fill="none" stroke="#fff" strokeWidth="21" strokeLinecap="round" />
      <g fill="#c7dc97">{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={230 + i % 2 * 35} cy={540 + i * 22} r="18" />)}</g>
      <rect x="-3000" y="720" width="7000" height="2600" fill="url(#city-blocks)" />
      <g stroke="white" strokeWidth="22"><path d="M-200 740H1600" />{[180, 350, 520, 690, 860, 1030, 1200, 1370].map(x => <path key={x} d={`M${x} 755V1100`} />)}</g>
      <g fontSize="10" fontWeight="600" fill="#486678"><text x="640" y="743">5th Avenue</text><text x="190" y="140">East Drive</text><text x="105" y="405" transform="rotate(19 105 405)">Wallach Walk</text><text x="1200" y="430" transform="rotate(65 1200 430)">East Drive</text><text x="1060" y="570" transform="rotate(77 1060 570)">86th Street Transverse</text>{[180, 350, 520, 690, 860, 1030, 1200].map((x, i) => <text key={x} x={x + 4} y="845" transform={`rotate(-90 ${x + 4} 845)`}>East {79 + i} Street</text>)}<text x="240" y="704">Central Park Outer Loop</text><text x="855" y="704">Central Park Outer Loop</text></g>
      {/* The supplied floor-plan references are the map tiles, not a screenshot of the UI.
          Search, galleries, pins, floor switching, pan, zoom, and routes remain live SVG/React controls. */}
      <image href={`/sandbox/met-floor-${s.mapFloor}.webp`} x="310" y="220" width="680" height={s.mapFloor === 1 ? 460 : 440} preserveAspectRatio="none"><title>The Met Floor {s.mapFloor} plan</title></image>
      {rooms.map(r => <g key={r.id}>
        <rect data-room={r.id} {...node(`room-${r.id}`)} className={`met-room ${node(`room-${r.id}`).className || ''}`} role="button" aria-label={`Open ${r.title}`} tabIndex={running && !isAwaiting(`room-${r.id}`) ? -1 : 0} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && (!running || isAwaiting(`room-${r.id}`))) { e.preventDefault(); choose(r.id, r.floor); } }} x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} fill={targetId === `room-${r.id}` || s.selected === r.id ? '#ffb46566' : 'transparent'} stroke={targetId === `room-${r.id}` ? '#ef792b' : s.selected === r.id ? '#e94f33' : 'transparent'} strokeWidth="3" />
      </g>)}
      {s.mapRouting && destination && <g pointerEvents="none"><path d={`M640 680V620H${destination.x}V${destination.y}`} fill="none" stroke="white" strokeWidth="8" /><path d={`M640 680V620H${destination.x}V${destination.y}`} fill="none" stroke="#e32d48" strokeWidth="4" strokeDasharray="3 5" /></g>}
      {places.map(place => <g key={place.id} data-place={place.id} className={`met-place-pin ${s.mapPlace === place.id ? 'selected' : ''}`} role="button" aria-label={`Map pin: ${place.name}`} tabIndex={running ? -1 : 0} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !running) { e.preventDefault(); act(`place-${place.id}`); } }} transform={`translate(${place.x} ${place.y})`}>
        <path d="M0 0C-3-6-12-14-12-22a12 12 0 1 1 24 0C12-14 3-6 0 0Z" fill={s.mapPlace === place.id ? '#da2935' : '#86a1b1'} stroke="white" strokeWidth="1.6" />
        <circle cy="-22" r="4" fill="white" /><text x="15" y="-17" fill="#234d6d" fontSize="10" fontWeight="600" paintOrder="stroke" stroke="#fffe" strokeWidth="2.5">{mapLabel(place.name, 115).map((line, i) => <tspan key={i} x="15" dy={i === 0 ? 0 : 12}>{line}</tspan>)}</text>
      </g>)}
    </svg>
    <div className={`met-search-panel ${searching && s.query ? 'has-results' : ''}`}><form onSubmit={e => { e.preventDefault(); setSearching(true); }}><span>⌕</span><input {...node('search')} value={s.query} aria-label="Search The Met" placeholder="Search The Met" onFocus={() => setSearching(true)} onChange={e => { act('search', e.target.value); setSearching(true); }} />{s.query && <button type="button" aria-label="Clear search" onClick={() => { act('clear-map-search'); setSearching(false); }}>×</button>}</form>
      {searching && s.query && <div className="met-results"><h2>{places.length + (s.mapAmenity ? 0 : matches.length)} results</h2>
        {places.map((place, index) => <article key={place.id} className={s.mapPlace === place.id ? 'selected' : ''}>
          {control(`place-${place.id}`, <><div><b>{place.name}</b><small>{floorLabel(place.floor)}{place.floor !== s.mapFloor ? ' · Other level' : ''}</small></div>{place.category === 'Dining' ? <img src={`/sandbox/${place.coffee ? 'coffee' : index % 2 ? 'avocados' : 'bread'}.jpg`} alt="" /> : <span className="met-service-icon">{({ Restrooms: '♿', 'Information Desk': 'i', 'Lactation Room': '♡', Retail: '▣', 'Water Fountains': '◉' } as Record<string, string>)[place.category]}</span>}</>, 'met-place-result')}
          {s.mapPlace === place.id && <div {...node(`place-detail-${place.id}`)} className={`met-place-description ${node(`place-detail-${place.id}`).className || ''}`}><p>{place.detail}</p><small>Approximate location · service hours are not live.</small>{control('directions', s.mapRouting ? 'Hide route' : '↗ Get directions', 'met-directions')}{s.mapRouting && <div {...node('route-guidance')} className="met-route-info">Start at the 82nd Street entrance. {floorLabel(place.floor)}{place.floor !== 1 ? ' — use the museum stairs or elevator to reach this service level.' : '.'}<small>Illustrative route. Follow museum signs and staff guidance.</small></div>}</div>}
        </article>)}
        {!s.mapAmenity && matches.map(r => <button {...node(`room-${r.id}`)} className={`met-gallery-result ${node(`room-${r.id}`).className || ''}`} key={r.id} disabled={running && !isAwaiting(`room-${r.id}`)} aria-label={`Open ${r.title}`} onClick={() => choose(r.id, r.floor)}><b>{r.title}</b><small>Gallery {r.gallery} · Floor {r.floor}</small></button>)}
        {!places.length && !matches.length && <p>No matching locations. Try Dining, Restrooms, Monet, or 131.</p>}
        {places.length > 0 && <p className="met-results-note">Locations span multiple museum levels. Select a result to see its service level. Map positions are approximate.</p>}
      </div>}
    </div>
    <label className="met-floor">Floor <select {...node(targetId && /^floor-[12]$/.test(targetId) ? targetId : `floor-${s.mapFloor}`)} aria-label="Museum floor" value={s.mapFloor} disabled={running && !isAwaiting('floor-1') && !isAwaiting('floor-2')} onChange={e => { act(`floor-${e.target.value}`); setPan({ x: 0, y: 0 }); }}><option value="1">1</option><option value="2">2</option></select></label>
    {selected && <aside {...node(`room-detail-${selected.id}`)} className={`met-detail ${node(`room-detail-${selected.id}`).className || ''}`}><div className="met-detail-top"><span>THE MET FIFTH AVENUE</span>{control('close-room', '×')}</div><h1 {...node(`room-title-${selected.id}`)}>{selected.title}</h1><p className="met-gallery-label">Gallery {selected.gallery} · Floor {selected.floor}</p><p>{selected.detail}</p>{control('directions', s.mapRouting ? 'Hide walking route' : '↗ Get directions', 'met-directions')}{s.mapRouting && <div {...node('route-guidance')} className="met-route-info">From the 82nd Street entrance · Floor {selected.floor}<br /><small>Illustrative indoor route. Follow museum signs and staff guidance.</small></div>}</aside>}
    <div className="met-zoom"><button aria-label="Recenter museum map" onClick={() => { setPan({ x: 0, y: 0 }); act('reset-map'); }}>⌖</button><div>{control('zoom-in', '+')}{control('zoom-out', '−')}</div></div>
    <div className="met-amenities" aria-label="Museum services">{AMENITIES.map(a => control(`amenity-${amenityKey(a)}`, a, s.mapAmenity === amenityKey(a) ? 'active' : ''))}</div>
    <div className="met-map-credit">The Met · Interactive local map · Floor plans simplified · Not live navigation</div>
    <p {...node('current-state')} className="sr-only">{doc.blocks.find(b => b.id === 'current-state')?.text}</p>
  </div>;
}
