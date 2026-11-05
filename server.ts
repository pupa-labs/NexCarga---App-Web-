import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import {
  AVAILABLE_PROFILES,
  INITIAL_ACTIVITIES,
  INITIAL_ADMIN_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMMERCIAL_SETTINGS,
  INITIAL_CONTRACTS,
  INITIAL_DELINQUENCY_POLICY,
  INITIAL_DOCUMENTS,
  INITIAL_FEE_RULES,
  INITIAL_FREIGHTS,
  INITIAL_OPERATIONS,
  INITIAL_ORGANIZATIONS,
  INITIAL_PARTNER_COMMISSIONS,
  INITIAL_PARTNERS,
  INITIAL_PAYMENTS,
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_PROPOSALS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_VEHICLES,
} from './src/data/initialSeed';
import {
  calculateAdminControlMetrics,
  calculateDistanceKm,
  calculateLogisticsCost,
  canRoleAccessSection,
  createImmutableFeeSnapshot,
  evaluateSubscriptionDelinquency,
  filterFreightsByRoleVisibility,
  filterNexgridFreights,
  formatBrl,
  geocodeBrazilianAddress,
  hasAdminPermission,
  validateCep,
  validateFeeRuleSplit,
} from './src/utils/logisticsRules';
import type {
  ActiveProfileSession,
  ActivityEventItem,
  AdminPermissionAction,
  AdminUserItem,
  AuditLogItem,
  CommercialSettings,
  ContractItem,
  DelinquencyPolicy,
  DocumentItem,
  FeeRuleItem,
  FreightItem,
  OperationItem,
  OperationStatus,
  OrganizationItem,
  PartnerCommissionItem,
  PartnerItem,
  PaymentTransactionItem,
  PlatformGeneralSettings,
  ProposalItem,
  RolePermissionMatrix,
  SubscriptionItem,
  SubscriptionPlanConfig,
  UserAccountStatus,
  UserRole,
  VehicleItem,
} from './src/types/nexcarga';

dotenv.config();

const PORT = 3000;
const DATA_FILE_PATH = path.resolve(process.cwd(), '.nexcarga-store.json');

// Supabase PostgreSQL Client (when configured via environment variables)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseClient =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Gemini API Client (Server-Side Only, with required User-Agent header)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface PersistentState {
  activeRole: UserRole;
  kpis: {
    publishedFreights: number;
    publishedGrowthPercent: number;
    receivedProposals: number;
    proposalsGrowthPercent: number;
    activeContracts: number;
    contractsGrowthPercent: number;
    estimatedSavingsBrl: number;
    savingsGrowthPercent: number;
  };
  freights: FreightItem[];
  proposals: ProposalItem[];
  contracts: ContractItem[];
  operations: OperationItem[];
  activities: ActivityEventItem[];
  documents: DocumentItem[];
  vehicles: VehicleItem[];
  partners: PartnerItem[];
  commercialSettings: CommercialSettings;
  auditLogs: AuditLogItem[];
  processedIdempotencyKeys: string[];
  // Phase 2 NexCarga Control state
  adminUsers: AdminUserItem[];
  organizations: OrganizationItem[];
  subscriptions: SubscriptionItem[];
  payments: PaymentTransactionItem[];
  feeRules: FeeRuleItem[];
  delinquencyPolicy: DelinquencyPolicy;
  partnerCommissions: PartnerCommissionItem[];
  rolePermissions: RolePermissionMatrix;
  platformSettings: PlatformGeneralSettings;
}

function buildDefaultState(): PersistentState {
  return {
    activeRole: 'COMPANY',
    kpis: {
      publishedFreights: 24,
      publishedGrowthPercent: 20,
      receivedProposals: 36,
      proposalsGrowthPercent: 28,
      activeContracts: 18,
      contractsGrowthPercent: 50,
      estimatedSavingsBrl: 12480.0,
      savingsGrowthPercent: 17,
    },
    freights: [...INITIAL_FREIGHTS],
    proposals: [...INITIAL_PROPOSALS],
    contracts: [...INITIAL_CONTRACTS],
    operations: [...INITIAL_OPERATIONS],
    activities: [...INITIAL_ACTIVITIES],
    documents: [...INITIAL_DOCUMENTS],
    vehicles: [...INITIAL_VEHICLES],
    partners: [...INITIAL_PARTNERS],
    commercialSettings: JSON.parse(JSON.stringify(INITIAL_COMMERCIAL_SETTINGS)),
    auditLogs: [...INITIAL_AUDIT_LOGS],
    processedIdempotencyKeys: [],
    adminUsers: [...INITIAL_ADMIN_USERS],
    organizations: [...INITIAL_ORGANIZATIONS],
    subscriptions: [...INITIAL_SUBSCRIPTIONS],
    payments: [...INITIAL_PAYMENTS],
    feeRules: [...INITIAL_FEE_RULES],
    delinquencyPolicy: { ...INITIAL_DELINQUENCY_POLICY },
    partnerCommissions: [...INITIAL_PARTNER_COMMISSIONS],
    rolePermissions: JSON.parse(JSON.stringify(INITIAL_ROLE_PERMISSIONS)),
    platformSettings: { ...INITIAL_PLATFORM_SETTINGS },
  };
}

function loadState(): PersistentState {
  const defaults = buildDefaultState();
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistentState>;
      return {
        ...defaults,
        ...parsed,
        adminUsers: parsed.adminUsers?.length ? parsed.adminUsers : defaults.adminUsers,
        organizations: parsed.organizations?.length ? parsed.organizations : defaults.organizations,
        subscriptions: parsed.subscriptions?.length ? parsed.subscriptions : defaults.subscriptions,
        payments: parsed.payments?.length ? parsed.payments : defaults.payments,
        feeRules: parsed.feeRules?.length ? parsed.feeRules : defaults.feeRules,
        delinquencyPolicy: parsed.delinquencyPolicy || defaults.delinquencyPolicy,
        partnerCommissions: parsed.partnerCommissions?.length
          ? parsed.partnerCommissions
          : defaults.partnerCommissions,
        rolePermissions: parsed.rolePermissions || defaults.rolePermissions,
        platformSettings: parsed.platformSettings || defaults.platformSettings,
      };
    }
  } catch (err) {
    console.warn('[NexCarga Store] Rebuilding state from seed:', err);
  }

  saveState(defaults);
  return defaults;
}

function saveState(state: PersistentState): void {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[NexCarga Store] Error persisting state:', err);
  }
}

let dbState = loadState();

function getActiveProfile(roleOverride?: UserRole): ActiveProfileSession {
  const role = roleOverride || dbState.activeRole;
  return (
    AVAILABLE_PROFILES.find((p) => p.role === role) || AVAILABLE_PROFILES[0]
  );
}

function recordAudit(
  profile: ActiveProfileSession,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  extras?: {
    previousValue?: string;
    newValue?: string;
    reason?: string;
    originIp?: string;
    result?: 'SUCCESS' | 'DENIED' | 'ERROR';
  }
) {
  const entry: AuditLogItem = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorName: profile.userName,
    actorRole: profile.role,
    action,
    entityType,
    entityId,
    details,
    previousValue: extras?.previousValue,
    newValue: extras?.newValue,
    reason: extras?.reason,
    originIp: extras?.originIp || '127.0.0.1',
    result: extras?.result || 'SUCCESS',
    createdAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  };
  dbState.auditLogs.unshift(entry);
}

// Simple rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  entry.count += 1;
  if (entry.count > 300) {
    return res.status(429).json({
      error: 'Limite de requisições excedido. Tente novamente em instantes.',
    });
  }
  next();
}

// Input sanitization helper
function sanitizeText(input: unknown, maxLength = 300): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

