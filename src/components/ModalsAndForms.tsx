import React, { useState } from 'react';
import {
  CheckCircle2,
  Compass,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import type { FreightItem, GeocodeAddressResponse } from '../types/nexcarga';
import {
  calculateDistanceKm,
  calculatePlatformFees,
  formatBrl,
  formatDateBr,
  validateCep,
} from '../utils/logisticsRules';

interface PublishFreightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishSuccess: (newFreightData: {
    originCity: string;
    originUf: string;
    originCep: string;
    originStreet: string;
    originNumber: string;
    originComplement: string;
    originNeighborhood: string;
    destinationCity: string;
    destinationUf: string;
    destinationCep: string;
    destinationStreet: string;
    destinationNumber: string;
    destinationComplement: string;
    destinationNeighborhood: string;
    distanceKm: number;
    cargoType: string;
    vehicleRequired: string;
    implementRequired: string;
    weightKg: number;
    volumeM3: number;
    offeredValueBrl: number;
    pickupDate: string;
    deliveryDate: string;
    visibility: 'PUBLIC' | 'INVITED_ONLY' | 'PRIVATE';
    notes: string;
  }) => Promise<void>;
}

export const PublishFreightModal: React.FC<PublishFreightModalProps> = ({
  isOpen,
  onClose,
  onPublishSuccess,
}) => {
  const [originCity, setOriginCity] = useState('Manhuaçu');
  const [originUf, setOriginUf] = useState('MG');
  const [originCep, setOriginCep] = useState('36900-000');
  const [originStreet, setOriginStreet] = useState('Rodovia BR-262');
  const [originNumber, setOriginNumber] = useState('Km 38');
  const [originComplement, setOriginComplement] = useState('Galpão 01');
  const [originNeighborhood, setOriginNeighborhood] = useState('Distrito Industrial');

  const [destinationCity, setDestinationCity] = useState('Vitória');
  const [destinationUf, setDestinationUf] = useState('ES');
  const [destinationCep, setDestinationCep] = useState('29010-000');
  const [destinationStreet, setDestinationStreet] = useState('Av. Elias Miguel');
  const [destinationNumber, setDestinationNumber] = useState('450');
  const [destinationComplement, setDestinationComplement] = useState('Portão 03');
  const [destinationNeighborhood, setDestinationNeighborhood] = useState('Centro Portuário');

  const [distanceKm, setDistanceKm] = useState(295);
  const [cargoType, setCargoType] = useState('Café beneficiado (Sacas)');
  const [vehicleRequired, setVehicleRequired] = useState('Truck');
  const [implementRequired, setImplementRequired] = useState('Graneleiro');
  const [weightKg, setWeightKg] = useState(14500);
  const [volumeM3, setVolumeM3] = useState(48);
  const [offeredValueBrl, setOfferedValueBrl] = useState(5850);
  const [pickupDate, setPickupDate] = useState('2026-11-07');
  const [deliveryDate, setDeliveryDate] = useState('2026-11-08');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INVITED_ONLY' | 'PRIVATE'>('PUBLIC');
  const [notes, setNotes] = useState('Carregamento agendado no armazém Manhuaçu BR-262.');
  const [geocodedPreview, setGeocodedPreview] = useState<{
    origLat: number;
    origLng: number;
    destLat: number;
    destLng: number;
    source: string;
  } | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const fees = calculatePlatformFees(offeredValueBrl, 1.75, 1.75);

  const handleGeocodePreview = async () => {
    setGeocodingLoading(true);
    setError(null);
    try {
      const [resOrig, resDest] = await Promise.all([
        fetch('/api/nexgrid/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: originCity,
            uf: originUf,
            cep: originCep,
            street: originStreet,
            number: originNumber,
            neighborhood: originNeighborhood,
          }),
        }),
        fetch('/api/nexgrid/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: destinationCity,
            uf: destinationUf,
            cep: destinationCep,
            street: destinationStreet,
            number: destinationNumber,
            neighborhood: destinationNeighborhood,
          }),
        }),
      ]);

      if (resOrig.status === 429 || resDest.status === 429) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }

      if (resOrig.ok && resDest.ok) {
        const origData = (await resOrig.json()) as GeocodeAddressResponse;
        const destData = (await resDest.json()) as GeocodeAddressResponse;
        const geodesic = calculateDistanceKm(
          origData.latitude,
          origData.longitude,
          destData.latitude,
          destData.longitude
        );
        const estimatedRoadKm = Math.max(15, Math.round(geodesic * 1.28));
        setDistanceKm(estimatedRoadKm);
        setGeocodedPreview({
          origLat: origData.latitude,
          origLng: origData.longitude,
          destLat: destData.latitude,
          destLng: destData.longitude,
          source: origData.source,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!originCity.trim() || !destinationCity.trim() || !cargoType.trim()) {
      setError('Preencha cidade de origem, destino e tipo de carga.');
      return;
    }
    if (!validateCep(originCep) || !validateCep(destinationCep)) {
      setError('Informe CEPs brasileiros válidos no formato 00000-000.');
      return;
    }
    if (offeredValueBrl <= 0 || weightKg <= 0) {
      setError('O valor do frete e o peso da carga devem ser maiores que zero.');
      return;
    }

    setSubmitting(true);
    try {
      await onPublishSuccess({
        originCity: originCity.trim(),
        originUf,
        originCep,
        originStreet: originStreet.trim(),
        originNumber: originNumber.trim(),
        originComplement: originComplement.trim(),
        originNeighborhood: originNeighborhood.trim(),
        destinationCity: destinationCity.trim(),
        destinationUf,
        destinationCep,
        destinationStreet: destinationStreet.trim(),
        destinationNumber: destinationNumber.trim(),
        destinationComplement: destinationComplement.trim(),
        destinationNeighborhood: destinationNeighborhood.trim(),
        distanceKm,
        cargoType: cargoType.trim(),
        vehicleRequired,
        implementRequired,
        weightKg,
        volumeM3,
        offeredValueBrl,
        pickupDate,
        deliveryDate,
        visibility,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar frete.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-publish-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-[#18181b] border border-white/15 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <h2 id="modal-publish-title" className="text-lg font-bold text-white">
              Publicar Novo Frete na NexCarga (Endereçamento Georreferenciado)
            </h2>
            <p className="text-xs text-neutral-400">
              O endereço completo é validado e geocodificado pelo servidor para posicionamento exato no Radar NEXGRID.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de publicação"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Endereço Completo de Origem */}
          <div className="rounded-xl bg-[#131316] border border-white/[0.07] p-3.5 space-y-2.5">
            <h3 className="text-xs font-bold text-[#FF8A00] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>1. Endereço de Coleta (Origem)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label htmlFor="pub-origin-cep" className="block text-[11px] text-neutral-300 mb-1">
                  CEP Origem
                </label>
                <input
                  id="pub-origin-cep"
                  type="text"
                  value={originCep}
                  onChange={(e) => setOriginCep(e.target.value)}
                  placeholder="36900-000"
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pub-origin-city" className="block text-[11px] text-neutral-300 mb-1">
                  Município de Origem
                </label>
                <input
                  id="pub-origin-city"
                  type="text"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  required
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pub-origin-uf" className="block text-[11px] text-neutral-300 mb-1">
                  UF Origem
                </label>
                <select
                  id="pub-origin-uf"
                  value={originUf}
                  onChange={(e) => setOriginUf(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="MG">MG</option>
                  <option value="ES">ES</option>
                  <option value="RJ">RJ</option>
                  <option value="SP">SP</option>
                  <option value="BA">BA</option>
                  <option value="PR">PR</option>
                  <option value="GO">GO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label htmlFor="pub-origin-street" className="block text-[11px] text-neutral-400 mb-1">
                  Logradouro / Rodovia
                </label>
                <input
                  id="pub-origin-street"
                  type="text"
                  value={originStreet}
                  onChange={(e) => setOriginStreet(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pub-origin-num" className="block text-[11px] text-neutral-400 mb-1">
                  Número / Km
                </label>
                <input
                  id="pub-origin-num"
                  type="text"
                  value={originNumber}
                  onChange={(e) => setOriginNumber(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pub-origin-neigh" className="block text-[11px] text-neutral-400 mb-1">
                  Bairro / Distrito
                </label>
                <input
                  id="pub-origin-neigh"
                  type="text"
                  value={originNeighborhood}
                  onChange={(e) => setOriginNeighborhood(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Endereço Completo de Destino */}
          <div className="rounded-xl bg-[#131316] border border-white/[0.07] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[#FF8A00] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>2. Endereço de Entrega (Destino)</span>
              </h3>
              <button
                type="button"
                onClick={handleGeocodePreview}
                disabled={geocodingLoading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FF8A00]/15 hover:bg-[#FF8A00]/25 text-[#FF8A00] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>
                  {geocodingLoading
                    ? 'Geocodificando...'
                    : 'Validar Coordenadas e Distância no Servidor'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label htmlFor="pub-dest-cep" className="block text-[11px] text-neutral-300 mb-1">
                  CEP Destino
                </label>
                <input
                  id="pub-dest-cep"
                  type="text"
                  value={destinationCep}
                  onChange={(e) => setDestinationCep(e.target.value)}
                  placeholder="29010-000"
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pub-dest-city" className="block text-[11px] text-neutral-300 mb-1">
                  Município de Destino
                </label>
                <input
                  id="pub-dest-city"
                  type="text"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  required
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pub-dest-uf" className="block text-[11px] text-neutral-300 mb-1">
                  UF Destino
                </label>
                <select
                  id="pub-dest-uf"
                  value={destinationUf}
                  onChange={(e) => setDestinationUf(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ES">ES</option>
                  <option value="MG">MG</option>
                  <option value="RJ">RJ</option>
                  <option value="SP">SP</option>
                  <option value="BA">BA</option>
                  <option value="PR">PR</option>
                  <option value="GO">GO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label htmlFor="pub-dest-street" className="block text-[11px] text-neutral-400 mb-1">
                  Logradouro / Terminal
                </label>
                <input
                  id="pub-dest-street"
                  type="text"
                  value={destinationStreet}
                  onChange={(e) => setDestinationStreet(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pub-dest-num" className="block text-[11px] text-neutral-400 mb-1">
                  Número
                </label>
                <input
                  id="pub-dest-num"
                  type="text"
                  value={destinationNumber}
                  onChange={(e) => setDestinationNumber(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pub-dest-neigh" className="block text-[11px] text-neutral-400 mb-1">
                  Bairro
                </label>
                <input
                  id="pub-dest-neigh"
                  type="text"
                  value={destinationNeighborhood}
                  onChange={(e) => setDestinationNeighborhood(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {geocodedPreview && (
              <div className="pt-1 text-[11px] text-emerald-400 font-mono flex flex-wrap items-center justify-between gap-2">
                <span>
                  ✓ Origem ({geocodedPreview.origLat}, {geocodedPreview.origLng}) → Destino (
                  {geocodedPreview.destLat}, {geocodedPreview.destLng})
                </span>
                <span>Distância calculada: {distanceKm} km</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="pub-cargo" className="block text-xs text-neutral-300 mb-1">
                Tipo de Carga
              </label>
              <input
                id="pub-cargo"
                type="text"
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
                required
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label htmlFor="pub-vehicle" className="block text-xs text-neutral-300 mb-1">
                Veículo Necessário
              </label>
              <select
                id="pub-vehicle"
                value={vehicleRequired}
                onChange={(e) => setVehicleRequired(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="Truck">Truck</option>
                <option value="Carreta">Carreta</option>
                <option value="Carreta LS">Carreta LS</option>
                <option value="Bitruck">Bitruck</option>
                <option value="Toco">Toco</option>
              </select>
            </div>
            <div>
              <label htmlFor="pub-implement" className="block text-xs text-neutral-300 mb-1">
                Implemento Rodoviário
              </label>
              <select
                id="pub-implement"
                value={implementRequired}
                onChange={(e) => setImplementRequired(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="Graneleiro">Graneleiro</option>
                <option value="Grade Baixa">Grade Baixa</option>
                <option value="Sider">Sider</option>
                <option value="Baú Alumínio">Baú Alumínio</option>
                <option value="Baú Frigorífico">Baú Frigorífico</option>
                <option value="Florestal / Fueiro">Florestal / Fueiro</option>
                <option value="Carga Seca">Carga Seca</option>
              </select>
            </div>
            <div>
              <label htmlFor="pub-visibility" className="block text-xs text-neutral-300 mb-1">
                Visibilidade NEXGRID
              </label>
              <select
                id="pub-visibility"
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as 'PUBLIC' | 'INVITED_ONLY' | 'PRIVATE')
                }
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="PUBLIC">Pública no Radar</option>
                <option value="INVITED_ONLY">Transportadores Homologados</option>
                <option value="PRIVATE">Privada (Interna)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="pub-distance" className="block text-xs text-neutral-300 mb-1">
                Distância (km)
              </label>
              <input
                id="pub-distance"
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="pub-weight" className="block text-xs text-neutral-300 mb-1">
                Peso Total (kg)
              </label>
              <input
                id="pub-weight"
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="pub-value" className="block text-xs text-neutral-300 mb-1">
                Valor Ofertado (R$)
              </label>
              <input
                id="pub-value"
                type="number"
                step="50"
                value={offeredValueBrl}
                onChange={(e) => setOfferedValueBrl(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-[#FF8A00]/50 px-3 py-2 text-xs text-white font-mono font-semibold"
              />
            </div>
            <div>
              <label htmlFor="pub-pickup" className="block text-xs text-neutral-300 mb-1">
                Data de Coleta
              </label>
              <input
                id="pub-pickup"
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pub-notes" className="block text-xs text-neutral-300 mb-1">
              Observações Operacionais e Exigências
            </label>
            <input
              id="pub-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-xs text-white"
            />
          </div>

          {/* Transparent Non-Custodial Fee Summary */}
          <div className="rounded-xl bg-[#121215] border border-white/[0.07] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400">
              Taxa de manutenção NexCarga (1,75% contratante + 1,75% transportador):
            </span>
            <span className="font-mono text-[#FF8A00] font-semibold tabular-nums">
              Contratante: {formatBrl(fees.companyFeeBrl)} • Prestador: {formatBrl(fees.providerFeeBrl)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] hover:from-[#ff991f] hover:to-[#f26409] text-black font-semibold text-xs cursor-pointer shadow-[0_4px_14px_rgba(255,138,0,0.35)]"
            >
              {submitting ? 'Publicando...' : 'Confirmar e Publicar Frete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FreightDetailModalProps {
  freight: FreightItem | null;
  onClose: () => void;
  onSubmitProposal: (payload: {
    freightId: string;
    driverName: string;
    driverRntrc: string;
    vehicleDescription: string;
    proposedValueBrl: number;
    estimatedDeliveryDays: number;
    notes: string;
  }) => Promise<void>;
}

export const FreightDetailModal: React.FC<FreightDetailModalProps> = ({
  freight,
  onClose,
  onSubmitProposal,
}) => {
  const [proposedValue, setProposedValue] = useState<number>(freight?.offeredValueBrl || 5600);
  const [driverName, setDriverName] = useState('João Batista Oliveira');
  const [driverRntrc, setDriverRntrc] = useState('048912340');
  const [vehicleDescription, setVehicleDescription] = useState('Volvo VM 270 Truck • Graneleiro');
  const [notes, setNotes] = useState('Disponibilidade imediata em Manhuaçu/MG. Documentos ANTT homologados.');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  React.useEffect(() => {
    if (freight) {
      setProposedValue(freight.offeredValueBrl);
      setSubmittedSuccess(false);
    }
  }, [freight]);

  if (!freight) return null;

  const fees = calculatePlatformFees(proposedValue, 1.75, 1.75);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitProposal({
        freightId: freight.id,
        driverName,
        driverRntrc,
        vehicleDescription,
        proposedValueBrl: proposedValue,
        estimatedDeliveryDays: Math.max(1, Math.ceil(freight.distanceKm / 400)),
        notes,
      });
      setSubmittedSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-freight-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#18181b] border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div>
            <span className="text-xs font-mono text-[#FF8A00] font-semibold">
              {freight.code} • {freight.organizationName}
            </span>
            <h2 id="modal-freight-detail-title" className="text-lg font-bold text-white mt-0.5">
              {freight.originCity}/{freight.originUf} → {freight.destinationCity}/{freight.destinationUf}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do frete"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
          <div className="rounded-xl bg-[#222226] p-3 border border-white/5">
            <span className="text-neutral-400 block">Distância Estimada</span>
            <strong className="text-white font-mono text-sm tabular-nums">{freight.distanceKm} km</strong>
          </div>
          <div className="rounded-xl bg-[#222226] p-3 border border-white/5">
            <span className="text-neutral-400 block">Valor Ofertado</span>
            <strong className="text-[#FF8A00] font-mono text-sm tabular-nums">
              {formatBrl(freight.offeredValueBrl)}
            </strong>
          </div>
          <div className="rounded-xl bg-[#222226] p-3 border border-white/5">
            <span className="text-neutral-400 block">Peso / Volume</span>
            <strong className="text-white font-mono text-sm tabular-nums">
              {(freight.weightKg / 1000).toFixed(1)} t • {freight.volumeM3} m³
            </strong>
          </div>
        </div>

        <div className="space-y-2 text-xs text-neutral-300 bg-[#131316] rounded-xl p-3.5 border border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#FF8A00]" />
            <span>
              Carga: <strong className="text-white">{freight.cargoType}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#FF8A00]" />
            <span>
              Conjunto Exigido: <strong className="text-white">{freight.vehicleRequired} • {freight.implementRequired}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#FF8A00]" />
            <span>
              Coleta: <strong className="text-white">{formatDateBr(freight.pickupDate)}</strong> (
              {freight.originStreet ? `${freight.originStreet}, ${freight.originNumber || ''} - ` : ''}
              CEP {freight.originCep}) → Entrega:{' '}
              <strong className="text-white">{formatDateBr(freight.deliveryDate)}</strong> (CEP{' '}
              {freight.destinationCep})
            </span>
          </div>
          <div className="text-[11px] font-mono text-neutral-400">
            Coordenadas validadas: ({freight.originLat}, {freight.originLng}) → (
            {freight.destinationLat}, {freight.destinationLng})
          </div>
          {freight.notes && (
            <p className="text-neutral-400 pt-1 border-t border-white/5">
              Obs: {freight.notes}
            </p>
          )}
        </div>

        {submittedSuccess ? (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-4 text-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">
              Proposta enviada e registrada com sucesso!
            </p>
            <p className="text-xs text-neutral-300 mt-1">
              O embarcador já recebeu a notificação no painel de Propostas.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 px-4 py-2 rounded-lg bg-[#FF8A00] text-black font-semibold text-xs cursor-pointer"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3 border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FF8A00]" />
              <span>Enviar Proposta Comercial para este Frete</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="prop-driver" className="block text-[11px] text-neutral-400 mb-1">
                  Motorista / Responsável
                </label>
                <input
                  id="prop-driver"
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="prop-value" className="block text-[11px] text-neutral-400 mb-1">
                  Valor da Proposta (R$)
                </label>
                <input
                  id="prop-value"
                  type="number"
                  step="20"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(Number(e.target.value))}
                  required
                  className="w-full rounded-lg bg-[#232328] border border-[#FF8A00]/50 px-3 py-1.5 text-xs text-white font-mono font-semibold"
                />
              </div>
            </div>

            <div className="text-[11px] text-neutral-400 flex items-center justify-between bg-[#131316] px-3 py-2 rounded-lg">
              <span>Líquido estimado ao transportador (após taxa 1,75%):</span>
              <strong className="text-emerald-400 font-mono tabular-nums">
                {formatBrl(fees.netProviderValueBrl)}
              </strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-300 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold text-xs cursor-pointer"
              >
                {submitting ? 'Enviando...' : 'Enviar Proposta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
