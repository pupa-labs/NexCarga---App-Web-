import type {
  AdminControlOverviewMetrics,
  AdminPermissionAction,
  AdminUserItem,
  ContractItem,
  CostCalculationInput,
  CostCalculationResult,
  DelinquencyPolicy,
  DocumentItem,
  FeeRuleItem,
  FreightItem,
  GeocodeAddressRequest,
  GeocodeAddressResponse,
  ImmutableFeeSnapshot,
  NavSectionId,
  NexCargaTrustRequirement,
  NexCargaTrustStatus,
  OrganizationItem,
  PartnerCommissionItem,
  PaymentTransactionItem,
  RolePermissionMatrix,
  StorageBucketName,
  SubscriptionItem,
  TrustEntityCategory,
  UserRole,
} from '../types/nexcarga';

/**
 * Formatação monetária oficial pt-BR: R$ 1.234,56
 */
export function formatBrl(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const formattedNumber = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `R$ ${formattedNumber}`;
}

/**
 * Formatação de data brasileira: DD/MM/AAAA
 */
export function formatDateBr(isoOrDate: string): string {
  if (!isoOrDate) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoOrDate)) return isoOrDate;
  const match = isoOrDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date);
}

/**
 * Validações brasileiras (CPF, CNPJ, CEP, RNTRC)
 */
export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11 && !/^(\d)\1{10}$/.test(digits);
}

export function validateCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  return digits.length === 14 && !/^(\d)\1{13}$/.test(digits);
}

export function validateCep(cep: string): boolean {
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8;
}

export function validateRntrc(rntrc: string): boolean {
  const digits = rntrc.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 12;
}

/**
 * Cálculo da taxa de manutenção da plataforma NexCarga
 * Padrão inicial: 3,5% total (1,75% contratante + 1,75% prestador)
 */
export function calculatePlatformFees(
  freightValueBrl: number,
  companyFeePercent = 1.75,
  providerFeePercent = 1.75
): {
  companyFeePercent: number;
  providerFeePercent: number;
  totalFeePercent: number;
  companyFeeBrl: number;
  providerFeeBrl: number;
  totalPlatformFeeBrl: number;
  netProviderValueBrl: number;
  totalCompanyDisbursementBrl: number;
} {
  const base = Math.max(0, Number(freightValueBrl) || 0);
  const compPct = Math.max(0, Number(companyFeePercent));
  const provPct = Math.max(0, Number(providerFeePercent));
  const totalPct = Number((compPct + provPct).toFixed(2));

  const companyFeeBrl = Number(((base * compPct) / 100).toFixed(2));
  const providerFeeBrl = Number(((base * provPct) / 100).toFixed(2));
  const totalPlatformFeeBrl = Number((companyFeeBrl + providerFeeBrl).toFixed(2));
  const netProviderValueBrl = Number((base - providerFeeBrl).toFixed(2));
  const totalCompanyDisbursementBrl = Number((base + companyFeeBrl).toFixed(2));

  return {
    companyFeePercent: compPct,
    providerFeePercent: provPct,
    totalFeePercent: totalPct,
    companyFeeBrl,
    providerFeeBrl,
    totalPlatformFeeBrl,
    netProviderValueBrl,
    totalCompanyDisbursementBrl,
  };
}

/**
 * Validação matemática de regra de taxa (soma da divisão contratante + prestador = taxa total)
 */
export function validateFeeRuleSplit(
  totalPercent: number,
  companyPercent: number,
  providerPercent: number
): { valid: boolean; error?: string } {
  if (
    !Number.isFinite(totalPercent) ||
    !Number.isFinite(companyPercent) ||
    !Number.isFinite(providerPercent)
  ) {
    return { valid: false, error: 'Percentuais de taxa devem ser numéricos.' };
  }
  if (totalPercent < 0 || companyPercent < 0 || providerPercent < 0) {
    return { valid: false, error: 'Percentuais de taxa não podem ser negativos.' };
  }
  if (totalPercent > 30) {
    return { valid: false, error: 'A taxa total não pode exceder 30%.' };
  }
  const sum = Number((companyPercent + providerPercent).toFixed(2));
  const expected = Number(totalPercent.toFixed(2));
  if (Math.abs(sum - expected) > 0.001) {
    return {
      valid: false,
      error: `Divisão matemática inválida: Contratante (${companyPercent}%) + Prestador (${providerPercent}%) = ${sum}%, diferente do total (${expected}%).`,
    };
  }
  return { valid: true };
}

/**
 * Gera um snapshot imutável de taxa para gravação no contrato
 * Mudanças futuras na regra de taxa nunca alteram retroativamente contratos já firmados.
 */
