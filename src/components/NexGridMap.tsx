import React, { useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
} from '@vis.gl/react-google-maps';
import {
  ChevronRight,
  Compass,
  Filter,
  Grid,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react';
import type { FreightItem } from '../types/nexcarga';
import {
  filterNexgridFreights,
  formatBrl,
  formatDateBr,
} from '../utils/logisticsRules';

interface NexGridMapProps {
  freights: FreightItem[];
  onSelectFreight: (freight: FreightItem) => void;
  onViewAllFreights: () => void;
  mapsConfigured: boolean;
  fullPageMode?: boolean;
}

interface PinPosition {
  id: string;
  x: number;
  y: number;
  freight: FreightItem;
}

const BROWSER_GMP_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

export const NexGridMap: React.FC<NexGridMapProps> = ({
  freights,
  onSelectFreight,
  onViewAllFreights,
  mapsConfigured,
  fullPageMode = false,
}) => {
  const [originDraft, setOriginDraft] = useState<string>('');
  const [destinationDraft, setDestinationDraft] = useState<string>('');
  const [vehicleDraft, setVehicleDraft] = useState<string>('Todos');
  const [cargoDraft, setCargoDraft] = useState<string>('Todos');
  const [radiusDraft, setRadiusDraft] = useState<number>(100);

  // Phase B Extended Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [ufDraft, setUfDraft] = useState<string>('Todos');
  const [implementDraft, setImplementDraft] = useState<string>('Todos');
  const [minWeightDraft, setMinWeightDraft] = useState<string>('');
  const [minValueDraft, setMinValueDraft] = useState<string>('');
  const [maxValueDraft, setMaxValueDraft] = useState<string>('');
  const [pickupDateDraft, setPickupDateDraft] = useState<string>('');
  const [statusDraft, setStatusDraft] = useState<string>('Todos');

  const [appliedFilters, setAppliedFilters] = useState({
    origin: '',
    destination: '',
    uf: 'Todos',
    vehicleType: 'Todos',
    implementType: 'Todos',
    cargoType: 'Todos',
    minWeightKg: 0,
    minValueBrl: 0,
    maxValueBrl: 0,
    pickupDate: '',
    status: 'Todos',
    radiusKm: 100,
  });

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedPinFreight, setSelectedPinFreight] = useState<FreightItem | null>(null);
  const [useLiveGoogleTiles, setUseLiveGoogleTiles] = useState<boolean>(false);

  const filteredFreights = useMemo(() => {
    return filterNexgridFreights(freights, appliedFilters);
  }, [freights, appliedFilters]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      origin: originDraft,
      destination: destinationDraft,
      uf: ufDraft,
      vehicleType: vehicleDraft,
      implementType: implementDraft,
      cargoType: cargoDraft,
      minWeightKg: Number(minWeightDraft) || 0,
      minValueBrl: Number(minValueDraft) || 0,
      maxValueBrl: Number(maxValueDraft) || 0,
      pickupDate: pickupDateDraft,
      status: statusDraft,
      radiusKm: radiusDraft,
    });
  };

  const handleResetFilters = () => {
    setOriginDraft('');
    setDestinationDraft('');
    setUfDraft('Todos');
    setVehicleDraft('Todos');
    setImplementDraft('Todos');
    setCargoDraft('Todos');
    setMinWeightDraft('');
    setMinValueDraft('');
    setMaxValueDraft('');
    setPickupDateDraft('');
    setStatusDraft('Todos');
    setRadiusDraft(100);
    setAppliedFilters({
      origin: '',
      destination: '',
      uf: 'Todos',
      vehicleType: 'Todos',
      implementType: 'Todos',
      cargoType: 'Todos',
      minWeightKg: 0,
      minValueBrl: 0,
      maxValueBrl: 0,
      pickupDate: '',
      status: 'Todos',
      radiusKm: 100,
    });
  };

  // Marker coordinates positioned in the visible map area to the right of the filter overlay
  const markerPositions: PinPosition[] = useMemo(() => {
    const presetCoords = [
      { x: 565, y: 205 }, // Central Manhuaçu North
      { x: 472, y: 112 }, // Ipatinga / Gov. Valadares corridor
      { x: 695, y: 88 },  // Northeast corridor
      { x: 378, y: 332 }, // Southwest (Muriaé / Juiz de Fora)
      { x: 602, y: 402 }, // Southeast (Divisa MG/ES/RJ)
    ];
    return filteredFreights.slice(0, 5).map((freight, idx) => ({
      id: freight.id,
      x: presetCoords[idx % presetCoords.length].x,
      y: presetCoords[idx % presetCoords.length].y,
      freight,
    }));
  }, [filteredFreights]);

  const isFiltered =
    Boolean(appliedFilters.origin) ||
    Boolean(appliedFilters.destination) ||
    appliedFilters.uf !== 'Todos' ||
    appliedFilters.vehicleType !== 'Todos' ||
    appliedFilters.implementType !== 'Todos' ||
    appliedFilters.cargoType !== 'Todos' ||
    appliedFilters.minWeightKg > 0 ||
    appliedFilters.minValueBrl > 0 ||
    appliedFilters.maxValueBrl > 0 ||
    Boolean(appliedFilters.pickupDate) ||
    appliedFilters.status !== 'Todos' ||
    appliedFilters.radiusKm !== 100;

  return (
    <section
      aria-label="NEXGRID Radar de Fretes"
      className={`rounded-2xl bg-[#181818]/95 border border-white/[0.08] p-3.5 lg:p-4 transition-all ${
        isExpanded ? 'fixed inset-4 z-50 flex flex-col bg-[#141414]' : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold tracking-tight text-white leading-tight">
              <span className="text-white font-extrabold">NEX</span>
              <span className="text-[#FF8A00] font-extrabold">GRID</span>{' '}
              <span className="font-normal text-neutral-200 ml-1">Radar de Fretes</span>
            </h2>
            {!mapsConfigured && (
              <span
                title="Radar georreferenciado centrado em Manhuaçu/MG (-20.2572, -42.0336) com geocodificação server-side ativa."
                className="hidden md:inline-block text-[10px] text-neutral-500 pl-2 border-l border-white/10"
              >
                Radar Georreferenciado • Manhuaçu/MG
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            Oportunidades em tempo real em todo o Brasil
          </p>
        </div>

        <div className="flex items-center gap-2">
          {BROWSER_GMP_KEY && (
            <button
              type="button"
              onClick={() => setUseLiveGoogleTiles((prev) => !prev)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#222226] hover:bg-[#2a2a30] border border-white/10 text-neutral-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span>{useLiveGoogleTiles ? 'Modo Vetorial NEXGRID' : 'Tiles Google Maps'}</span>
            </button>
          )}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-[#FF8A00] hover:text-[#ffa033] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Limpar filtros ativos
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid: Filter Overlay + Map + Opportunities List */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 flex-1 items-stretch">
        {/* Map + Embedded Filter Container (Cols 1-7) */}
        <div className="xl:col-span-7 relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#141619] min-h-[345px] flex flex-col md:flex-row">
          {/* Live Google Maps SDK Layer (when enabled and VITE_GOOGLE_MAPS_API_KEY is available) */}
          {useLiveGoogleTiles && BROWSER_GMP_KEY ? (
            <div className="absolute inset-0">
              <APIProvider apiKey={BROWSER_GMP_KEY} language="pt-BR" region="BR">
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{ lat: -20.2572, lng: -42.0336 }}
                  defaultZoom={7}
                  gestureHandling="greedy"
                  disableDefaultUI
                  colorScheme="DARK"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  {filteredFreights.map((freight) => (
                    <AdvancedMarker
                      key={freight.id}
                      position={{ lat: freight.originLat, lng: freight.originLng }}
                      title={`${freight.code}: ${freight.originCity}/${freight.originUf} → ${freight.destinationCity}/${freight.destinationUf}`}
                      onClick={() => setSelectedPinFreight(freight)}
                    >
                      <Pin
                        background="#FF8A00"
                        borderColor="#FFF3E0"
                        glyphColor="#111111"
                      />
                    </AdvancedMarker>
                  ))}
                </GoogleMap>
              </APIProvider>
            </div>
          ) : (
            /* Pure Vector Cartographic Canvas matching Reference Image 100% */
            <div className="absolute inset-0 overflow-hidden select-none">
              <svg
                viewBox="0 0 820 460"
                preserveAspectRatio="xMidYMid slice"
                className="w-full h-full transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: '560px 255px',
                }}
              >
                <defs>
                  <radialGradient id="manhuacuPulse" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.52" />
                    <stop offset="40%" stopColor="#FF8A00" stopOpacity="0.22" />
                    <stop offset="75%" stopColor="#E85D04" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#141619" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#FF8A00" stopOpacity="1" />
                    <stop offset="100%" stopColor="#E85D04" stopOpacity="0.65" />
                  </linearGradient>
                  <linearGradient id="atlanticOcean" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d1014" />
                    <stop offset="100%" stopColor="#090b0e" />
                  </linearGradient>
                </defs>

                {/* Dark Continent Base */}
                <rect width="820" height="460" fill="#181a1f" />

                {/* Atlantic Coastline Polygon (East of Vitória / RJ) */}
                <path
                  d="M 790 0 L 820 0 L 820 460 L 520 460 L 585 430 L 665 385 L 725 305 L 755 215 L 775 110 Z"
                  fill="url(#atlanticOcean)"
                />

                {/* Subtle Topographic Elevation Contours & State Boundaries (MG / ES / RJ) */}
                <path
                  d="M 210 30 Q 340 85 480 65 T 755 110 M 240 160 Q 410 140 560 185 T 740 240 M 220 310 Q 380 295 520 345 T 680 375"
                  stroke="rgba(255,255,255,0.035)"
                  strokeWidth="18"
                  fill="none"
                />
                {/* State Border MG / ES & MG / RJ */}
                <path
                  d="M 640 0 L 625 95 L 610 175 L 620 245 L 595 320 L 525 385 L 380 425 L 260 455"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                  fill="none"
                />

                {/* Secondary Regional Highway Mesh (Glowing Fine Lines) */}
                <g stroke="#FF8A00" strokeOpacity="0.28" strokeWidth="1.1" fill="none">
                  <path d="M 285 205 L 340 135 L 440 95 L 535 45" />
                  <path d="M 440 95 L 472 132 L 560 262" />
                  <path d="M 472 132 L 605 115 L 695 88 L 755 35" />
                  <path d="M 560 262 L 635 195 L 695 88" />
                  <path d="M 380 242 L 355 335 L 295 435" />
                  <path d="M 560 262 L 505 345 L 455 430" />
                  <path d="M 560 262 L 605 355 L 645 410" />
                  <path d="M 635 195 L 725 288" />
                </g>

                {/* Primary Arterial Highway: BR-262 (Belo Horizonte -> Manhuaçu -> Vitória) */}
                <path
                  d="M 235 185 C 295 208, 375 245, 455 250 C 505 253, 535 258, 560 262 C 625 268, 680 276, 725 288"
                  stroke="url(#routeGlow)"
                  strokeWidth="2.8"
                  fill="none"
                />

                {/* Primary Arterial Highway: BR-381 / BR-116 */}
                <path
                  d="M 285 205 C 335 268, 405 328, 465 425 M 560 262 C 568 188, 562 118, 595 35"
                  stroke="#FF8A00"
                  strokeOpacity="0.6"
                  strokeWidth="2"
                  fill="none"
                />

                {/* Concentric Radar Rings Centered on Manhuaçu/MG */}
                <circle
                  cx="560"
                  cy="262"
                  r={Math.min(140, Math.max(55, appliedFilters.radiusKm * 0.92))}
                  fill="url(#manhuacuPulse)"
                />
                <circle
                  cx="560"
                  cy="262"
                  r="86"
                  fill="none"
                  stroke="#FF8A00"
                  strokeOpacity="0.24"
                  strokeWidth="1"
                />
                <circle
                  cx="560"
                  cy="262"
                  r="54"
                  fill="none"
                  stroke="#FF8A00"
                  strokeOpacity="0.38"
                  strokeWidth="1.2"
                />
                <circle
                  cx="560"
                  cy="262"
                  r="26"
                  fill="none"
                  stroke="#FF8A00"
                  strokeOpacity="0.58"
                  strokeWidth="1.4"
                />

                {/* Subtle Glowing City Dots */}
                <circle cx="425" cy="175" r="2.5" fill="#FF9E1B" opacity="0.7" />
                <circle cx="515" cy="145" r="2.5" fill="#FF9E1B" opacity="0.7" />
                <circle cx="635" cy="215" r="2.5" fill="#FF9E1B" opacity="0.7" />
                <circle cx="485" cy="315" r="2.5" fill="#FF9E1B" opacity="0.7" />

                {/* City Node: Belo Horizonte */}
                <circle cx="285" cy="205" r="5" fill="#FFFFFF" stroke="#FF8A00" strokeWidth="2.5" />
                <text
                  x="282"
                  y="168"
                  fill="#FFFFFF"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="Outfit, sans-serif"
                >
                  Belo
                </text>
                <text
                  x="282"
                  y="184"
                  fill="#FFFFFF"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="Outfit, sans-serif"
                >
                  Horizonte
                </text>

                {/* Highway Tag: BR-262 */}
                <g transform="translate(390, 228)">
                  <rect width="46" height="18" rx="4" fill="#E5E7EB" />
                  <text
                    x="23"
                    y="12.5"
                    textAnchor="middle"
                    fill="#111111"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    BR-262
                  </text>
                </g>

                {/* Highway Tag: BR-381 */}
                <g transform="translate(432, 378)">
                  <rect width="46" height="18" rx="4" fill="#E5E7EB" />
                  <text
                    x="23"
                    y="12.5"
                    textAnchor="middle"
                    fill="#111111"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    BR-381
                  </text>
                </g>

                {/* Hub Node: Manhuaçu */}
                <circle cx="560" cy="262" r="7.5" fill="#FF8A00" stroke="#FFF3E0" strokeWidth="2.5" />
                <text
                  x="522"
                  y="243"
                  fill="#FFFFFF"
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="Outfit, sans-serif"
                >
                  Manhuaçu
                </text>

                {/* City Node: Vitória */}
                <circle cx="725" cy="288" r="5" fill="#FFFFFF" stroke="#FF8A00" strokeWidth="2.5" />
                <text
                  x="735"
                  y="293"
                  fill="#FFFFFF"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="Outfit, sans-serif"
                >
                  Vitória
                </text>

                {/* City Node: Juiz de Fora */}
                <circle cx="365" cy="412" r="3.5" fill="#D1D5DB" />
                <text
                  x="295"
                  y="404"
                  fill="#E5E7EB"
                  fontSize="12"
                  fontWeight="500"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  Juiz de Fora
                </text>
              </svg>

              {/* Interactive HTML Button Markers over Map */}
              {markerPositions.map((pin) => {
                const leftPct = `${((pin.x / 820) * 100).toFixed(1)}%`;
                const topPct = `${((pin.y / 460) * 100).toFixed(1)}%`;
                const isSelected = selectedPinFreight?.id === pin.id;

                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => setSelectedPinFreight(pin.freight)}
                    aria-label={`Marcador de frete ${pin.freight.code} ${pin.freight.originCity} para ${pin.freight.destinationCity}`}
                    style={{ left: leftPct, top: topPct }}
                    className={`absolute -translate-x-1/2 -translate-y-full z-10 group cursor-pointer transition-transform duration-150 ${
                      isSelected ? 'scale-125' : 'hover:scale-110'
                    }`}
                  >
                    <div className="relative flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#FF9E1B] to-[#E85D04] border border-amber-200/60 shadow-[0_4px_14px_rgba(255,138,0,0.65)] flex items-center justify-center">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#E85D04] -mt-0.5" />
                      <div className="hidden group-hover:block absolute -top-8 whitespace-nowrap rounded-md bg-[#111111]/95 border border-[#FF8A00]/40 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg">
                        {pin.freight.originCity} → {pin.freight.destinationCity} ({formatBrl(pin.freight.offeredValueBrl)})
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Rich Marker Selection Card (FASE B — Exibição de Oportunidades no Mapa) */}
          {selectedPinFreight && (
            <div
              role="dialog"
              aria-label={`Resumo da oportunidade ${selectedPinFreight.code}`}
              className="absolute bottom-3 left-3 md:left-[234px] right-12 z-30 rounded-xl bg-[#141418]/95 backdrop-blur-md border border-[#FF8A00]/60 p-3 shadow-2xl text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-[#FF8A00]">
                    {selectedPinFreight.code}
                  </span>{' '}
                  <span className="text-neutral-400">•</span>{' '}
                  <strong className="text-white">
                    {selectedPinFreight.originCity}/{selectedPinFreight.originUf} →{' '}
                    {selectedPinFreight.destinationCity}/{selectedPinFreight.destinationUf}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPinFreight(null)}
                  aria-label="Fechar resumo do marcador"
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px] text-neutral-300">
                <div>
                  <span className="text-neutral-500 block">Distância / Peso</span>
                  <strong className="font-mono text-white">
                    {selectedPinFreight.distanceKm} km • {(selectedPinFreight.weightKg / 1000).toFixed(1)} t
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Carga</span>
                  <strong className="text-white truncate block">{selectedPinFreight.cargoType}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Veículo / Coleta</span>
                  <strong className="text-white">
                    {selectedPinFreight.vehicleRequired} • {formatDateBr(selectedPinFreight.pickupDate)}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Valor Ofertado</span>
                  <strong className="font-mono text-[#FF8A00]">
                    {formatBrl(selectedPinFreight.offeredValueBrl)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10">
                <span className="text-[10px] text-neutral-400">
                  Situação:{' '}
                  <strong className="text-emerald-400">
                    {selectedPinFreight.status === 'PUBLISHED'
                      ? 'Publicado'
                      : selectedPinFreight.status === 'IN_NEGOTIATION'
                      ? 'Em negociação'
                      : 'Em operação'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedPinFreight;
                    setSelectedPinFreight(null);
                    onSelectFreight(target);
                  }}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold text-[11px] cursor-pointer"
                >
                  Abrir detalhes da oportunidade →
                </button>
              </div>
            </div>
          )}

          {/* Left Filter Overlay Card ("Filtrar oportunidades") */}
          <form
            onSubmit={handleApplyFilters}
            className="relative z-20 w-full md:w-[218px] shrink-0 m-2 rounded-xl bg-[#18181b]/95 backdrop-blur-md border border-white/[0.09] p-3 flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-white">
                  Filtrar oportunidades
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((prev) => !prev)}
                  title="Alternar filtros avançados (Implemento, Peso, Valor, Data, UF)"
                  aria-label="Alternar filtros avançados do NEXGRID"
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    showAdvancedFilters
                      ? 'bg-[#FF8A00]/20 text-[#FF8A00]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Origem */}
                <div>
                  <label
                    htmlFor="nexgrid-origin"
                    className="flex items-center gap-1.5 text-[11px] text-neutral-300 mb-0.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                    <span>Origem</span>
                  </label>
                  <select
                    id="nexgrid-origin"
                    value={originDraft}
                    onChange={(e) => setOriginDraft(e.target.value)}
                    className="w-full rounded-lg bg-[#232327] border border-white/10 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">Selecione...</option>
                    <option value="Manhuaçu">Manhuaçu/MG</option>
                    <option value="Caratinga">Caratinga/MG</option>
                    <option value="Ipatinga">Ipatinga/MG</option>
                    <option value="Ponte Nova">Ponte Nova/MG</option>
                    <option value="Reduto">Reduto/MG</option>
                    <option value="Além Paraíba">Além Paraíba/MG</option>
                  </select>
                </div>

                {/* Destino */}
                <div>
                  <label
                    htmlFor="nexgrid-destination"
                    className="flex items-center gap-1.5 text-[11px] text-neutral-300 mb-0.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                    <span>Destino</span>
                  </label>
                  <select
                    id="nexgrid-destination"
                    value={destinationDraft}
                    onChange={(e) => setDestinationDraft(e.target.value)}
                    className="w-full rounded-lg bg-[#232327] border border-white/10 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">Selecione...</option>
                    <option value="Vitória">Vitória/ES</option>
                    <option value="Belo Horizonte">Belo Horizonte/MG</option>
                    <option value="Rio de Janeiro">Rio de Janeiro/RJ</option>
                    <option value="Governador Valadares">Governador Valadares/MG</option>
                    <option value="Muriaé">Muriaé/MG</option>
                    <option value="Juiz de Fora">Juiz de Fora/MG</option>
                    <option value="São Paulo">São Paulo/SP</option>
                  </select>
                </div>

                {/* Tipo de veículo */}
                <div>
                  <label
                    htmlFor="nexgrid-vehicle"
                    className="flex items-center gap-1.5 text-[11px] text-neutral-300 mb-0.5"
                  >
                    <Truck className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                    <span>Tipo de veículo</span>
                  </label>
                  <select
                    id="nexgrid-vehicle"
                    value={vehicleDraft}
                    onChange={(e) => setVehicleDraft(e.target.value)}
                    className="w-full rounded-lg bg-[#232327] border border-white/10 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Truck">Truck</option>
                    <option value="Carreta">Carreta</option>
                    <option value="Carreta LS">Carreta LS</option>
                    <option value="Bitruck">Bitruck</option>
                    <option value="Toco">Toco</option>
                  </select>
                </div>

                {/* Tipo de carga */}
                <div>
                  <label
                    htmlFor="nexgrid-cargo"
                    className="flex items-center gap-1.5 text-[11px] text-neutral-300 mb-0.5"
                  >
                    <Grid className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                    <span>Tipo de carga</span>
                  </label>
                  <select
                    id="nexgrid-cargo"
                    value={cargoDraft}
                    onChange={(e) => setCargoDraft(e.target.value)}
                    className="w-full rounded-lg bg-[#232327] border border-white/10 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Insumos agrícolas">Insumos agrícolas</option>
                    <option value="Fertilizantes">Fertilizantes</option>
                    <option value="Toras de madeira">Toras de madeira</option>
                    <option value="Estruturas metálicas">Estruturas metálicas</option>
                    <option value="Cimento ensacado">Cimento ensacado</option>
                    <option value="Café">Café beneficiado</option>
                  </select>
                </div>

                {/* Raio de busca */}
                <div className="pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Raio de busca</span>
                    </span>
                    <span className="font-mono text-neutral-200 tabular-nums">
                      {radiusDraft} km
                    </span>
                  </div>
                  <input
                    id="nexgrid-radius"
                    type="range"
                    min={50}
                    max={500}
                    step={25}
                    value={radiusDraft}
                    onChange={(e) => setRadiusDraft(Number(e.target.value))}
                    aria-label="Raio de busca em quilômetros"
                    style={{
                      background: `linear-gradient(to right, #FF8A00 0%, #FF8A00 ${
                        ((radiusDraft - 50) / 450) * 100
                      }%, #323236 ${((radiusDraft - 50) / 450) * 100}%, #323236 100%)`,
                    }}
                    className="w-full nex-slider"
                  />
                </div>

                {/* Expandable Advanced Filters (Implemento, UF, Valor mín/máx, Peso, Situação) */}
                {(showAdvancedFilters || fullPageMode) && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label htmlFor="nexgrid-uf" className="block text-neutral-400 mb-0.5">
                          UF
                        </label>
                        <select
                          id="nexgrid-uf"
                          value={ufDraft}
                          onChange={(e) => setUfDraft(e.target.value)}
                          className="w-full rounded bg-[#232327] border border-white/10 px-1.5 py-1 text-[11px] text-white"
                        >
                          <option value="Todos">Todas</option>
                          <option value="MG">MG</option>
                          <option value="ES">ES</option>
                          <option value="RJ">RJ</option>
                          <option value="SP">SP</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="nexgrid-impl" className="block text-neutral-400 mb-0.5">
                          Implemento
                        </label>
                        <select
                          id="nexgrid-impl"
                          value={implementDraft}
                          onChange={(e) => setImplementDraft(e.target.value)}
                          className="w-full rounded bg-[#232327] border border-white/10 px-1.5 py-1 text-[11px] text-white"
                        >
                          <option value="Todos">Todos</option>
                          <option value="Graneleiro">Graneleiro</option>
                          <option value="Grade Baixa">Grade Baixa</option>
                          <option value="Sider">Sider</option>
                          <option value="Baú">Baú</option>
                          <option value="Prancha">Prancha</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label htmlFor="nexgrid-minval" className="block text-neutral-400 mb-0.5">
                          Valor mín (R$)
                        </label>
                        <input
                          id="nexgrid-minval"
                          type="number"
                          placeholder="0"
                          value={minValueDraft}
                          onChange={(e) => setMinValueDraft(e.target.value)}
                          className="w-full rounded bg-[#232327] border border-white/10 px-1.5 py-1 text-[11px] text-white font-mono"
                        />
                      </div>
                      <div>
                        <label htmlFor="nexgrid-maxval" className="block text-neutral-400 mb-0.5">
                          Valor máx (R$)
                        </label>
                        <input
                          id="nexgrid-maxval"
                          type="number"
                          placeholder="20000"
                          value={maxValueDraft}
                          onChange={(e) => setMaxValueDraft(e.target.value)}
                          className="w-full rounded bg-[#232327] border border-white/10 px-1.5 py-1 text-[11px] text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="mt-2.5 w-full rounded-lg bg-gradient-to-r from-[#FF8A00] to-[#E85D04] hover:from-[#ff981f] hover:to-[#f3680e] text-black font-semibold text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(255,138,0,0.3)] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Filter className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Aplicar filtros</span>
            </button>
          </form>

          {/* Map Controls (Top-Right Expand + Bottom-Right Zoom) */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-label={isExpanded ? 'Reduzir mapa NEXGRID' : 'Expandir mapa NEXGRID'}
              className="w-7 h-7 rounded-lg bg-[#1d1d20]/90 hover:bg-[#29292d] border border-white/10 flex items-center justify-center text-neutral-200 transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col rounded-lg overflow-hidden bg-[#1d1d20]/90 border border-white/10">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
              aria-label="Aumentar zoom do mapa"
              className="w-7 h-7 hover:bg-[#29292d] flex items-center justify-center text-neutral-200 border-b border-white/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.85, Number((z - 0.15).toFixed(2))))}
              aria-label="Reduzir zoom do mapa"
              className="w-7 h-7 hover:bg-[#29292d] flex items-center justify-center text-neutral-200 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column inside NEXGRID: Oportunidades próximas (Cols 8-12) */}
        <div className="xl:col-span-5 flex flex-col justify-between bg-[#1b1b1e]/80 rounded-xl border border-white/[0.06] p-3">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs lg:text-sm font-semibold text-white">
                Oportunidades próximas ({filteredFreights.length})
              </h3>
              <button
                type="button"
                onClick={onViewAllFreights}
                className="text-xs font-medium text-[#FF8A00] hover:text-[#ffa333] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Ver todas</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {filteredFreights.length === 0 ? (
              <div className="rounded-xl bg-[#141416] border border-white/[0.06] p-5 text-center my-2">
                <p className="text-xs text-neutral-300 font-medium">
                  Nenhum frete encontrado para os filtros selecionados.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#FF8A00]/15 text-[#FF8A00] text-xs font-medium hover:bg-[#FF8A00]/25 transition-colors cursor-pointer"
                >
                  Restaurar oportunidades da região
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFreights.slice(0, fullPageMode ? 8 : 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectFreight(item)}
                    className="w-full text-left rounded-xl bg-[#222225]/90 hover:bg-[#28282c] border border-white/[0.07] hover:border-[#FF8A00]/40 p-2.5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#2c2219] border border-[#FF8A00]/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Truck className="w-4 h-4 text-[#FF8A00]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-white truncate">
                            {item.originCity}/{item.originUf}{' '}
                            <span className="text-neutral-400 mx-0.5">→</span>{' '}
                            {item.destinationCity}/{item.destinationUf}
                          </p>
                          <span className="text-[11px] font-mono text-neutral-300 tabular-nums shrink-0">
                            {item.distanceKm} km
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[11px] text-neutral-400 truncate">
                            Carga: {item.cargoType}
                          </p>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#FF8A00] transition-colors shrink-0" />
                        </div>

                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-neutral-400">
                            Veículo: <strong className="text-neutral-200 font-medium">{item.vehicleRequired}</strong>
                          </span>
                          <span className="text-xs lg:text-sm font-bold text-white tabular-nums">
                            {formatBrl(item.offeredValueBrl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
