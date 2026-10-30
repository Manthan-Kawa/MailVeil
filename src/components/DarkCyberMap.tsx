import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

// Fix Leaflet's default icon asset path issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapMarker {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  count?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence?: number;
  color?: string;
  role?: string;
  ip?: string;
  countryCode?: string;
}

interface DarkCyberMapProps {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelectMarker?: (marker: MapMarker) => void;
  height?: string;
  singlePointerMode?: boolean;
}

/** Build a custom div-based pulsing marker HTML */
function buildPulseIcon(severity: MapMarker['severity'] = 'critical') {
  const colorMap: Record<string, { ring: string; dot: string; core: string }> = {
    critical: { ring: '#ef4444', dot: '#facc15', core: '#ffffff' },
    high:     { ring: '#f97316', dot: '#fb923c', core: '#ffffff' },
    medium:   { ring: '#f59e0b', dot: '#fbbf24', core: '#ffffff' },
    low:      { ring: '#3b82f6', dot: '#60a5fa', core: '#ffffff' },
    info:     { ring: '#22d3ee', dot: '#67e8f9', core: '#ffffff' },
  };
  const c = colorMap[severity] ?? colorMap.critical;

  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
    html: `
      <div style="
        position: relative;
        width: 44px; height: 44px;
        display: flex; align-items: center; justify-content: center;
      ">
        <!-- Pulse ring 1 -->
        <div class="cyber-pulse-ring-1" style="
          position: absolute;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${c.ring};
          opacity: 0.85;
          transform-origin: center;
        "></div>
        <!-- Pulse ring 2 (staggered) -->
        <div class="cyber-pulse-ring-2" style="
          position: absolute;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${c.ring};
          opacity: 0.6;
          transform-origin: center;
        "></div>
        <!-- Outer  ring (static) -->
        <div style="
          position: absolute;
          width: 20px; height: 20px;
          border-radius: 50%;
          border: 1.5px solid ${c.ring};
          opacity: 0.4;
          box-shadow: 0 0 12px 4px ${c.ring}55;
        "></div>
        <!-- Main dot -->
        <div style="
          position: relative;
          width: 11px; height: 11px;
          border-radius: 50%;
          background: ${c.dot};
          border: 2px solid ${c.ring};
          box-shadow: 0 0 10px 3px ${c.ring}99, 0 0 20px 6px ${c.ring}44;
          z-index: 2;
        ">
          <!-- White core -->
          <div style="
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 4px; height: 4px;
            border-radius: 50%;
            background: ${c.core};
          "></div>
        </div>
      </div>
    `,
  });
}