export function createImmutableFeeSnapshot(
  agreedFreightValueBrl: number,
  activeRule: Pick<
    FeeRuleItem,
    'id' | 'code' | 'name' | 'totalPercent' | 'companyPercent' | 'providerPercent'
  >
): ImmutableFeeSnapshot {
  const calc = calculatePlatformFees(
    agreedFreightValueBrl,
    activeRule.companyPercent,
    activeRule.providerPercent
  );
  return {
    ruleId: activeRule.id,
    ruleCode: activeRule.code,
    ruleName: activeRule.name,
    capturedAt: new Date().toISOString(),
    totalFeePercent: calc.totalFeePercent,
    companyFeePercent: calc.companyFeePercent,
    providerFeePercent: calc.providerFeePercent,
    companyFeeBrl: calc.companyFeeBrl,
    providerFeeBrl: calc.providerFeeBrl,
    totalPlatformFeeBrl: calc.totalPlatformFeeBrl,
    netProviderValueBrl: calc.netProviderValueBrl,
  };
}

/**
 * Motor de Custos Logísticos NexCarga
 */
export function calculateLogisticsCost(
  input: CostCalculationInput,
  companyFeePercent = 1.75,
  providerFeePercent = 1.75
): CostCalculationResult {
  const distanceKm = Math.max(1, Number(input.distanceKm) || 1);
  const consumption = Math.max(0.5, Number(input.avgConsumptionKmL) || 3.0);
  const dieselPrice = Math.max(0, Number(input.dieselPriceBrl) || 6.18);
  const tollCostBrl = Math.max(0, Number(input.tollCostBrl) || 0);
  const operationalDailyBrl = Math.max(0, Number(input.operationalDailyBrl) || 320);
  const marginPercent = Math.max(0, Number(input.marginPercent) || 18);

  const estimatedDays = Math.max(1, Math.ceil(distanceKm / 450));
  const litersNeeded = Number((distanceKm / consumption).toFixed(1));
  const fuelCostBrl = Number((litersNeeded * dieselPrice).toFixed(2));
  const operationalCostBrl = Number((operationalDailyBrl * estimatedDays).toFixed(2));
  const baseTransportCostBrl = Number((fuelCostBrl + tollCostBrl + operationalCostBrl).toFixed(2));
  const suggestedMarginBrl = Number(((baseTransportCostBrl * marginPercent) / 100).toFixed(2));
  const recommendedFreightValueBrl = Number((baseTransportCostBrl + suggestedMarginBrl).toFixed(2));

  const fees = calculatePlatformFees(recommendedFreightValueBrl, companyFeePercent, providerFeePercent);
  const costPerKmBrl = Number((recommendedFreightValueBrl / distanceKm).toFixed(2));

  return {
    distanceKm,
    litersNeeded,
    fuelCostBrl,
    tollCostBrl,
    operationalCostBrl,
    baseTransportCostBrl,
    suggestedMarginBrl,
    companyFeeBrl: fees.companyFeeBrl,
    providerFeeBrl: fees.providerFeeBrl,
    totalPlatformFeeBrl: fees.totalPlatformFeeBrl,
    recommendedFreightValueBrl,
    netDriverEarningsBrl: fees.netProviderValueBrl,
    costPerKmBrl,
    referenceTimestamp: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  };
}

/**
 * Distância geodésica aproximada (Haversine) em km para o Radar NEXGRID
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Base georreferenciada oficial brasileira para validação server-side no NEXGRID
 * Centrada em Manhuaçu/MG (-20.2572, -42.0336), Zona da Mata, Leste de MG e capitais nacionais
 */