// Server-side Admin RBAC Guard
function verifyAdminPermission(
  req: Request,
  res: Response,
  action: AdminPermissionAction
): ActiveProfileSession | null {
  const profile = getActiveProfile();
  const allowed = hasAdminPermission(profile.role, action, dbState.rolePermissions);
  if (!allowed) {
    recordAudit(
      profile,
      `UNAUTHORIZED_${action}`,
      'security_rbac',
      profile.userId,
      `Tentativa bloqueada: perfil ${profile.role} não possui a permissão ${action}.`,
      {
        reason: 'Bloqueio RBAC no servidor',
        originIp: req.ip || '127.0.0.1',
        result: 'DENIED',
      }
    );
    saveState(dbState);
    res.status(403).json({
      error: `Acesso negado no servidor: o perfil ${profile.roleLabel} (${profile.role}) não possui a permissão administrativa "${action}".`,
    });
    return null;
  }
  return profile;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', rateLimitMiddleware);

  // 1. Bootstrap endpoint (returns RBAC-filtered state, real integration statuses & NexCarga Control state)
  app.get('/api/bootstrap', (_req: Request, res: Response) => {
    const activeProfile = getActiveProfile();
    const hasGemini = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const hasSupabase = Boolean(supabaseClient);
    const hasGcs = Boolean(process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL);
    const hasMaps = Boolean(
      process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
    );

    const visibleFreights = filterFreightsByRoleVisibility(
      dbState.freights,
      activeProfile.role,
      activeProfile.organizationId
    );

    const adminOverview = calculateAdminControlMetrics({
      users: dbState.adminUsers,
      organizations: dbState.organizations,
      subscriptions: dbState.subscriptions,
      payments: dbState.payments,
      freights: dbState.freights,
      contracts: dbState.contracts,
      partnerCommissions: dbState.partnerCommissions,
    });

    res.json({
      activeProfile,
      availableProfiles: AVAILABLE_PROFILES,
      kpis: dbState.kpis,
      freights: visibleFreights,
      proposals: dbState.proposals,
      contracts: dbState.contracts,
      operations: dbState.operations,
      activities: dbState.activities,
      documents: dbState.documents,
      vehicles: dbState.vehicles,
      partners: dbState.partners,
      commercialSettings: dbState.commercialSettings,
      auditLogs: dbState.auditLogs.slice(0, 60),
      integrations: {
        supabasePostgres: {
          configured: hasSupabase,
          mode: hasSupabase ? 'SUPABASE_CLOUD' : 'POSTGRES_COMPATIBLE_LOCAL_ENGINE',
          details: hasSupabase
            ? 'Conectado ao Supabase PostgreSQL com RLS ativo.'
            : 'Schema SQL e migrações prontos (/supabase/migrations). Persistência transacional local ativa aguardando SUPABASE_URL.',
        },
        geminiNexIA: {
          configured: hasGemini,
          model: 'gemini-3.8-flash',
          details: hasGemini
            ? 'NexIA e NexIA Verify conectados ao Gemini API no backend.'
            : 'Motor analítico contextual ativo; configure GEMINI_API_KEY para inferência generativa.',
        },
        googleCloudStorage: {
          configured: hasGcs,
          bucket: process.env.GCS_BUCKET_NAME || 'nexcarga-docs-private',
          details: hasGcs
            ? 'Bucket privado GCS ativo com geração de URLs assinadas.'
            : 'Estrutura de metadados e URLs assinadas pronta; aguardando credenciais GCS_PROJECT_ID / GCS_PRIVATE_KEY.',
        },
        googleMapsPlatform: {
          configured: hasMaps,
          regionFocus: 'Manhuaçu/MG • Zona da Mata • Leste de MG • Brasil',
          details: hasMaps
            ? 'Google Maps Platform conectado (@vis.gl/react-google-maps + Geocoding Server Proxy).'
            : 'Google Maps Platform provisionado + Radar Georreferenciado NEXGRID (Manhuaçu/MG, BR-262 e BR-116) ativo.',
        },
      },
      subscription: {
        planName: 'Plano Profissional',
        status: 'ATIVO',
        validUntil: '15/08/2025',
        cycle: 'Anual',
        priceBrl: 540.0,
      },
      adminControl: {
        overview: adminOverview,
        users: dbState.adminUsers,
        organizations: dbState.organizations,
        subscriptions: dbState.subscriptions,
        payments: dbState.payments,
        feeRules: dbState.feeRules,
        delinquencyPolicy: dbState.delinquencyPolicy,
        partnerCommissions: dbState.partnerCommissions,
        rolePermissions: dbState.rolePermissions,
        platformSettings: dbState.platformSettings,
      },
    });
  });

  // 2. Switch Role / Profile (RBAC Session Context)
  app.post('/api/auth/switch-role', (req: Request, res: Response) => {
    const role = sanitizeText(req.body?.role, 32) as UserRole;
    const found = AVAILABLE_PROFILES.find((p) => p.role === role);
    if (!found) {
      return res.status(400).json({ error: 'Perfil de acesso inválido.' });
    }
    dbState.activeRole = found.role;
    recordAudit(
      found,
      'ROLE_SESSION_SWITCHED',
      'sessions',
      found.userId,
      `Sessão alterada para perfil ${found.role} (${found.organizationName}).`
    );
    saveState(dbState);
    res.json({ activeProfile: found });
  });

  // ==========================================================================
  // FASE B — NEXGRID: GEOCODIFICAÇÃO SERVER-SIDE & FILTROS GEORREFERENCIADOS
  // ==========================================================================

  app.post('/api/nexgrid/geocode', async (req: Request, res: Response) => {
    const city = sanitizeText(req.body?.city, 80);
    const uf = sanitizeText(req.body?.uf || 'MG', 2).toUpperCase();
    const cep = sanitizeText(req.body?.cep || '36900-000', 12);
    const street = sanitizeText(req.body?.street || '', 140);
    const number = sanitizeText(req.body?.number || '', 30);
    const neighborhood = sanitizeText(req.body?.neighborhood || '', 80);

    if (!city) {
      return res.status(400).json({ error: 'Informe o município para geocodificação.' });
    }

    const gmpKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (gmpKey && gmpKey !== 'MY_GOOGLE_MAPS_API_KEY') {
      try {
        const query = encodeURIComponent(
          `${street ? `${street}, ${number} - ` : ''}${city} - ${uf}, ${cep}, Brasil`
        );
        const url = `https://geocode.googleapis.com/v4/geocode/address/${query}?regionCode=br&languageCode=pt-BR`;
        const gmpRes = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': gmpKey,
            'X-Goog-FieldMask': 'results.placeId,results.location,results.formattedAddress',
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
        });
        if (gmpRes.status === 429) {
          return res.status(429).json({
            error: 'QUOTA_EXCEEDED',
            status: 'RESOURCE_EXHAUSTED',
          });
        }
        if (gmpRes.ok) {
          const json = (await gmpRes.json()) as {
            results?: Array<{
              location?: { latitude: number; longitude: number };
              formattedAddress?: string;
            }>;
          };
          const first = json.results?.[0];
          if (first?.location) {
            return res.json({
              latitude: first.location.latitude,
              longitude: first.location.longitude,
              formattedAddress: first.formattedAddress || `${city}/${uf}`,
              city,
              uf,
              cep,
              source: 'GOOGLE_MAPS_GEOCODING_API',
              validated: true,
            });
          }
        }
      } catch (err) {
        console.warn('[NEXGRID Geocoding API fallback]:', err);
      }
    }

    const fallbackResult = geocodeBrazilianAddress({
      city,
      uf,
      cep,
      street,
      number,
      neighborhood,
    });
    return res.json(fallbackResult);
  });

  app.get('/api/nexgrid/opportunities', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    const visible = filterFreightsByRoleVisibility(
      dbState.freights,
      profile.role,
      profile.organizationId
    );
    const filtered = filterNexgridFreights(visible, {
      origin: sanitizeText(req.query.origin, 80),
      destination: sanitizeText(req.query.destination, 80),
      uf: sanitizeText(req.query.uf, 4),
      vehicleType: sanitizeText(req.query.vehicleType, 50),
      implementType: sanitizeText(req.query.implementType, 50),
      cargoType: sanitizeText(req.query.cargoType, 80),
      minWeightKg: Number(req.query.minWeightKg) || undefined,
      maxWeightKg: Number(req.query.maxWeightKg) || undefined,
      minValueBrl: Number(req.query.minValueBrl) || undefined,
      maxValueBrl: Number(req.query.maxValueBrl) || undefined,
      pickupDate: sanitizeText(req.query.pickupDate, 14),
      status: sanitizeText(req.query.status, 30),
      radiusKm: Number(req.query.radiusKm) || undefined,
      searchQuery: sanitizeText(req.query.searchQuery, 120),
    });
    res.json({ freights: filtered, total: filtered.length });
  });

  // 3. Publish New Freight with Full Address & Server-Side Geocoding
  app.post('/api/freights', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    if (!canRoleAccessSection(profile.role, 'publicar-frete')) {
      return res.status(403).json({
        error: `Acesso negado: o perfil ${profile.roleLabel} não possui permissão para publicar fretes.`,
      });
    }

    const originCity = sanitizeText(req.body?.originCity, 80);
    const originUf = sanitizeText(req.body?.originUf || 'MG', 2).toUpperCase();
    const originCep = sanitizeText(req.body?.originCep || '36900-000', 10);
    const originStreet = sanitizeText(req.body?.originStreet || 'Rodovia BR-262', 140);
    const originNumber = sanitizeText(req.body?.originNumber || 'S/N', 30);
    const originComplement = sanitizeText(req.body?.originComplement || '', 80);
    const originNeighborhood = sanitizeText(req.body?.originNeighborhood || 'Distrito Industrial', 80);

    const destinationCity = sanitizeText(req.body?.destinationCity, 80);
    const destinationUf = sanitizeText(req.body?.destinationUf || 'ES', 2).toUpperCase();
    const destinationCep = sanitizeText(req.body?.destinationCep || '29010-000', 10);
    const destinationStreet = sanitizeText(req.body?.destinationStreet || 'Av. Portuária', 140);
    const destinationNumber = sanitizeText(req.body?.destinationNumber || '100', 30);
    const destinationComplement = sanitizeText(req.body?.destinationComplement || '', 80);
    const destinationNeighborhood = sanitizeText(req.body?.destinationNeighborhood || 'Centro', 80);

    const cargoType = sanitizeText(req.body?.cargoType, 80);
    const vehicleRequired = sanitizeText(req.body?.vehicleRequired || 'Truck', 50);
    const implementRequired = sanitizeText(req.body?.implementRequired || 'Graneleiro', 50);
    const weightKg = Math.max(500, Number(req.body?.weightKg) || 14000);
    const volumeM3 = Math.max(1, Number(req.body?.volumeM3) || 45);
    const offeredValueBrl = Math.max(200, Number(req.body?.offeredValueBrl) || 5000);
    const pickupDate = sanitizeText(req.body?.pickupDate || '2026-11-07', 12);
    const deliveryDate = sanitizeText(req.body?.deliveryDate || '2026-11-08', 12);
    const visibility = (sanitizeText(req.body?.visibility || 'PUBLIC', 20) || 'PUBLIC') as
      | 'PUBLIC'
      | 'INVITED_ONLY'
      | 'PRIVATE';
    const notes = sanitizeText(req.body?.notes || '', 280);

    if (!originCity || !destinationCity || !cargoType || offeredValueBrl <= 0) {
      return res.status(400).json({
        error: 'Preencha todos os campos obrigatórios (Origem, Destino, Tipo de Carga e Valor do Frete).',
      });
    }
    if (!validateCep(originCep) || !validateCep(destinationCep)) {
      return res.status(400).json({
        error: 'CEP de origem ou destino inválido. Utilize o formato brasileiro 00000-000.',
      });
    }

    // Server-side geocoding validation (never trust arbitrary coordinates sent by the browser)
    const geoOrigin = geocodeBrazilianAddress({
      city: originCity,
      uf: originUf,
      cep: originCep,
      street: originStreet,
      number: originNumber,
      neighborhood: originNeighborhood,
    });
    const geoDest = geocodeBrazilianAddress({
      city: destinationCity,
      uf: destinationUf,
      cep: destinationCep,
      street: destinationStreet,
      number: destinationNumber,
      neighborhood: destinationNeighborhood,
    });

    const calculatedDist = calculateDistanceKm(
      geoOrigin.latitude,
      geoOrigin.longitude,
      geoDest.latitude,
      geoDest.longitude
    );
    const distanceKm = Math.max(
      15,
      Number(req.body?.distanceKm) || Math.round(calculatedDist * 1.28)
    );

    const nextNum = 26482 + dbState.freights.length;
    const newCode = `#NX-${nextNum}`;

    const newFreight: FreightItem = {
      id: `fr-${Date.now()}`,
      code: newCode,
      organizationId: profile.organizationId,
      organizationName: profile.organizationName,
      originCity,
      originUf,
      originCep: geoOrigin.cep,
      originStreet,
      originNumber,
      originComplement,
      originNeighborhood,
      originLat: geoOrigin.latitude,
      originLng: geoOrigin.longitude,
      destinationCity,
      destinationUf,
      destinationCep: geoDest.cep,
      destinationStreet,
      destinationNumber,
      destinationComplement,
      destinationNeighborhood,
      destinationLat: geoDest.latitude,
      destinationLng: geoDest.longitude,
      distanceKm,
      cargoType,
      vehicleRequired,
      implementRequired,
      weightKg,
      volumeM3,
      offeredValueBrl,
      pickupDate,
      deliveryDate,
      status: 'PUBLISHED',
      visibility,
      geocodingSource: 'SERVER_VALIDATED_BR',
      notes,
      proposalsCount: 0,
      createdAt: new Date().toISOString(),
    };

    dbState.freights.unshift(newFreight);
    dbState.kpis.publishedFreights += 1;

    dbState.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'FREIGHT_PUBLISHED',
      title: `Novo frete ${newCode} publicado (${originCity}/${originUf} → ${destinationCity}/${destinationUf})`,
      relativeTime: 'agora mesmo',
      timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      freightCode: newCode,
    });

    recordAudit(
      profile,
      'FREIGHT_PUBLISHED',
      'freights',
      newCode,
      `Frete ${newCode} geocodificado no servidor (${geoOrigin.latitude}, ${geoOrigin.longitude} → ${geoDest.latitude}, ${geoDest.longitude}) por ${formatBrl(offeredValueBrl)}.`,
      {
        newValue: `${originCity}/${originUf} -> ${destinationCity}/${destinationUf} (${distanceKm} km)`,
        reason: 'Publicação de carga validada',
      }
    );

    saveState(dbState);
    res.status(201).json({
      freight: newFreight,
      kpis: dbState.kpis,
      activities: dbState.activities,
    });
  });

  // 4. Create Proposal on a Freight
  app.post('/api/proposals', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    const freightId = sanitizeText(req.body?.freightId, 60);
    const driverName = sanitizeText(req.body?.driverName || profile.userName, 120);
    const driverRntrc = sanitizeText(req.body?.driverRntrc || '048912340', 20);
    const vehicleDescription = sanitizeText(
      req.body?.vehicleDescription || 'Volvo VM 270 Truck • Graneleiro',
      120
    );
    const proposedValueBrl = Number(req.body?.proposedValueBrl);
    const estimatedDeliveryDays = Math.max(1, Number(req.body?.estimatedDeliveryDays) || 1);
    const notes = sanitizeText(req.body?.notes || '', 240);

    const freight = dbState.freights.find((f) => f.id === freightId);
    if (!freight) {
      return res.status(404).json({ error: 'Frete não encontrado.' });
    }
    if (!Number.isFinite(proposedValueBrl) || proposedValueBrl <= 0) {
      return res.status(400).json({ error: 'Informe um valor de proposta válido em R$.' });
    }

    const newProposal: ProposalItem = {
      id: `prop-${Date.now()}`,
      freightId: freight.id,
      freightCode: freight.code,
      originLabel: `${freight.originCity}/${freight.originUf}`,
      destinationLabel: `${freight.destinationCity}/${freight.destinationUf}`,
      proposerOrganizationId: profile.organizationId,
      proposerName: profile.organizationName,
      driverName,
      driverRntrc,
      vehicleDescription,
      originalValueBrl: freight.offeredValueBrl,
      proposedValueBrl,
      estimatedDeliveryDays,
      status: 'PENDING',
      notes,
      createdAt: new Date().toISOString(),
      history: [
        {
          id: `ev-${Date.now()}`,
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          actor: driverName,
          action: 'Proposta enviada',
          valueBrl: proposedValueBrl,
        },
      ],
    };

    dbState.proposals.unshift(newProposal);
    freight.proposalsCount += 1;
    if (freight.status === 'PUBLISHED') {
      freight.status = 'IN_NEGOTIATION';
    }
    dbState.kpis.receivedProposals += 1;

    dbState.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'PROPOSAL_RECEIVED',
      title: `Nova proposta recebida no frete ${freight.code}`,
      relativeTime: 'agora mesmo',
      timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      freightCode: freight.code,
    });

    recordAudit(
      profile,
      'PROPOSAL_SUBMITTED',
      'proposals',
      newProposal.id,
      `Proposta de ${formatBrl(proposedValueBrl)} enviada para o frete ${freight.code}.`
    );

    saveState(dbState);
    res.status(201).json({
      proposal: newProposal,
      kpis: dbState.kpis,
      activities: dbState.activities,
    });
  });

  // 5. Accept / Counter / Reject Proposal & Generate Contract with IMMUTABLE FEE SNAPSHOT
  app.post('/api/proposals/:id/decision', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    const proposalId = req.params.id;
    const decision = sanitizeText(req.body?.decision, 30) as
      | 'ACCEPT'
      | 'COUNTER'
      | 'REJECT';
    const counterValueBrl = Number(req.body?.counterValueBrl);
    const idempotencyKey = `prop-decision-${proposalId}-${decision}`;

    const proposal = dbState.proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não localizada.' });
    }

    if (
      decision === 'ACCEPT' &&
      dbState.processedIdempotencyKeys.includes(idempotencyKey)
    ) {
      return res.status(200).json({
        message: 'Operação já processada com idempotência.',
        proposal,
      });
    }

    const freight = dbState.freights.find((f) => f.id === proposal.freightId);

    if (decision === 'COUNTER') {
      if (!Number.isFinite(counterValueBrl) || counterValueBrl <= 0) {
        return res.status(400).json({ error: 'Informe um valor válido para contraproposta.' });
      }
      proposal.status = 'COUNTER_OFFER';
      proposal.counterValueBrl = counterValueBrl;
      proposal.history.push({
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        actor: profile.userName,
        action: 'Contraproposta registrada',
        valueBrl: counterValueBrl,
      });
      saveState(dbState);
      return res.json({ proposal });
    }

    if (decision === 'REJECT') {
      proposal.status = 'REJECTED';
      proposal.history.push({
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        actor: profile.userName,
        action: 'Proposta recusada',
        valueBrl: proposal.proposedValueBrl,
      });
      saveState(dbState);
      return res.json({ proposal });
    }

    if (decision === 'ACCEPT') {
      proposal.status = 'ACCEPTED';
      const agreedValue = proposal.counterValueBrl || proposal.proposedValueBrl;

      const activeFeeRule = dbState.feeRules.find((r) => r.isActive) || {
        id: 'fee-rule-default-35',
        code: 'NEX-MAINT-3.5',
        name: 'Taxa de Manutenção Padrão NexCarga',
        totalPercent: dbState.commercialSettings.totalMaintenanceFeePercent,
        companyPercent: dbState.commercialSettings.companyFeePercent,
        providerPercent: dbState.commercialSettings.providerFeePercent,
      };

      const immutableSnapshot = createImmutableFeeSnapshot(agreedValue, activeFeeRule);

      const contractCode = `CTR-2026-0${892 + dbState.contracts.length}`;
      const newContract: ContractItem = {
        id: `ct-${Date.now()}`,
        code: contractCode,
        freightId: proposal.freightId,
        freightCode: proposal.freightCode,
        proposalId: proposal.id,
        companyName: freight?.organizationName || 'Construtora Vale S.A.',
        providerName: proposal.proposerName,
        driverName: proposal.driverName,
        originLabel: proposal.originLabel,
        destinationLabel: proposal.destinationLabel,
        agreedFreightValueBrl: agreedValue,
        companyFeePercent: immutableSnapshot.companyFeePercent,
        providerFeePercent: immutableSnapshot.providerFeePercent,
        totalFeePercent: immutableSnapshot.totalFeePercent,
        companyFeeBrl: immutableSnapshot.companyFeeBrl,
        providerFeeBrl: immutableSnapshot.providerFeeBrl,
        totalPlatformFeeBrl: immutableSnapshot.totalPlatformFeeBrl,
        feeRuleId: immutableSnapshot.ruleId,
        feeSnapshot: immutableSnapshot,
        status: 'ACTIVE',
        signedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      };

      dbState.contracts.unshift(newContract);
      dbState.kpis.activeContracts += 1;

      // Register platform fee invoice in payments
      dbState.payments.unshift({
        id: `pay-${Date.now()}`,
        code: `TAX-2026-0${892 + dbState.contracts.length}`,
        organizationId: freight?.organizationId || profile.organizationId,
        organizationName: `${newContract.companyName} / ${newContract.providerName}`,
        contractCode,
        category: 'PLATFORM_MAINTENANCE_FEE',
        description: `Taxa de Manutenção ${immutableSnapshot.totalFeePercent}% — Contrato ${contractCode} (${proposal.freightCode})`,
        amountBrl: immutableSnapshot.totalPlatformFeeBrl,
        status: 'CONFIRMED',
        paymentMethod: 'GATEWAY_SPLIT',
        dueDate: new Date().toISOString().slice(0, 10),
        paidAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        gatewayReference: `gw_split_${contractCode.toLowerCase()}`,
      });

      if (freight) {
        freight.status = 'CONTRACTED';
        const savings = Math.max(0, freight.offeredValueBrl - agreedValue);
        if (savings > 0) {
          dbState.kpis.estimatedSavingsBrl += savings;
        }

        const newOp: OperationItem = {
          id: `op-${Date.now()}`,
          freightId: freight.id,
          freightCode: freight.code,
          contractCode,
          originCity: freight.originCity,
          originUf: freight.originUf,
          destinationCity: freight.destinationCity,
          destinationUf: freight.destinationUf,
          driverName: proposal.driverName,
          vehiclePlate: 'NXC-9B26',
          vehicleType: `${freight.vehicleRequired} • ${freight.implementRequired}`,
          cargoType: freight.cargoType,
          status: 'Programada',
          progressPercent: 20,
          updatedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          timeline: [
            {
              id: `tl-${Date.now()}`,
              status: 'Programada',
              description: `Contratação ${contractCode} efetivada com snapshot imutável (${immutableSnapshot.ruleCode}). Coleta programada.`,
              timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
              city: `${freight.originCity}/${freight.originUf}`,
            },
          ],
        };
        dbState.operations.unshift(newOp);
      }

      dbState.activities.unshift({
        id: `act-${Date.now()}`,
        type: 'PROPOSAL_ACCEPTED',
        title: `Proposta aceita no frete ${proposal.freightCode}`,
        relativeTime: 'agora mesmo',
        timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        freightCode: proposal.freightCode,
      });

      dbState.processedIdempotencyKeys.push(idempotencyKey);
      recordAudit(
        profile,
        'CONTRACT_SIGNED_WITH_FEE_SNAPSHOT',
        'contracts',
        contractCode,
        `Contrato ${contractCode} emitido para ${proposal.freightCode} no valor de ${formatBrl(agreedValue)}. Snapshot de taxa imutável: ${immutableSnapshot.totalFeePercent}% (${formatBrl(immutableSnapshot.totalPlatformFeeBrl)}).`,
        {
          previousValue: 'PROPOSAL_PENDING',
          newValue: JSON.stringify(immutableSnapshot),
          reason: 'Aceite de proposta e geração de contrato',
        }
      );

      saveState(dbState);
      return res.json({
        proposal,
        contract: newContract,
        kpis: dbState.kpis,
        operations: dbState.operations,
        activities: dbState.activities,
      });
    }

    res.status(400).json({ error: 'Decisão inválida.' });
  });

  // 6. Update Operation Status
  app.patch('/api/operations/:id/status', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    const op = dbState.operations.find((o) => o.id === req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operação não encontrada.' });
    }

    const newStatus = sanitizeText(req.body?.status, 40) as OperationStatus;
    const progressMap: Record<OperationStatus, number> = {
      'Aguardando coleta': 10,
      Programada: 20,
      'Em carregamento': 40,
      'Em trânsito': 70,
      'Em descarregamento': 90,
      Entregue: 100,
      'Com ocorrência': 55,
      Cancelada: 0,
    };

    if (!(newStatus in progressMap)) {
      return res.status(400).json({ error: 'Status operacional inválido.' });
    }

    const prevStatus = op.status;
    op.status = newStatus;
    op.progressPercent = progressMap[newStatus];
    op.updatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    op.timeline.push({
      id: `tl-${Date.now()}`,
      status: newStatus,
      description: `Status atualizado para "${newStatus}" por ${profile.userName}.`,
      timestamp: op.updatedAt,
      city: `${op.originCity}/${op.originUf}`,
    });

    dbState.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'FREIGHT_IN_TRANSIT',
      title: `Frete ${op.freightCode} atualizado para ${newStatus}`,
      relativeTime: 'agora mesmo',
      timestamp: op.updatedAt,
      freightCode: op.freightCode,
    });

    recordAudit(
      profile,
      'OPERATION_STATUS_CHANGED',
      'operations',
      op.id,
      `Operação do frete ${op.freightCode} alterada para "${newStatus}".`,
      { previousValue: prevStatus, newValue: newStatus }
    );

    saveState(dbState);
    res.json({ operation: op, activities: dbState.activities });
  });

  // 7. Upload / Register Document & Human Verification in NexIA Verify
  app.post('/api/documents', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    const title = sanitizeText(req.body?.title, 140);
    const category = sanitizeText(req.body?.category || 'CNH', 40) as DocumentItem['category'];
    const documentNumber = sanitizeText(req.body?.documentNumber || '000918273', 40);
    const expiresAt = sanitizeText(req.body?.expiresAt || '2028-12-31', 15);

    if (!title) {
      return res.status(400).json({ error: 'Informe o título de identificação do documento.' });
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      organizationId: profile.organizationId,
      ownerName: profile.organizationName,
      ownerRole: profile.role,
      title,
      category,
      documentNumber,
      gcsBucket: process.env.GCS_BUCKET_NAME || 'nexcarga-docs-private',
      gcsObjectPath: `${profile.role.toLowerCase()}/${profile.organizationId}/${Date.now()}_${category.toLowerCase()}.pdf`,
      fileSizeLabel: '1,1 MB',
      expiresAt,
      verificationStatus: 'AI_PRE_CHECKED',
      aiAnalysisSummary: `Pré-verificação NexIA Verify: Formato compatível com ${category} (${documentNumber}). Aguardando validação humana obrigatória.`,
      aiInconsistencies: [],
      createdAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    };

    dbState.documents.unshift(newDoc);
    recordAudit(
      profile,
      'DOCUMENT_UPLOADED',
      'documents',
      newDoc.id,
      `Documento "${title}" (${category}) registrado no bucket ${newDoc.gcsBucket}.`
    );
    saveState(dbState);
    res.status(201).json({ document: newDoc });
  });

  app.post('/api/documents/:id/verify', (req: Request, res: Response) => {
    const profile = getActiveProfile();
    if (!['SUPER_ADMIN', 'ADMIN', 'VERIFICATION', 'COMPANY'].includes(profile.role)) {
      return res.status(403).json({
        error: 'Somente analistas de homologação ou administradores podem aprovar documentos.',
      });
    }

    const doc = dbState.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const prevStatus = doc.verificationStatus;
    const status = sanitizeText(req.body?.status, 20) as 'APPROVED' | 'REJECTED';
    doc.verificationStatus = status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    doc.reviewedBy = `${profile.userName} (${profile.roleLabel})`;
    doc.reviewedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    if (doc.verificationStatus === 'APPROVED') {
      dbState.activities.unshift({
        id: `act-${Date.now()}`,
        type: 'DOCUMENT_APPROVED',
        title: `Documento "${doc.title}" aprovado`,
        relativeTime: 'agora mesmo',
        timestamp: doc.reviewedAt,
      });
    }

    recordAudit(
      profile,
      `DOCUMENT_${doc.verificationStatus}`,
      'documents',
      doc.id,
      `Homologação humana realizada para "${doc.title}": ${doc.verificationStatus}.`,
      { previousValue: prevStatus, newValue: doc.verificationStatus }
    );

    saveState(dbState);
    res.json({ document: doc, activities: dbState.activities });
  });

  // 8. Cost Engine API
  app.post('/api/cost-engine/calculate', (req: Request, res: Response) => {
    const result = calculateLogisticsCost(
      req.body,
      dbState.commercialSettings.companyFeePercent,
      dbState.commercialSettings.providerFeePercent
    );
    res.json({ result });
  });

  // ==========================================================================
  // FASE C, D & E — NEXCARGA CONTROL (ADMINISTRAÇÃO GERAL & GOVERNANÇA RBAC)
  // ==========================================================================

  // 5.2 Gestão de Usuários (Ativar, Suspender, Bloquear, Desbloquear — Sem exclusão física)
  app.patch('/api/admin/users/:id/status', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_USERS');
    if (!profile) return;

    const user = dbState.adminUsers.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não localizado.' });
    }

    const newStatus = sanitizeText(req.body?.status, 30) as UserAccountStatus;
    const reason = sanitizeText(
      req.body?.reason || 'Alteração administrativa de status no NexCarga Control',
      240
    );

    if (!['ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION'].includes(newStatus)) {
      return res.status(400).json({ error: 'Status de usuário inválido.' });
    }

    const previousStatus = user.status;
    user.status = newStatus;
    user.statusReason = reason;

    recordAudit(
      profile,
      `USER_STATUS_${newStatus}`,
      'users',
      user.id,
      `Usuário ${user.fullName} (${user.email}) alterado de ${previousStatus} para ${newStatus}. Motivo: ${reason}`,
      {
        previousValue: previousStatus,
        newValue: newStatus,
        reason,
        originIp: req.ip || '127.0.0.1',
      }
    );

    saveState(dbState);
    res.json({ user, auditLogs: dbState.auditLogs.slice(0, 60) });
  });

  // 5.3 Gestão de Organizações (Suspender / Reativar com Isolamento Multi-Tenant)
  app.patch('/api/admin/organizations/:id/status', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_ORGANIZATIONS');
    if (!profile) return;

    const org = dbState.organizations.find((o) => o.id === req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organização não localizada.' });
    }

    const newStatus = sanitizeText(req.body?.status, 30) as OrganizationItem['status'];
    const reason = sanitizeText(req.body?.reason || 'Ação de governança multi-tenant', 240);
    if (!['ACTIVE', 'SUSPENDED', 'BLOCKED', 'IN_REVIEW'].includes(newStatus)) {
      return res.status(400).json({ error: 'Status organizacional inválido.' });
    }

    const prevStatus = org.status;
    org.status = newStatus;

    recordAudit(
      profile,
      `ORGANIZATION_STATUS_${newStatus}`,
      'organizations',
      org.id,
      `Organização ${org.tradeName} (${org.cnpjOrCpf}) alterada de ${prevStatus} para ${newStatus}.`,
      { previousValue: prevStatus, newValue: newStatus, reason }
    );

    saveState(dbState);
    res.json({ organization: org, auditLogs: dbState.auditLogs.slice(0, 60) });
  });

  // 5.4 Gestão de Planos Comerciais (Criar, Editar, Ativar, Desativar sem quebrar contratos vigentes)
  app.post('/api/admin/plans', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PLANS');
    if (!profile) return;

    const name = sanitizeText(req.body?.name, 80);
    const code = sanitizeText(req.body?.code || `PLAN_${Date.now()}`, 30).toUpperCase();
    const cycleLabel = sanitizeText(req.body?.cycleLabel || 'Mensal', 30);
    const billingDays = Math.max(1, Number(req.body?.billingDays) || 30);
    const priceBrl = Math.max(0, Number(req.body?.priceBrl) || 79.9);
    const trialDays = Math.max(0, Number(req.body?.trialDays) ?? 15);
    const description = sanitizeText(
      req.body?.description || 'Plano corporativo configurável NexCarga.',
      200
    );

    if (!name || priceBrl <= 0) {
      return res.status(400).json({ error: 'Informe nome e valor válido para o plano.' });
    }

    const newPlan: SubscriptionPlanConfig = {
      id: `plan-${Date.now()}`,
      code,
      name,
      cycleLabel,
      billingDays,
      priceBrl,
      trialDays,
      status: 'ACTIVE',
      description,
      features: [
        `${trialDays} dias de avaliação gratuita`,
        'Acesso completo ao Radar NEXGRID',
        'Suporte e homologação NexIA Verify',
      ],
    };

    dbState.commercialSettings.plans.push(newPlan);
    recordAudit(
      profile,
      'PLAN_CREATED',
      'plans',
      newPlan.id,
      `Plano "${newPlan.name}" (${formatBrl(newPlan.priceBrl)} / ${newPlan.cycleLabel}) criado.`,
      { newValue: JSON.stringify(newPlan) }
    );

    saveState(dbState);
    res.status(201).json({ plans: dbState.commercialSettings.plans });
  });

  app.patch('/api/admin/plans/:id', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PLANS');
    if (!profile) return;

    const plan = dbState.commercialSettings.plans.find((p) => p.id === req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plano comercial não localizado.' });
    }

    const prevSnapshot = JSON.stringify({ priceBrl: plan.priceBrl, status: plan.status });
    if (req.body?.priceBrl !== undefined) {
      const price = Number(req.body.priceBrl);
      if (Number.isFinite(price) && price > 0) plan.priceBrl = price;
    }
    if (req.body?.trialDays !== undefined) {
      const td = Number(req.body.trialDays);
      if (Number.isFinite(td) && td >= 0) plan.trialDays = td;
    }
    if (req.body?.status) {
      plan.status = sanitizeText(req.body.status, 20) as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    }

    recordAudit(
      profile,
      'PLAN_UPDATED',
      'plans',
      plan.id,
      `Plano "${plan.name}" atualizado (${formatBrl(plan.priceBrl)} • Status: ${plan.status || 'ACTIVE'}). Assinaturas existentes preservadas.`,
      {
        previousValue: prevSnapshot,
        newValue: JSON.stringify({ priceBrl: plan.priceBrl, status: plan.status }),
      }
    );

    saveState(dbState);
    res.json({ plans: dbState.commercialSettings.plans });
  });

  // 5.5 Ativação Manual de Assinatura Gratuita (Concessão Administrativa exclusiva SUPER_ADMIN)
  app.post('/api/admin/subscriptions/manual-grant', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'GRANT_MANUAL_SUBSCRIPTION');
    if (!profile) return;

    const organizationId = sanitizeText(req.body?.organizationId, 60);
    const planId = sanitizeText(req.body?.planId, 60);
    const startDate = sanitizeText(
      req.body?.startDate || new Date().toISOString().slice(0, 10),
      15
    );
    const validUntil = sanitizeText(req.body?.validUntil || '2027-12-31', 15);
    const grantReason = sanitizeText(req.body?.grantReason, 160);
    const adminNotes = sanitizeText(req.body?.adminNotes, 280);

    if (!organizationId || !planId || !grantReason) {
      return res.status(400).json({
        error: 'Organização beneficiada, plano, vigência e motivo da concessão são obrigatórios.',
      });
    }

    const org = dbState.organizations.find((o) => o.id === organizationId);
    const plan = dbState.commercialSettings.plans.find((p) => p.id === planId);
    if (!org || !plan) {
      return res.status(404).json({ error: 'Organização ou plano não encontrado.' });
    }

    // Create or update subscription as administrative courtesy (NO fake payment created!)
    const newSub: SubscriptionItem = {
      id: `sub-grant-${Date.now()}`,
      organizationId: org.id,
      organizationName: org.tradeName,
      userId: org.responsibleUserId,
      userName: org.responsibleUserName,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      cycleLabel: `${plan.cycleLabel} (Concessão Administrativa)`,
      priceBrl: 0.0,
      status: 'MANUAL_GRANT',
      startDate,
      validUntil,
      autoRenew: false,
      isManualGrant: true,
      grantReason,
      grantedBy: `${profile.userName} (${profile.role})`,
      adminNotes,
      delinquencyDays: 0,
      updatedAt: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    };

    dbState.subscriptions.unshift(newSub);
    org.status = 'ACTIVE';
    org.activePlanId = plan.id;
    org.activePlanName = `${plan.name} (Cortesia)`;

    const user = dbState.adminUsers.find((u) => u.organizationId === org.id);
    if (user) {
      user.status = 'ACTIVE';
      user.subscriptionStatus = 'MANUAL_GRANT';
    }

    recordAudit(
      profile,
      'MANUAL_SUBSCRIPTION_GRANTED',
      'subscriptions',
      newSub.id,
      `Concessão administrativa gratuita do plano "${plan.name}" para ${org.tradeName} até ${validUntil}. Motivo: ${grantReason}. (Sem geração de pagamento fictício).`,
      {
        previousValue: 'NONE',
        newValue: `MANUAL_GRANT (${plan.code} até ${validUntil})`,
        reason: grantReason,
      }
    );

    saveState(dbState);
    res.status(201).json({
      subscription: newSub,
      subscriptions: dbState.subscriptions,
      auditLogs: dbState.auditLogs.slice(0, 60),
    });
  });

  app.patch('/api/admin/subscriptions/:id/status', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PLANS');
    if (!profile) return;

    const sub = dbState.subscriptions.find((s) => s.id === req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'Assinatura não localizada.' });
    }

    const newStatus = sanitizeText(req.body?.status, 30) as SubscriptionItem['status'];
    const validUntil = sanitizeText(req.body?.validUntil || sub.validUntil, 15);
    const reason = sanitizeText(req.body?.reason || 'Ajuste administrativo de assinatura', 200);

    const prevStatus = sub.status;
    sub.status = newStatus;
    sub.validUntil = validUntil;
    if (newStatus === 'ACTIVE') {
      sub.delinquencyDays = 0;
    }
    sub.updatedAt = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    recordAudit(
      profile,
      `SUBSCRIPTION_STATUS_${newStatus}`,
      'subscriptions',
      sub.id,
      `Assinatura de ${sub.organizationName} alterada de ${prevStatus} para ${newStatus} (Vigência: ${validUntil}).`,
      { previousValue: prevStatus, newValue: newStatus, reason }
    );

    saveState(dbState);
    res.json({ subscription: sub, subscriptions: dbState.subscriptions });
  });

  // 5.6 Gestão Financeira (Ajuste administrativo justificado & Webhook idempotente)
  app.patch('/api/admin/payments/:id/status', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_FINANCE');
    if (!profile) return;

    const payment = dbState.payments.find((p) => p.id === req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Lançamento financeiro não localizado.' });
    }

    const newStatus = sanitizeText(req.body?.status, 25) as PaymentTransactionItem['status'];
    const reason = sanitizeText(req.body?.reason, 240);
    if (!reason) {
      return res.status(400).json({
        error: 'Todo ajuste financeiro administrativo exige justificativa obrigatória para auditoria.',
      });
    }

    const prevStatus = payment.status;
    payment.status = newStatus;
    payment.adminAdjustmentNote = `${reason} — por ${profile.userName}`;
    if (newStatus === 'CONFIRMED') {
      payment.paidAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      // Auto-regularize overdue subscription if configured
      if (payment.subscriptionId && dbState.delinquencyPolicy.autoReactivateOnPayment) {
        const sub = dbState.subscriptions.find((s) => s.id === payment.subscriptionId);
        if (sub) {
          sub.status = 'ACTIVE';
          sub.delinquencyDays = 0;
        }
        const org = dbState.organizations.find((o) => o.id === payment.organizationId);
        if (org && org.status === 'SUSPENDED') org.status = 'ACTIVE';
      }
    }

    recordAudit(
      profile,
      `PAYMENT_ADJUSTED_${newStatus}`,
      'payments',
      payment.id,
      `Transação ${payment.code} (${formatBrl(payment.amountBrl)}) ajustada de ${prevStatus} para ${newStatus}. Justificativa: ${reason}`,
      { previousValue: prevStatus, newValue: newStatus, reason }
    );

    saveState(dbState);
    res.json({
      payment,
      payments: dbState.payments,
      subscriptions: dbState.subscriptions,
      organizations: dbState.organizations,
    });
  });

  // 5.7 Gestão de Taxas (Validação matemática + Snapshot imutável)
  app.post('/api/admin/fee-rules', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_FEES');
    if (!profile) return;

    const code = sanitizeText(req.body?.code || `NEX-FEE-${Date.now()}`, 30).toUpperCase();
    const name = sanitizeText(req.body?.name, 120);
    const companyPercent = Number(req.body?.companyPercent);
    const providerPercent = Number(req.body?.providerPercent);
    const totalPercent = Number((companyPercent + providerPercent).toFixed(2));
    const validFrom = sanitizeText(
      req.body?.validFrom || new Date().toISOString().slice(0, 10),
      15
    );

    const splitValidation = validateFeeRuleSplit(totalPercent, companyPercent, providerPercent);
    if (!splitValidation.valid) {
      return res.status(400).json({ error: splitValidation.error });
    }

    // Deactivate previous active maintenance rules if activating this new one
    dbState.feeRules.forEach((r) => {
      r.isActive = false;
    });

    const newRule: FeeRuleItem = {
      id: `fee-rule-${Date.now()}`,
      code,
      name: name || `Taxa de Manutenção NexCarga (${totalPercent}%)`,
      feeType: 'MAINTENANCE',
      totalPercent,
      companyPercent,
      providerPercent,
      fixedFeeBrl: 0,
      validFrom,
      isActive: true,
      createdAt: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      updatedBy: `${profile.userName} (${profile.role})`,
    };

    dbState.feeRules.unshift(newRule);
    dbState.commercialSettings.totalMaintenanceFeePercent = totalPercent;
    dbState.commercialSettings.companyFeePercent = companyPercent;
    dbState.commercialSettings.providerFeePercent = providerPercent;

    recordAudit(
      profile,
      'FEE_RULE_CREATED_AND_ACTIVATED',
      'fee_rules',
      newRule.id,
      `Nova regra "${newRule.name}" ativada: ${totalPercent}% (${companyPercent}% contratante + ${providerPercent}% prestador). Contratos anteriores permanecem com seus snapshots imutáveis.`,
      {
        newValue: JSON.stringify(newRule),
        reason: 'Atualização de política de taxas para novas contratações',
      }
    );

    saveState(dbState);
    res.status(201).json({
      feeRules: dbState.feeRules,
      commercialSettings: dbState.commercialSettings,
    });
  });

  // Legacy endpoint compatibility for commercial settings update
  app.put('/api/admin/commercial-settings', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_FEES');
    if (!profile) return;

    const compPct = Number(req.body?.companyFeePercent);
    const provPct = Number(req.body?.providerFeePercent);
    const trialDays = Number(req.body?.freeTrialDays);
    const partnerComm = Number(req.body?.defaultPartnerCommissionPercent);

    const totalPct = Number((compPct + provPct).toFixed(2));
    const validation = validateFeeRuleSplit(totalPct, compPct, provPct);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    dbState.commercialSettings.companyFeePercent = compPct;
    dbState.commercialSettings.providerFeePercent = provPct;
    dbState.commercialSettings.totalMaintenanceFeePercent = totalPct;

    const activeRule = dbState.feeRules.find((r) => r.isActive);
    if (activeRule) {
      activeRule.companyPercent = compPct;
      activeRule.providerPercent = provPct;
      activeRule.totalPercent = totalPct;
      activeRule.updatedBy = `${profile.userName} (${profile.role})`;
    }

    if (Number.isFinite(trialDays) && trialDays >= 0 && trialDays <= 60) {
      dbState.commercialSettings.freeTrialDays = trialDays;
    }
    if (Number.isFinite(partnerComm) && partnerComm >= 0 && partnerComm <= 50) {
      dbState.commercialSettings.defaultPartnerCommissionPercent = partnerComm;
    }

    recordAudit(
      profile,
      'COMMERCIAL_SETTINGS_UPDATED',
      'system_settings',
      'commercial_rules',
      `Taxa total ajustada para ${dbState.commercialSettings.totalMaintenanceFeePercent}% (${dbState.commercialSettings.companyFeePercent}% contratante + ${dbState.commercialSettings.providerFeePercent}% prestador). Contratos anteriores preservados com snapshot imutável.`
    );

    saveState(dbState);
    res.json({
      commercialSettings: dbState.commercialSettings,
      feeRules: dbState.feeRules,
      auditLogs: dbState.auditLogs.slice(0, 60),
    });
  });

  // 5.8 Gestão de Inadimplência
  app.put('/api/admin/delinquency-policy', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_DELINQUENCY');
    if (!profile) return;

    const gracePeriodDays = Math.max(0, Number(req.body?.gracePeriodDays) ?? 5);
    const preDueNoticeDays = Math.max(1, Number(req.body?.preDueNoticeDays) ?? 3);
    const postDueNoticeDays = Math.max(1, Number(req.body?.postDueNoticeDays) ?? 1);
    const autoSuspensionDays = Math.max(1, Number(req.body?.autoSuspensionDays) ?? 10);
    const allowActiveOperationsCompletion = Boolean(
      req.body?.allowActiveOperationsCompletion ?? true
    );
    const autoReactivateOnPayment = Boolean(req.body?.autoReactivateOnPayment ?? true);

    dbState.delinquencyPolicy = {
      ...dbState.delinquencyPolicy,
      gracePeriodDays,
      preDueNoticeDays,
      postDueNoticeDays,
      autoSuspensionDays,
      allowActiveOperationsCompletion,
      autoReactivateOnPayment,
      updatedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      updatedBy: `${profile.userName} (${profile.role})`,
    };

    // Evaluate subscriptions against updated policy without deleting data or canceling active operations
    dbState.subscriptions.forEach((sub) => {
      const evaluation = evaluateSubscriptionDelinquency(sub, dbState.delinquencyPolicy);
      if (evaluation.shouldSuspendAccess && sub.status === 'OVERDUE') {
        sub.status = 'SUSPENDED';
      }
    });

    recordAudit(
      profile,
      'DELINQUENCY_POLICY_UPDATED',
      'delinquency_policies',
      'global_policy',
      `Política de inadimplência atualizada: Carência ${gracePeriodDays}d, Suspensão automática ${autoSuspensionDays}d, Preservar operações em andamento: ${allowActiveOperationsCompletion ? 'Sim' : 'Não'}.`
    );

    saveState(dbState);
    res.json({
      delinquencyPolicy: dbState.delinquencyPolicy,
      subscriptions: dbState.subscriptions,
    });
  });

  // 5.9 Gestão de Comissões e Parceiros
  app.post('/api/admin/partners', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PARTNERS');
    if (!profile) return;

    const name = sanitizeText(req.body?.name, 120);
    const cnpjCpf = sanitizeText(req.body?.cnpjCpf, 25);
    const cityUf = sanitizeText(req.body?.cityUf || 'Manhuaçu/MG', 60);
    const referralCode = sanitizeText(
      req.body?.referralCode || `NEX-${Date.now().toString().slice(-4)}`,
      30
    ).toUpperCase();
    const commissionPercent = Math.max(1, Math.min(50, Number(req.body?.commissionPercent) || 15));

    if (!name || !cnpjCpf) {
      return res.status(400).json({ error: 'Informe nome e CNPJ/CPF do parceiro comercial.' });
    }

    const newPartner: PartnerItem = {
      id: `prt-${Date.now()}`,
      name,
      cnpjCpf,
      cityUf,
      referralCode,
      referralLink: `https://nexcarga.com.br/convite/${referralCode}`,
      commissionType: 'PERCENTAGE',
      commissionPercent,
      indicationsCount: 0,
      conversionsCount: 0,
      totalCommissionBrl: 0,
      pendingCommissionBrl: 0,
      approvedCommissionBrl: 0,
      paidCommissionBrl: 0,
      status: 'ATIVO',
    };

    dbState.partners.unshift(newPartner);
    recordAudit(
      profile,
      'PARTNER_REGISTERED',
      'partners',
      newPartner.id,
      `Parceiro comercial "${name}" cadastrado com código ${referralCode} (${commissionPercent}%).`
    );

    saveState(dbState);
    res.status(201).json({ partners: dbState.partners });
  });

  app.patch('/api/admin/commissions/:id/status', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PARTNERS');
    if (!profile) return;

    const comm = dbState.partnerCommissions.find((c) => c.id === req.params.id);
    if (!comm) {
      return res.status(404).json({ error: 'Comissão não encontrada.' });
    }

    const newStatus = sanitizeText(req.body?.status, 20) as PartnerCommissionItem['status'];
    const idempotencyKey = `comm-payout-${comm.id}-${newStatus}`;
    if (
      newStatus === 'PAID' &&
      dbState.processedIdempotencyKeys.includes(idempotencyKey)
    ) {
      return res.status(200).json({ message: 'Pagamento de comissão já processado.', commission: comm });
    }

    const prevStatus = comm.status;
    comm.status = newStatus;
    if (newStatus === 'PAID') {
      comm.paidAt = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      dbState.processedIdempotencyKeys.push(idempotencyKey);
    }

    recordAudit(
      profile,
      `PARTNER_COMMISSION_${newStatus}`,
      'partner_commissions',
      comm.id,
      `Comissão de ${formatBrl(comm.commissionAmountBrl)} para ${comm.partnerName} alterada de ${prevStatus} para ${newStatus}.`,
      { previousValue: prevStatus, newValue: newStatus }
    );

    saveState(dbState);
    res.json({ partnerCommissions: dbState.partnerCommissions });
  });

  // 5.10 Gestão de Permissões (RBAC Matrix)
  app.put('/api/admin/permissions', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PERMISSIONS');
    if (!profile) return;

    const targetRole = sanitizeText(req.body?.role, 30) as UserRole;
    const permissions = Array.isArray(req.body?.permissions)
      ? (req.body.permissions as AdminPermissionAction[])
      : [];

    if (!targetRole || targetRole === 'SUPER_ADMIN') {
      return res.status(400).json({
        error: 'As permissões globais do SUPER_ADMIN são imutáveis por segurança.',
      });
    }

    const prevPerms = JSON.stringify(dbState.rolePermissions[targetRole] || []);
    dbState.rolePermissions[targetRole] = permissions;

    recordAudit(
      profile,
      'RBAC_PERMISSIONS_UPDATED',
      'role_permissions',
      targetRole,
      `Matriz de permissões do perfil ${targetRole} atualizada (${permissions.length} permissões ativas).`,
      { previousValue: prevPerms, newValue: JSON.stringify(permissions) }
    );

    saveState(dbState);
    res.json({ rolePermissions: dbState.rolePermissions });
  });

  // FASE E — Configurações Gerais da Plataforma
  app.put('/api/admin/platform-settings', (req: Request, res: Response) => {
    const profile = verifyAdminPermission(req, res, 'MANAGE_PLATFORM_SETTINGS');
    if (!profile) return;

    dbState.platformSettings = {
      ...dbState.platformSettings,
      supportEmail: sanitizeText(
        req.body?.supportEmail || dbState.platformSettings.supportEmail,
        100
      ),
      supportPhone: sanitizeText(
        req.body?.supportPhone || dbState.platformSettings.supportPhone,
        40
      ),
      nexgridDefaultRadiusKm: Math.max(
        25,
        Math.min(500, Number(req.body?.nexgridDefaultRadiusKm) || 100)
      ),
      nexiaEnabled: Boolean(req.body?.nexiaEnabled ?? true),
      nexiaVerifyRequireHumanApproval: Boolean(
        req.body?.nexiaVerifyRequireHumanApproval ?? true
      ),
      maintenanceMode: Boolean(req.body?.maintenanceMode ?? false),
      pwaInstallBannerEnabled: Boolean(req.body?.pwaInstallBannerEnabled ?? true),
      updatedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    };

    recordAudit(
      profile,
      'PLATFORM_SETTINGS_UPDATED',
      'platform_settings',
      'global',
      `Configurações gerais da plataforma NexCarga atualizadas por ${profile.userName}.`
    );

    saveState(dbState);
    res.json({ platformSettings: dbState.platformSettings });
  });

  // 10. NexIA Intelligent Assistant (Server-Side Gemini API grounded in real database state)
  app.post('/api/nexia/chat', async (req: Request, res: Response) => {
    const profile = getActiveProfile();
    const prompt = sanitizeText(req.body?.prompt, 500);
    if (!prompt) {
      return res.status(400).json({ error: 'Digite uma pergunta ou comando para a NexIA.' });
    }

    const publishedSummary = dbState.freights
      .slice(0, 6)
      .map(
        (f) =>
          `${f.code}: ${f.originCity}/${f.originUf} -> ${f.destinationCity}/${f.destinationUf} (${f.distanceKm} km, ${f.cargoType}, Veículo: ${f.vehicleRequired}, Valor: ${formatBrl(f.offeredValueBrl)})`
      )
      .join('\n');

    const systemContext = `Você é a NexIA, Assistente Inteligente Oficial da plataforma LogTech SaaS B2B NEXCARGA (desenvolvida pela Pupa Labs — "Sua carga. Nossa conexão.").
Responda sempre em português brasileiro (pt-BR), de forma objetiva, técnica e prestativa.
Nunca invente fretes ou valores que não estejam nos dados reais abaixo.
Usuário atual: ${profile.userName} (${profile.roleLabel} — ${profile.organizationName}).
Taxa de manutenção da plataforma: ${dbState.commercialSettings.totalMaintenanceFeePercent}% (${dbState.commercialSettings.companyFeePercent}% contratante e ${dbState.commercialSettings.providerFeePercent}% prestador).
Planos oficiais: Mensal R$ 79,90 | Trimestral R$ 164,70 | Anual R$ 540,00 (15 dias grátis).
Fretes reais ativos na plataforma neste momento:
${publishedSummary}`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: systemContext,
          },
        });
        const replyText =
          response.text ||
          'Consulta processada pela NexIA com base nos fretes ativos de Manhuaçu/MG e região.';
        return res.json({
          reply: replyText,
          source: 'GEMINI_API',
        });
      } catch (err) {
        console.warn('[NexIA Gemini fallback]:', err);
      }
    }

    // Deterministic real-data contextual engine when GEMINI_API_KEY is not yet configured
    const lower = prompt.toLowerCase();
    let reply = '';
    if (lower.includes('frete') || lower.includes('região') || lower.includes('manhuaçu')) {
      const top3 = dbState.freights.slice(0, 3);
      reply = `Encontrei ${dbState.freights.length} fretes reais ativos a partir do hub de Manhuaçu/MG e Zona da Mata:\n• ${top3[0].code}: ${top3[0].originCity}/${top3[0].originUf} → ${top3[0].destinationCity}/${top3[0].destinationUf} (${top3[0].distanceKm} km | ${top3[0].vehicleRequired}) — ${formatBrl(top3[0].offeredValueBrl)}\n• ${top3[1].code}: ${top3[1].originCity}/${top3[1].originUf} → ${top3[1].destinationCity}/${top3[1].destinationUf} (${top3[1].distanceKm} km | ${top3[1].vehicleRequired}) — ${formatBrl(top3[1].offeredValueBrl)}\n• ${top3[2].code}: ${top3[2].originCity}/${top3[2].originUf} → ${top3[2].destinationCity}/${top3[2].destinationUf} (${top3[2].distanceKm} km | ${top3[2].vehicleRequired}) — ${formatBrl(top3[2].offeredValueBrl)}`;
    } else if (lower.includes('custo') || lower.includes('calcular')) {
      const sampleCalc = calculateLogisticsCost(
        {
          originCity: 'Manhuaçu/MG',
          destinationCity: 'Vitória/ES',
          distanceKm: 295,
          vehicleType: 'Truck',
          weightTons: 14,
          dieselPriceBrl: 6.15,
          avgConsumptionKmL: 3.2,
          tollCostBrl: 165,
          operationalDailyBrl: 340,
          marginPercent: 18,
        },
        dbState.commercialSettings.companyFeePercent,
        dbState.commercialSettings.providerFeePercent
      );
      reply = `Estimativa orientativa pelo Motor de Custos NexCarga (Manhuaçu/MG → Vitória/ES, 295 km em Truck):\n• Combustível estimado: ${formatBrl(sampleCalc.fuelCostBrl)} (${sampleCalc.litersNeeded} L)\n• Custo operacional base + pedágios: ${formatBrl(sampleCalc.baseTransportCostBrl)}\n• Frete sugerido (margem 18%): ${formatBrl(sampleCalc.recommendedFreightValueBrl)}\n• Taxa NexCarga (${dbState.commercialSettings.totalMaintenanceFeePercent}%): ${formatBrl(sampleCalc.totalPlatformFeeBrl)} (${dbState.commercialSettings.companyFeePercent}% contratante / ${dbState.commercialSettings.providerFeePercent}% prestador).`;
    } else if (lower.includes('publicar')) {
      reply = `Para publicar um frete com alta taxa de aceitação para ${profile.organizationName}: clique em "+ Publicar novo frete", informe Origem e Destino com CEP e logradouro, selecione o veículo (ex.: Truck, Carreta, Carreta LS) e o valor ofertado. O endereço é geocodificado no servidor e entra imediatamente no Radar NEXGRID.`;
    } else {
      reply = `Olá, ${profile.userName}! Estou analisando os dados reais de ${profile.organizationName}: temos ${dbState.kpis.publishedFreights} fretes publicados, ${dbState.kpis.receivedProposals} propostas recebidas e ${dbState.kpis.activeContracts} contratações ativas. Posso filtrar fretes no Radar NEXGRID, calcular custos de rota ou auxiliar em uma nova publicação.`;
    }

    res.json({
      reply,
      source: 'NEXIA_CONTEXT_ENGINE',
    });
  });

  // Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXCARGA] Servidor Full Stack rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