export function DarkCyberMap({
  markers,
  selectedId,
  onSelectMarker,
  height = 'h-64 md:h-80',
  singlePointerMode = true,
}: DarkCyberMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markersRef      = useRef<Map<string, L.Marker>>(new Map());

  const displayedMarkers = singlePointerMode && markers.length > 0 ? [markers[0]] : markers;
  const primaryMarker    = displayedMarkers[0];

  const primaryMarkerRef = useRef<MapMarker | undefined>(primaryMarker);
  primaryMarkerRef.current = primaryMarker;
  const displayedMarkersRef = useRef<MapMarker[]>(displayedMarkers);
  displayedMarkersRef.current = displayedMarkers;

  /* ── Init map once ── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: primaryMarker ? [primaryMarker.lat, primaryMarker.lng] : [20.5937, 78.9629],
      zoom: primaryMarker ? 5 : 2,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
    });

    // CartoDB Dark Matter with API key from .env to remove watermark
    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_3i66_1_450e166351e036c0fa2b44d5';
    const tileUrl = cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // ── Add [ ] Re-center / Focus View button below '-' in Leaflet zoom controls ──
    const zoomContainer = map.zoomControl?.getContainer();
    if (zoomContainer) {
      const resetBtn = L.DomUtil.create('a', 'leaflet-control-zoom-reset', zoomContainer);
      resetBtn.href = '#';
      resetBtn.title = 'Re-center to exact origin location [ ]';
      resetBtn.setAttribute('role', 'button');
      resetBtn.setAttribute('aria-label', 'Re-center to exact origin location');
      resetBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; display: block;">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
          <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
          <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      `;

      L.DomEvent.disableClickPropagation(resetBtn);
      L.DomEvent.disableScrollPropagation(resetBtn);
      L.DomEvent.on(resetBtn, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        const currentPrimary = primaryMarkerRef.current;
        if (currentPrimary) {
          map.flyTo([currentPrimary.lat, currentPrimary.lng], 5, {
            duration: 1.2,
            easeLinearity: 0.25,
          });
          const markerObj = markersRef.current.get(currentPrimary.id);
          if (markerObj) {
            setTimeout(() => {
              markerObj.openPopup();
            }, 600);
          }
        } else if (displayedMarkersRef.current.length > 0) {
          const group = L.featureGroup(Array.from(markersRef.current.values()));
          if (group.getLayers().length > 0) {
            map.fitBounds(group.getBounds().pad(0.2), { duration: 1.2 });
          }
        } else {
          map.flyTo([20.5937, 78.9629], 2, { duration: 1.2 });
        }
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync markers whenever displayedMarkers changes ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove stale markers
    const currentIds = new Set(displayedMarkers.map((m) => m.id));
    markersRef.current.forEach((lMarker, id) => {
      if (!currentIds.has(id)) {
        lMarker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    displayedMarkers.forEach((m) => {
      if (!markersRef.current.has(m.id)) {
        const icon   = buildPulseIcon(m.severity);
        const lMarker = L.marker([m.lat, m.lng], { icon });

        // Custom popup
        const popupHtml = `
          <div style="
            background: #0c0f1a;
            border: 1px solid rgba(239,68,68,0.35);
            border-radius: 10px;
            padding: 10px 14px;
            color: #e5e7eb;
            font-family: 'Inter', sans-serif;
            min-width: 180px;
            box-shadow: 0 0 20px rgba(239,68,68,0.15);
          ">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="
                display:inline-block;width:8px;height:8px;border-radius:50%;
                background:#ef4444;box-shadow:0 0 6px #ef4444;
                animation:cyberPulse1 2.2s ease-out infinite;
              "></span>
              <span style="font-size:11px;font-weight:700;color:#ef4444;letter-spacing:0.08em;text-transform:uppercase;">
                ${m.severity ?? 'CRITICAL'} THREAT
              </span>
            </div>
            <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:2px;">
              ${m.city}, ${m.country}
            </div>
            ${m.ip ? `<div style="font-size:11px;color:#22d3ee;font-family:'Inter', sans-serif;font-weight:500;">IP: ${m.ip}</div>` : ''}
            ${m.role ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">${m.role}</div>` : ''}
            ${m.confidence != null ? `<div style="font-size:10px;color:#6b7280;margin-top:4px;">Confidence: <b style="color:#facc15">${m.confidence}%</b></div>` : ''}
          </div>
        `;

        lMarker.bindPopup(popupHtml, {
          className: 'cyber-popup',
          maxWidth: 260,
          closeButton: false,
        });

        lMarker.on('click', () => {
          onSelectMarker?.(m);
          lMarker.openPopup();
        });

        lMarker.addTo(map);
        markersRef.current.set(m.id, lMarker);
      }
    });

    // Fly to primary marker
    if (primaryMarker) {
      map.flyTo([primaryMarker.lat, primaryMarker.lng], 5, { duration: 1.6 });
    }
  }, [displayedMarkers, primaryMarker, onSelectMarker]);

  /* ── Open popup when selectedId changes ── */
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const lMarker = markersRef.current.get(selectedId);
    if (lMarker) lMarker.openPopup();
  }, [selectedId]);

  return (
    <div
      className={`relative w-full ${height} bg-white dark:bg-zinc-800 rounded-2xl border border-white/10 overflow-hidden select-none shadow-2xl isolate`}
      style={{ minHeight: '400px', isolation: 'isolate' }}
    >
      {/* ── Real Leaflet map fills the entire card ── */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />

      {/* ── Top Right Origin Status Badge (Hidden on mobile, visible on tablet & PC) ── */}
      {primaryMarker && (
        <div className="hidden sm:flex absolute top-4 right-4 z-[1000] items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none/90 backdrop-blur-md border border-red-500/30 text-xs font-mono text-white pointer-events-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="font-bold text-red-400 uppercase tracking-wider">SUSPECTED ORIGIN:</span>
          <span className="text-gray-300 font-semibold">
            {primaryMarker.city}, {primaryMarker.country}
          </span>
        </div>
      )}

      {/* ── Map Footer Info Bar ── */}
      <div className="absolute bottom-3 left-4 right-4 z-[1000] flex items-center justify-between bg-white dark:bg-zinc-800/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-gray-300 pointer-events-none">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-red-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>
            ORIGIN RELAY LOCATED:{' '}
            <strong className="text-white font-bold">{primaryMarker?.ip}</strong>
            {primaryMarker && ` (${primaryMarker.city}, ${primaryMarker.countryCode ?? primaryMarker.country})`}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 font-bold">LIVE SIGNAL TRACE</span>
        </div>
      </div>
    </div>
  );
}