const BRAZIL_CITY_COORDS: Record<string, { lat: number; lng: number; uf: string; cepPrefix: string }> = {
  'manhuaçu': { lat: -20.2572, lng: -42.0336, uf: 'MG', cepPrefix: '36900' },
  'manhuacu': { lat: -20.2572, lng: -42.0336, uf: 'MG', cepPrefix: '36900' },
  'reduto': { lat: -20.2422, lng: -41.9081, uf: 'MG', cepPrefix: '36920' },
  'matipó': { lat: -20.2844, lng: -42.3397, uf: 'MG', cepPrefix: '35367' },
  'caratinga': { lat: -19.7897, lng: -42.1392, uf: 'MG', cepPrefix: '35300' },
  'ipatinga': { lat: -19.4683, lng: -42.5367, uf: 'MG', cepPrefix: '35160' },
  'governador valadares': { lat: -18.8511, lng: -41.9494, uf: 'MG', cepPrefix: '35010' },
  'teófilo otoni': { lat: -17.8575, lng: -41.5053, uf: 'MG', cepPrefix: '39800' },
  'ponte nova': { lat: -20.4164, lng: -42.9086, uf: 'MG', cepPrefix: '35430' },
  'muriaé': { lat: -21.1306, lng: -42.3664, uf: 'MG', cepPrefix: '36880' },
  'além paraíba': { lat: -21.8878, lng: -42.7044, uf: 'MG', cepPrefix: '36660' },
  'juiz de fora': { lat: -21.7642, lng: -43.3503, uf: 'MG', cepPrefix: '36010' },
  'belo horizonte': { lat: -19.9167, lng: -43.9345, uf: 'MG', cepPrefix: '30110' },
  'contagem': { lat: -19.9386, lng: -44.0539, uf: 'MG', cepPrefix: '32010' },
  'uberlândia': { lat: -18.9186, lng: -48.2772, uf: 'MG', cepPrefix: '38400' },
  'vitória': { lat: -20.3155, lng: -40.3128, uf: 'ES', cepPrefix: '29010' },
  'vitoria': { lat: -20.3155, lng: -40.3128, uf: 'ES', cepPrefix: '29010' },
  'vila velha': { lat: -20.3297, lng: -40.2925, uf: 'ES', cepPrefix: '29100' },
  'serra': { lat: -20.1286, lng: -40.3078, uf: 'ES', cepPrefix: '29160' },
  'colatina': { lat: -19.5394, lng: -40.6306, uf: 'ES', cepPrefix: '29700' },
  'cachoeiro de itapemirim': { lat: -20.8489, lng: -41.1128, uf: 'ES', cepPrefix: '29300' },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729, uf: 'RJ', cepPrefix: '20010' },
  'campos dos goytacazes': { lat: -21.7545, lng: -41.3244, uf: 'RJ', cepPrefix: '28010' },
  'são paulo': { lat: -23.5505, lng: -46.6333, uf: 'SP', cepPrefix: '01001' },
  'sao paulo': { lat: -23.5505, lng: -46.6333, uf: 'SP', cepPrefix: '01001' },
  'santos': { lat: -23.9608, lng: -46.3336, uf: 'SP', cepPrefix: '11010' },
  'campinas': { lat: -22.9056, lng: -47.0608, uf: 'SP', cepPrefix: '13010' },
  'salvador': { lat: -12.9714, lng: -38.5014, uf: 'BA', cepPrefix: '40010' },
  'curitiba': { lat: -25.4284, lng: -49.2733, uf: 'PR', cepPrefix: '80010' },
  'goiânia': { lat: -16.6869, lng: -49.2648, uf: 'GO', cepPrefix: '74000' },
};

/**
 * Geocodificação determinística e validada no servidor para endereços brasileiros
 * Nunca aceita coordenadas arbitrárias não verificadas do cliente.
 */
export function geocodeBrazilianAddress(req: GeocodeAddressRequest): GeocodeAddressResponse {
  const normalizedCity = (req.city || 'Manhuaçu').trim().toLowerCase();
  const uf = (req.uf || 'MG').trim().toUpperCase();
  const cleanCep = (req.cep || '36900-000').replace(/\D/g, '');
  const formattedCep =
    cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : '36900-000';

  const base = BRAZIL_CITY_COORDS[normalizedCity] || {
    lat: -20.2572,
    lng: -42.0336,
    uf,
    cepPrefix: '36900',
  };

  // Micro-offset determinístico por logradouro/número para posicionar endereços distintos dentro do município
  const addressSeed = `${req.street || ''}-${req.number || ''}-${cleanCep}`;
  let hash = 0;
  for (let i = 0; i < addressSeed.length; i++) {
    hash = (hash * 31 + addressSeed.charCodeAt(i)) % 1000;
  }
  const latOffset = req.street ? ((hash % 40) - 20) * 0.0004 : 0;
  const lngOffset = req.street ? (((hash >> 3) % 40) - 20) * 0.0004 : 0;

  const latitude = Number((base.lat + latOffset).toFixed(5));
  const longitude = Number((base.lng + lngOffset).toFixed(5));

  const streetPart = req.street
    ? `${req.street}${req.number ? `, ${req.number}` : ''}${req.neighborhood ? ` - ${req.neighborhood}` : ''}, `
    : '';
  const formattedAddress = `${streetPart}${req.city || 'Manhuaçu'} - ${uf}, ${formattedCep}, Brasil`;

  return {
    latitude,
    longitude,
    formattedAddress,
    city: req.city || 'Manhuaçu',
    uf,
    cep: formattedCep,
    source: 'NEXGRID_BR_VALIDATION_ENGINE',
    validated: validateCep(formattedCep) && Boolean(req.city && req.city.trim().length >= 2),
  };
}

/**
 * Regras de visibilidade do NEXGRID por perfil e isolamento multi-tenant:
 * - COMPANY: vê suas próprias cargas (inclusive PRIVATE) + cargas PUBLIC do mercado
 * - DRIVER / CARRIER: vê oportunidades PUBLIC e INVITED_ONLY compatíveis; nunca vê cargas PRIVATE de terceiros
 * - SUPER_ADMIN / ADMIN: visão global auditável
 */
export function filterFreightsByRoleVisibility(
  freights: FreightItem[],
  role: UserRole,
  organizationId: string
): FreightItem[] {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return freights;
  }

  return freights.filter((f) => {
    const vis = f.visibility || 'PUBLIC';
    if (f.organizationId === organizationId) {
      return true;
    }
    if (vis === 'PRIVATE') {
      return false;
    }
    return true;
  });
}

/**
 * Filtragem completa do Radar NEXGRID (FASE B — Todos os filtros exigidos)
 * Referência central padrão: Manhuaçu/MG (-20.2572, -42.0336)
 */
export function filterNexgridFreights(
  freights: FreightItem[],
  filters: {
    origin?: string;
    destination?: string;
    uf?: string;
    vehicleType?: string;
    implementType?: string;
    cargoType?: string;
    minWeightKg?: number;
    maxWeightKg?: number;
    minValueBrl?: number;
    maxValueBrl?: number;
    pickupDate?: string;
    status?: string;
    radiusKm?: number;
    searchQuery?: string;
  },
  centerLat = -20.2572,
  centerLng = -42.0336
): FreightItem[] {
  return freights.filter((f) => {
    if (f.status === 'CANCELED') return false;

    if (filters.origin && filters.origin !== 'Todos' && filters.origin !== '') {
      const originLabel = `${f.originCity}/${f.originUf} ${f.originCep}`.toLowerCase();
      if (!originLabel.includes(filters.origin.toLowerCase())) return false;
    }

    if (filters.destination && filters.destination !== 'Todos' && filters.destination !== '') {
      const destLabel = `${f.destinationCity}/${f.destinationUf} ${f.destinationCep}`.toLowerCase();
      if (!destLabel.includes(filters.destination.toLowerCase())) return false;
    }

    if (filters.uf && filters.uf !== 'Todos' && filters.uf !== '') {
      const targetUf = filters.uf.toUpperCase();
      if (f.originUf.toUpperCase() !== targetUf && f.destinationUf.toUpperCase() !== targetUf) {
        return false;
      }
    }

    if (filters.vehicleType && filters.vehicleType !== 'Todos' && filters.vehicleType !== '') {
      if (f.vehicleRequired.toLowerCase() !== filters.vehicleType.toLowerCase()) return false;
    }

    if (
      filters.implementType &&
      filters.implementType !== 'Todos' &&
      filters.implementType !== ''
    ) {
      if (!f.implementRequired.toLowerCase().includes(filters.implementType.toLowerCase())) {
        return false;
      }
    }

    if (filters.cargoType && filters.cargoType !== 'Todos' && filters.cargoType !== '') {
      if (!f.cargoType.toLowerCase().includes(filters.cargoType.toLowerCase())) return false;
    }

    if (filters.minWeightKg && Number(filters.minWeightKg) > 0) {
      if (f.weightKg < Number(filters.minWeightKg)) return false;
    }

    if (filters.maxWeightKg && Number(filters.maxWeightKg) > 0) {
      if (f.weightKg > Number(filters.maxWeightKg)) return false;
    }

    if (filters.minValueBrl && Number(filters.minValueBrl) > 0) {
      if (f.offeredValueBrl < Number(filters.minValueBrl)) return false;
    }

    if (filters.maxValueBrl && Number(filters.maxValueBrl) > 0) {
      if (f.offeredValueBrl > Number(filters.maxValueBrl)) return false;
    }

    if (filters.pickupDate && filters.pickupDate.trim() !== '') {
      if (f.pickupDate !== filters.pickupDate.trim()) return false;
    }

    if (filters.status && filters.status !== 'Todos' && filters.status !== '') {
      if (f.status !== filters.status) return false;
    }

    if (filters.radiusKm && filters.radiusKm > 0) {
      const distFromHub = calculateDistanceKm(centerLat, centerLng, f.originLat, f.originLng);
      if (distFromHub > filters.radiusKm * 3.5) return false;
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const hay = `${f.code} ${f.originCity} ${f.destinationCity} ${f.cargoType} ${f.vehicleRequired} ${f.implementRequired} ${f.organizationName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

/**
 * RBAC de Navegação: Verifica se um perfil tem permissão para acessar determinada seção
 */
export function canRoleAccessSection(role: UserRole, section: NavSectionId): boolean {
  const allSections: NavSectionId[] = [
    'dashboard',
    'publicar-frete',
    'radar-nexgrid',
    'fretes',
    'propostas',
    'contratacoes',
    'operacoes',
    'parceiros',
    'financeiro',
    'documentos',
    'relatorios',
    'nexia',
    'nexia-verify',
    'nexcarga-docs',
    'motor-custos',
    'configuracoes',
    'meu-perfil',
    'nexcarga-trust',
  ];

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return allSections.includes(section);
  }

  const roleMatrix: Record<UserRole, NavSectionId[]> = {
    COMPANY: [
      'dashboard',
      'publicar-frete',
      'radar-nexgrid',
      'fretes',
      'propostas',
      'contratacoes',
      'operacoes',
      'parceiros',
      'financeiro',
      'documentos',
      'relatorios',
      'nexia',
      'nexia-verify',
      'nexcarga-docs',
      'motor-custos',
      'configuracoes',
      'meu-perfil',
      'nexcarga-trust',
    ],
    DRIVER: [
      'dashboard',
      'radar-nexgrid',
      'fretes',
      'propostas',
      'contratacoes',
      'operacoes',
      'financeiro',
      'documentos',
      'nexia',
      'nexia-verify',
      'nexcarga-docs',
      'motor-custos',
      'configuracoes',
      'meu-perfil',
      'nexcarga-trust',
    ],
    CARRIER: [
      'dashboard',
      'radar-nexgrid',
      'fretes',
      'propostas',
      'contratacoes',
      'operacoes',
      'parceiros',
      'financeiro',
      'documentos',
      'relatorios',
      'nexia',
      'nexia-verify',
      'nexcarga-docs',
      'motor-custos',
      'configuracoes',
      'meu-perfil',
      'nexcarga-trust',
    ],
    SUPER_ADMIN: allSections,
    ADMIN: allSections,
    FINANCE: [
      'dashboard',
      'contratacoes',
      'financeiro',
      'parceiros',
      'relatorios',
      'configuracoes',
      'meu-perfil',
      'nexcarga-trust',
    ],
    SUPPORT: [
      'dashboard',
      'fretes',
      'propostas',
      'operacoes',
      'documentos',
      'nexia',
      'configuracoes',
      'meu-perfil',
      'nexcarga-trust',
    ],
    VERIFICATION: [
      'dashboard',
      'documentos',
      'nexia-verify',
      'nexcarga-docs',
      'configuracoes',
      'meu-perfil',
      'nexcarga-trust',
    ],
  };

  return (roleMatrix[role] || []).includes(section);
}

/**
 * RBAC Administrativo (NexCarga Control): Valida permissão específica no servidor
 * Segue o princípio do menor privilégio.
 */
export function hasAdminPermission(
  role: UserRole,
  action: AdminPermissionAction,
  matrix: RolePermissionMatrix
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const allowed = matrix[role] || [];
  return allowed.includes(action);
}

/**
 * Avaliação de Inadimplência (FASE C 5.8)
 * Nunca apaga dados do usuário nem cancela operações logísticas em andamento.
 */
export function evaluateSubscriptionDelinquency(
  subscription: SubscriptionItem,
  policy: DelinquencyPolicy
): {
  recommendedStatus: SubscriptionItem['status'];
  shouldSendPreDueNotice: boolean;
  shouldSendPostDueNotice: boolean;
  shouldSuspendAccess: boolean;
  blockedResources: string[];
  preserveActiveOperations: boolean;
} {
  if (subscription.isManualGrant) {
    return {
      recommendedStatus: 'MANUAL_GRANT',
      shouldSendPreDueNotice: false,
      shouldSendPostDueNotice: false,
      shouldSuspendAccess: false,
      blockedResources: [],
      preserveActiveOperations: true,
    };
  }

  const overdueDays = Math.max(0, Number(subscription.delinquencyDays) || 0);
  if (overdueDays === 0) {
    return {
      recommendedStatus: subscription.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
      shouldSendPreDueNotice: false,
      shouldSendPostDueNotice: false,
      shouldSuspendAccess: false,
      blockedResources: [],
      preserveActiveOperations: true,
    };
  }

  const shouldSendPostDueNotice = overdueDays >= policy.postDueNoticeDays;
  const withinGrace = overdueDays <= policy.gracePeriodDays;
  const shouldSuspendAccess = overdueDays >= policy.autoSuspensionDays;

  return {
    recommendedStatus: shouldSuspendAccess
      ? 'SUSPENDED'
      : withinGrace
      ? 'OVERDUE'
      : 'OVERDUE',
    shouldSendPreDueNotice: false,
    shouldSendPostDueNotice,
    shouldSuspendAccess,
    blockedResources: shouldSuspendAccess ? [...policy.blockedResources] : [],
    preserveActiveOperations: policy.allowActiveOperationsCompletion,
  };
}

/**
 * Cálculo em tempo real dos indicadores globais do NexCarga Control (FASE C 5.1)
 * 100% baseado nos registros reais do banco/estado (zero números aleatórios).
 */
export function calculateAdminControlMetrics(params: {
  users: AdminUserItem[];
  organizations: OrganizationItem[];
  subscriptions: SubscriptionItem[];
  payments: PaymentTransactionItem[];
  freights: FreightItem[];
  contracts: ContractItem[];
  partnerCommissions: PartnerCommissionItem[];
}): AdminControlOverviewMetrics {
  const {
    users,
    organizations,
    subscriptions,
    payments,
    freights,
    contracts,
    partnerCommissions,
  } = params;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const blockedOrSuspendedUsers = users.filter(
    (u) => u.status === 'BLOCKED' || u.status === 'SUSPENDED'
  ).length;

  const registeredCompanies = organizations.filter((o) => o.type === 'COMPANY').length;
  const registeredDrivers = organizations.filter((o) => o.type === 'DRIVER').length;
  const registeredCarriers = organizations.filter((o) => o.type === 'CARRIER').length;

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === 'ACTIVE' || s.status === 'MANUAL_GRANT'
  ).length;
  const trialSubscriptions = subscriptions.filter((s) => s.status === 'TRIAL').length;
  const manualGrantSubscriptions = subscriptions.filter((s) => s.isManualGrant).length;
  const expiredSubscriptions = subscriptions.filter((s) => s.status === 'EXPIRED').length;
  const canceledSubscriptions = subscriptions.filter((s) => s.status === 'CANCELED').length;
  const overdueSubscriptions = subscriptions.filter(
    (s) => s.status === 'OVERDUE' || s.status === 'SUSPENDED'
  ).length;

  // MRR: Soma normalizada para base mensal das assinaturas pagas ativas (excluindo cortesias manuais sem cobrança)
  const mrrBrl = Number(
    subscriptions
      .filter((s) => s.status === 'ACTIVE' && !s.isManualGrant)
      .reduce((acc, sub) => {
        if (sub.planCode === 'ANNUAL') return acc + sub.priceBrl / 12;
        if (sub.planCode === 'QUARTERLY') return acc + sub.priceBrl / 3;
        return acc + sub.priceBrl;
      }, 0)
      .toFixed(2)
  );

  const accumulatedRevenueBrl = Number(
    payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((acc, p) => acc + p.amountBrl, 0)
      .toFixed(2)
  );

  const pendingPaymentsBrl = Number(
    payments
      .filter((p) => p.status === 'PENDING')
      .reduce((acc, p) => acc + p.amountBrl, 0)
      .toFixed(2)
  );

  const delinquencyAmountBrl = Number(
    payments
      .filter((p) => p.status === 'OVERDUE' || p.status === 'DECLINED')
      .reduce((acc, p) => acc + p.amountBrl, 0)
      .toFixed(2)
  );

  const totalPublishedFreights = freights.length;
  const completedContracts = contracts.filter(
    (c) => c.status === 'ACTIVE' || c.status === 'COMPLETED'
  ).length;

  const totalFinancialVolumeBrl = Number(
    contracts.reduce((acc, c) => acc + c.agreedFreightValueBrl, 0).toFixed(2)
  );

  const collectedFeesBrl = Number(
    contracts.reduce((acc, c) => acc + c.totalPlatformFeeBrl, 0).toFixed(2)
  );

  const pendingCommissionsBrl = Number(
    partnerCommissions
      .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED')
      .reduce((acc, c) => acc + c.commissionAmountBrl, 0)
      .toFixed(2)
  );

  return {
    totalUsers,
    activeUsers,
    blockedOrSuspendedUsers,
    registeredCompanies,
    registeredDrivers,
    registeredCarriers,
    activeSubscriptions,
    trialSubscriptions,
    manualGrantSubscriptions,
    expiredSubscriptions,
    canceledSubscriptions,
    overdueSubscriptions,
    mrrBrl,
    accumulatedRevenueBrl,
    pendingPaymentsBrl,
    delinquencyAmountBrl,
    totalPublishedFreights,
    completedContracts,
    totalFinancialVolumeBrl,
    collectedFeesBrl,
    pendingCommissionsBrl,
  };
}

// ============================================================================
// NEXCARGA TRUST — MOTOR OFICIAL DE VERIFICAÇÃO CADASTRAL & SELO VERIFICADO
// ============================================================================

/**
 * Mapeia o bucket privado/público oficial do Supabase Storage conforme a categoria do arquivo
 */
export function resolveOfficialStorageBucket(
  category: DocumentItem['category'] | 'PROFILE_IMAGE' | 'VEHICLE_PHOTO' | 'FREIGHT_ATTACHMENT',
  ownerRole: UserRole | string
): StorageBucketName {
  if (category === 'PROFILE_IMAGE') return 'profile-images';
  if (category === 'VEHICLE_PHOTO') return 'vehicle-images';
  if (category === 'FREIGHT_ATTACHMENT' || category === 'NF_E' || category === 'CT_E' || category === 'MDF_E' || category === 'COMPROVANTE_ENTREGA') {
    return 'freight-attachments';
  }
  if (ownerRole === 'DRIVER' || category === 'CNH') {
    return 'driver-documents';
  }
  if (ownerRole === 'COMPANY' || ownerRole === 'CARRIER' || category === 'CONTRATO_SOCIAL' || category === 'CARTAO_CNPJ' || category === 'ANTT' || category === 'RNTRC' || category === 'CRLV') {
    return 'company-documents';
  }
  return 'nexcarga-private';
}

/**
 * Lista de documentos obrigatórios exigidos pelo NEXCARGA TRUST por categoria de entidade
 */
export function getRequiredTrustDocumentsForCategory(
  entityCategory: TrustEntityCategory
): NexCargaTrustRequirement[] {
  switch (entityCategory) {
    case 'DRIVER':
      return [
        {
          category: 'CNH',
          label: 'CNH Digital com EAR (Atividade Remunerada)',
          bucket: 'driver-documents',
          mandatory: true,
          description: 'Carteira Nacional de Habilitação vigente (Categorias C, D ou E).',
        },
        {
          category: 'RNTRC',
          label: 'Registro Nacional RNTRC / ANTT (TAC)',
          bucket: 'driver-documents',
          mandatory: true,
          description: 'Certificado RNTRC ativo junto à ANTT para transportador autônomo.',
        },
        {
          category: 'CRLV',
          label: 'CRLV-e do Veículo de Tração / Implemento',
          bucket: 'driver-documents',
          mandatory: true,
          description: 'Certificado de Registro e Licenciamento anual vigente no SENATRAN.',
        },
      ];
    case 'CARRIER':
    case 'COMPANY_PROVIDER':
      return [
        {
          category: 'CARTAO_CNPJ',
          label: 'Comprovante de Inscrição CNPJ Ativo (Receita Federal)',
          bucket: 'company-documents',
          mandatory: true,
          description: 'Cartão CNPJ ativo com CNAE compatível com transporte rodoviário de cargas.',
        },
        {
          category: 'RNTRC',
          label: 'Certificado RNTRC / ANTT — Empresa de Transporte (ETC)',
          bucket: 'company-documents',
          mandatory: true,
          description: 'Habilitação ANTT vigente da transportadora e frota vinculada.',
        },
        {
          category: 'CONTRATO_SOCIAL',
          label: 'Contrato Social ou Última Alteração Consolidada',
          bucket: 'company-documents',
          mandatory: true,
          description: 'Ato constitutivo registrado na Junta Comercial identificando os administradores.',
        },
      ];
    case 'COMMERCIAL_PARTNER':
      return [
        {
          category: 'CARTAO_CNPJ',
          label: 'Cartão CNPJ ou Documento de Identificação do Parceiro',
          bucket: 'company-documents',
          mandatory: true,
          description: 'Registro cadastral regular para recebimento de comissões comerciais.',
        },
        {
          category: 'CONTRATO_SOCIAL',
          label: 'Estatuto / Contrato Social ou Termo de Afiliação NexCarga',
          bucket: 'nexcarga-private',
          mandatory: true,
          description: 'Instrumento jurídico de parceria homologado pela Pupa Labs.',
        },
      ];
    case 'COMPANY_SHIPPER':
    default:
      return [
        {
          category: 'CARTAO_CNPJ',
          label: 'Comprovante de Inscrição e Situação Cadastral CNPJ',
          bucket: 'company-documents',
          mandatory: true,
          description: 'Inscrição estadual e federal ativa da empresa embarcadora.',
        },
        {
          category: 'CONTRATO_SOCIAL',
          label: 'Contrato Social / Estatuto e Procuração do Gestor Logístico',
          bucket: 'company-documents',
          mandatory: true,
          description: 'Comprovação de poderes do responsável pela publicação e contratação de fretes.',
        },
      ];
  }
}

/**
 * Regra de Segurança Obrigatória:
 * - O próprio usuário ou membros da mesma organização NUNCA podem aprovar sua própria documentação.
 * - Somente perfis administrativos autorizados ('SUPER_ADMIN', 'ADMIN', 'VERIFICATION') podem aprovar/rejeitar.
 */
export function canReviewerApproveTrustDocument(params: {
  reviewerUserId: string;
  reviewerRole: UserRole;
  reviewerOrganizationId: string;
  targetOrganizationId: string;
  uploadedByUserId?: string;
}): { allowed: boolean; reason?: string } {
  const {
    reviewerUserId,
    reviewerRole,
    reviewerOrganizationId,
    targetOrganizationId,
    uploadedByUserId,
  } = params;

  if (!['SUPER_ADMIN', 'ADMIN', 'VERIFICATION'].includes(reviewerRole)) {
    return {
      allowed: false,
      reason: `O perfil ${reviewerRole} não possui autorização para aprovar ou reprovar documentos no NEXCARGA TRUST.`,
    };
  }

  if (uploadedByUserId && reviewerUserId === uploadedByUserId) {
    return {
      allowed: false,
      reason: 'Violação de segurança: o usuário não pode aprovar a própria documentação.',
    };
  }

  if (
    reviewerRole !== 'SUPER_ADMIN' &&
    reviewerOrganizationId === targetOrganizationId
  ) {
    return {
      allowed: false,
      reason: 'Violação de segregação de funções: analistas não podem homologar documentos da própria organização.',
    };
  }

  return { allowed: true };
}

/**
 * Avalia o estado oficial do NEXCARGA TRUST (8 estados possíveis) e elegibilidade do selo NEXCARGA VERIFICADO.
 * Regras obrigatórias:
 * - Selo só é exibido (verifiedBadge === true) quando trustStatus === 'VERIFIED'.
 * - Se qualquer documento obrigatório aprovado estiver vencido (expiresAt < referenceDateIso),
 *   o status transita automaticamente para 'EXPIRED' e o selo é suspenso (verifiedBadge = false).
 */
export function evaluateNexCargaTrustStatus(params: {
  entityCategory: TrustEntityCategory;
  documents: DocumentItem[];
  currentStatus: NexCargaTrustStatus;
  referenceDateIso?: string;
  isManuallySuspended?: boolean;
  suspensionReason?: string;
}): {
  trustStatus: NexCargaTrustStatus;
  verifiedBadge: boolean;
  pendingRequirements: string[];
  expiredDocumentTitles: string[];
  rejectedDocumentTitles: string[];
  regularizationInstructions: string;
} {
  const {
    entityCategory,
    documents,
    currentStatus,
    referenceDateIso = '2026-11-05',
    isManuallySuspended = false,
    suspensionReason,
  } = params;

  const requirements = getRequiredTrustDocumentsForCategory(entityCategory);

  if (isManuallySuspended || currentStatus === 'SUSPENDED') {
    return {
      trustStatus: 'SUSPENDED',
      verifiedBadge: false,
      pendingRequirements: requirements.map((r) => r.label),
      expiredDocumentTitles: [],
      rejectedDocumentTitles: [],
      regularizationInstructions:
        suspensionReason ||
        'Sua verificação NEXCARGA TRUST encontra-se suspensa preventivamente. Envie documentação atualizada e solicite reavaliação.',
    };
  }

  if (documents.length === 0) {
    return {
      trustStatus: 'NOT_SUBMITTED',
      verifiedBadge: false,
      pendingRequirements: requirements.map((r) => r.label),
      expiredDocumentTitles: [],
      rejectedDocumentTitles: [],
      regularizationInstructions:
        'Nenhum documento obrigatório foi enviado. Faça o upload dos documentos exigidos para iniciar a validação NEXCARGA TRUST.',
    };
  }

  const expiredDocs = documents.filter(
    (d) => d.expiresAt && d.expiresAt < referenceDateIso
  );
  if (expiredDocs.length > 0) {
    return {
      trustStatus: 'EXPIRED',
      verifiedBadge: false,
      pendingRequirements: expiredDocs.map((d) => `${d.title} (Vencido em ${formatDateBr(d.expiresAt)})`),
      expiredDocumentTitles: expiredDocs.map((d) => d.title),
      rejectedDocumentTitles: [],
      regularizationInstructions:
        'Um ou mais documentos obrigatórios estão vencidos. O selo NEXCARGA VERIFICADO foi suspenso até o envio e aprovação de documento vigente.',
    };
  }

  const rejectedDocs = documents.filter((d) => d.verificationStatus === 'REJECTED');
  if (rejectedDocs.length > 0) {
    return {
      trustStatus: currentStatus === 'REJECTED' ? 'REJECTED' : 'ACTION_REQUIRED',
      verifiedBadge: false,
      pendingRequirements: rejectedDocs.map(
        (d) => `${d.title} (${d.rejectionReason || 'Requer reenvio legível'})`
      ),
      expiredDocumentTitles: [],
      rejectedDocumentTitles: rejectedDocs.map((d) => d.title),
      regularizationInstructions:
        'Existem documentos reprovados na análise. Verifique o motivo da rejeição, substitua o arquivo e solicite nova análise.',
    };
  }

  const missingMandatory = requirements.filter(
    (req) =>
      req.mandatory &&
      !documents.some(
        (d) =>
          d.category === req.category &&
          (d.verificationStatus === 'APPROVED' ||
            d.verificationStatus === 'AI_PRE_CHECKED' ||
            d.verificationStatus === 'PENDING')
      )
  );

  const anyPendingHuman = documents.some(
    (d) => d.verificationStatus === 'PENDING' || d.verificationStatus === 'AI_PRE_CHECKED'
  );

  if (anyPendingHuman) {
    const nextState: NexCargaTrustStatus = documents.some(
      (d) => d.verificationStatus === 'AI_PRE_CHECKED'
    )
      ? 'UNDER_REVIEW'
      : 'PENDING';
    return {
      trustStatus: nextState,
      verifiedBadge: false,
      pendingRequirements: missingMandatory.map((m) => m.label),
      expiredDocumentTitles: [],
      rejectedDocumentTitles: [],
      regularizationInstructions:
        nextState === 'UNDER_REVIEW'
          ? 'Seus documentos passaram pela pré-leitura da NexIA Verify e aguardam aprovação final do analista humano do NEXCARGA TRUST.'
          : 'Documentos recebidos na fila de análise. Aguarde a homologação cadastral.',
    };
  }

  // All submitted documents are APPROVED and none are expired
  if (missingMandatory.length === 0 || currentStatus === 'VERIFIED') {
    return {
      trustStatus: 'VERIFIED',
      verifiedBadge: true,
      pendingRequirements: [],
      expiredDocumentTitles: [],
      rejectedDocumentTitles: [],
      regularizationInstructions:
        'Cadastro 100% homologado pelo NEXCARGA TRUST. O selo oficial NEXCARGA VERIFICADO está ativo em seu perfil e propostas.',
    };
  }

  return {
    trustStatus: 'ACTION_REQUIRED',
    verifiedBadge: false,
    pendingRequirements: missingMandatory.map((m) => m.label),
    expiredDocumentTitles: [],
    rejectedDocumentTitles: [],
    regularizationInstructions: `Envie os documentos obrigatórios pendentes (${missingMandatory
      .map((m) => m.category)
      .join(', ')}) para concluir sua homologação.`,
  };
}

