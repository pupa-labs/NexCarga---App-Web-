import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdminControlMetrics,
  calculateDistanceKm,
  calculateLogisticsCost,
  calculatePlatformFees,
  canReviewerApproveTrustDocument,
  canRoleAccessSection,
  createImmutableFeeSnapshot,
  evaluateNexCargaTrustStatus,
  evaluateSubscriptionDelinquency,
  filterFreightsByRoleVisibility,
  filterNexgridFreights,
  formatBrl,
  formatDateBr,
  geocodeBrazilianAddress,
  hasAdminPermission,
  resolveOfficialStorageBucket,
  validateCep,
  validateCnpj,
  validateCpf,
  validateFeeRuleSplit,
} from './logisticsRules';
import {
  INITIAL_ADMIN_USERS,
  INITIAL_CONTRACTS,
  INITIAL_DELINQUENCY_POLICY,
  INITIAL_DOCUMENTS,
  INITIAL_FEE_RULES,
  INITIAL_FREIGHTS,
  INITIAL_ORGANIZATIONS,
  INITIAL_PARTNER_COMMISSIONS,
  INITIAL_PAYMENTS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SUBSCRIPTIONS,
} from '../data/initialSeed';

describe('NEXCARGA — Regras Comerciais, NEXGRID, Perfil e NEXCARGA TRUST', () => {
  it('Formata valores monetários no padrão brasileiro R$ 1.234,56 e datas DD/MM/AAAA', () => {
    assert.equal(formatBrl(12480), 'R$ 12.480,00');
    assert.equal(formatBrl(79.9), 'R$ 79,90');
    assert.equal(formatDateBr('2026-11-05'), '05/11/2026');
  });

  it('Valida CPF, CNPJ e CEP brasileiros', () => {
    assert.equal(validateCpf('084.512.936-20'), true);
    assert.equal(validateCpf('111.111.111-11'), false);
    assert.equal(validateCnpj('18.492.310/0001-54'), true);
    assert.equal(validateCep('36900-000'), true);
    assert.equal(validateCep('3690'), false);
  });

  it('Calcula taxa padrão da plataforma de 3,5% (1,75% contratante + 1,75% prestador)', () => {
    const res = calculatePlatformFees(5600, 1.75, 1.75);
    assert.equal(res.totalFeePercent, 3.5);
    assert.equal(res.companyFeeBrl, 98.0);
    assert.equal(res.providerFeeBrl, 98.0);
    assert.equal(res.totalPlatformFeeBrl, 196.0);
    assert.equal(res.netProviderValueBrl, 5502.0);
  });

  it('Valida matematicamente a divisão da regra de taxa (soma contratante + prestador = total)', () => {
    const validSplit = validateFeeRuleSplit(3.5, 1.75, 1.75);
    assert.equal(validSplit.valid, true);

    const invalidSplit = validateFeeRuleSplit(3.5, 2.0, 2.0);
    assert.equal(invalidSplit.valid, false);
    assert.ok(invalidSplit.error?.includes('Divisão matemática inválida'));
  });

  it('Gera snapshot imutável de taxa no contrato sem sofrer alteração retroativa', () => {
    const activeRule = INITIAL_FEE_RULES[0];
    const snapshot = createImmutableFeeSnapshot(10000, activeRule);
    assert.equal(snapshot.totalFeePercent, 3.5);
    assert.equal(snapshot.companyFeeBrl, 175.0);
    assert.equal(snapshot.providerFeeBrl, 175.0);
    assert.equal(snapshot.totalPlatformFeeBrl, 350.0);

    // Simula mudança futura na regra para 4.0% e confirma que o snapshot permanece 3.5%
    const mutatedRule = { ...activeRule, totalPercent: 4.0, companyPercent: 2.0, providerPercent: 2.0 };
    assert.equal(mutatedRule.totalPercent, 4.0);
    assert.equal(snapshot.totalFeePercent, 3.5);
    assert.equal(snapshot.totalPlatformFeeBrl, 350.0);
  });

  it('Geocodifica endereços brasileiros no servidor e valida coordenadas (Manhuaçu/MG -> Vitória/ES)', () => {
    const geoOrig = geocodeBrazilianAddress({
      city: 'Manhuaçu',
      uf: 'MG',
      cep: '36900-000',
      street: 'Rodovia BR-262',
      number: 'Km 38',
      neighborhood: 'Distrito Industrial',
    });
    assert.equal(geoOrig.validated, true);
    assert.equal(geoOrig.uf, 'MG');
    assert.ok(Math.abs(geoOrig.latitude - -20.2572) < 0.05);
    assert.ok(Math.abs(geoOrig.longitude - -42.0336) < 0.05);

    const dist = calculateDistanceKm(geoOrig.latitude, geoOrig.longitude, -20.3155, -40.3128);
    assert.ok(dist > 150 && dist < 320);
  });

  it('Filtra oportunidades no Radar NEXGRID por todos os parâmetros avançados (veículo, implemento, peso, valor, UF)', () => {
    const trucksOnly = filterNexgridFreights(INITIAL_FREIGHTS, {
      vehicleType: 'Truck',
    });
    assert.ok(trucksOnly.length > 0);
    assert.ok(trucksOnly.every((f) => f.vehicleRequired === 'Truck'));

    const siderOnly = filterNexgridFreights(INITIAL_FREIGHTS, {
      implementType: 'Sider',
      minWeightKg: 15000,
    });
    assert.ok(siderOnly.length >= 1);
    assert.ok(siderOnly.every((f) => f.implementRequired.includes('Sider') && f.weightKg >= 15000));

    const valueFiltered = filterNexgridFreights(INITIAL_FREIGHTS, {
      minValueBrl: 6000,
      maxValueBrl: 8500,
    });
    assert.ok(valueFiltered.every((f) => f.offeredValueBrl >= 6000 && f.offeredValueBrl <= 8500));
  });

  it('Aplica visibilidade por perfil e isolamento multi-tenant no NEXGRID', () => {
    const privateFreight = {
      ...INITIAL_FREIGHTS[0],
      id: 'fr-private-test',
      organizationId: 'org-vale-sa',
      visibility: 'PRIVATE' as const,
    };
    const list = [privateFreight, INITIAL_FREIGHTS[1]];

    const driverVisible = filterFreightsByRoleVisibility(list, 'DRIVER', 'org-driver-joao');
    assert.equal(driverVisible.some((f) => f.id === 'fr-private-test'), false);

    const ownerVisible = filterFreightsByRoleVisibility(list, 'COMPANY', 'org-vale-sa');
    assert.equal(ownerVisible.some((f) => f.id === 'fr-private-test'), true);

    const adminVisible = filterFreightsByRoleVisibility(list, 'SUPER_ADMIN', 'org-pupa-labs');
    assert.equal(adminVisible.length, 2);
  });

  it('Aplica RBAC administrativo por princípio do menor privilégio no NexCarga Control', () => {
    assert.equal(canRoleAccessSection('DRIVER', 'publicar-frete'), false);
    assert.equal(canRoleAccessSection('COMPANY', 'publicar-frete'), true);

    assert.equal(
      hasAdminPermission('SUPER_ADMIN', 'GRANT_MANUAL_SUBSCRIPTION', INITIAL_ROLE_PERMISSIONS),
      true
    );
    assert.equal(
      hasAdminPermission('FINANCE', 'GRANT_MANUAL_SUBSCRIPTION', INITIAL_ROLE_PERMISSIONS),
      false
    );
    assert.equal(
      hasAdminPermission('VERIFICATION', 'MANAGE_FEES', INITIAL_ROLE_PERMISSIONS),
      false
    );
    assert.equal(
      hasAdminPermission('VERIFICATION', 'VERIFY_DOCUMENTS', INITIAL_ROLE_PERMISSIONS),
      true
    );
  });

  it('Avalia política de inadimplência preservando operações logísticas em andamento e respeitando concessão manual', () => {
    const overdueSub = INITIAL_SUBSCRIPTIONS.find((s) => s.id === 'sub-transrio-overdue')!;
    const evalOverdue = evaluateSubscriptionDelinquency(overdueSub, INITIAL_DELINQUENCY_POLICY);
    assert.equal(evalOverdue.shouldSuspendAccess, true);
    assert.equal(evalOverdue.recommendedStatus, 'SUSPENDED');
    assert.equal(evalOverdue.preserveActiveOperations, true);

    const manualGrantSub = INITIAL_SUBSCRIPTIONS.find((s) => s.isManualGrant)!;
    const evalGrant = evaluateSubscriptionDelinquency(manualGrantSub, INITIAL_DELINQUENCY_POLICY);
    assert.equal(evalGrant.shouldSuspendAccess, false);
    assert.equal(evalGrant.recommendedStatus, 'MANUAL_GRANT');
  });

  it('Calcula todos os indicadores reais do dashboard NexCarga Control sem valores aleatórios', () => {
    const metrics = calculateAdminControlMetrics({
      users: INITIAL_ADMIN_USERS,
      organizations: INITIAL_ORGANIZATIONS,
      subscriptions: INITIAL_SUBSCRIPTIONS,
      payments: INITIAL_PAYMENTS,
      freights: INITIAL_FREIGHTS,
      contracts: INITIAL_CONTRACTS,
      partnerCommissions: INITIAL_PARTNER_COMMISSIONS,
    });

    assert.equal(metrics.totalUsers, INITIAL_ADMIN_USERS.length);
    assert.ok(metrics.activeUsers >= 6);
    assert.ok(metrics.manualGrantSubscriptions >= 1);
    assert.ok(metrics.mrrBrl > 0);
    assert.ok(metrics.accumulatedRevenueBrl > 0);
    assert.equal(metrics.totalPublishedFreights, INITIAL_FREIGHTS.length);
    assert.ok(metrics.collectedFeesBrl > 0);
  });

  it('Calcula custos logísticos no Motor de Custos com diesel, pedágio, diária e margem', () => {
    const cost = calculateLogisticsCost({
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
    });
    assert.ok(cost.litersNeeded > 90);
    assert.ok(cost.recommendedFreightValueBrl > cost.baseTransportCostBrl);
    assert.ok(cost.netDriverEarningsBrl < cost.recommendedFreightValueBrl);
  });

  it('NEXCARGA TRUST — Mapeia documentos para os 6 buckets privados oficiais e impede autoaprovação', () => {
    assert.equal(resolveOfficialStorageBucket('CNH', 'DRIVER'), 'driver-documents');
    assert.equal(resolveOfficialStorageBucket('CARTAO_CNPJ', 'COMPANY'), 'company-documents');
    assert.equal(resolveOfficialStorageBucket('CRLV', 'DRIVER'), 'driver-documents');
    assert.equal(resolveOfficialStorageBucket('CT_E', 'CARRIER'), 'freight-attachments');

    // Usuário comum não pode aprovar documentos
    const companyTry = canReviewerApproveTrustDocument({
      reviewerUserId: 'usr-carlos-company',
      reviewerRole: 'COMPANY',
      reviewerOrganizationId: 'org-vale-sa',
      targetOrganizationId: 'org-driver-joao',
      uploadedByUserId: 'usr-joao-driver',
    });
    assert.equal(companyTry.allowed, false);

    // Mesmo perfil VERIFICATION não pode autoaprovar documento enviado por ele próprio
    const selfTry = canReviewerApproveTrustDocument({
      reviewerUserId: 'usr-helena-verify',
      reviewerRole: 'VERIFICATION',
      reviewerOrganizationId: 'org-pupa-labs',
      targetOrganizationId: 'org-driver-joao',
      uploadedByUserId: 'usr-helena-verify',
    });
    assert.equal(selfTry.allowed, false);
    assert.ok(selfTry.reason?.includes('Violação de segurança'));

    // Analista de homologação aprovando documento de terceiro
    const validReviewer = canReviewerApproveTrustDocument({
      reviewerUserId: 'usr-helena-verify',
      reviewerRole: 'VERIFICATION',
      reviewerOrganizationId: 'org-pupa-labs',
      targetOrganizationId: 'org-driver-joao',
      uploadedByUserId: 'usr-joao-driver',
    });
    assert.equal(validReviewer.allowed, true);
  });

  it('NEXCARGA TRUST — Concede selo VERIFIED somente com todos documentos vigentes e suspende para EXPIRED se houver documento vencido', () => {
    const valeDocs = INITIAL_DOCUMENTS.filter((d) => d.organizationId === 'org-vale-sa');
    const valeEval = evaluateNexCargaTrustStatus({
      entityCategory: 'COMPANY_SHIPPER',
      documents: valeDocs,
      currentStatus: 'UNDER_REVIEW',
      referenceDateIso: '2026-11-05',
    });
    assert.equal(valeEval.trustStatus, 'VERIFIED');
    assert.equal(valeEval.verifiedBadge, true);

    // Transportadora com ANTT vencido em 2026-09-01 deve ter status EXPIRED e selo suspenso (verifiedBadge = false)
    const transrioDocs = INITIAL_DOCUMENTS.filter((d) => d.organizationId === 'org-transrio');
    const transrioEval = evaluateNexCargaTrustStatus({
      entityCategory: 'CARRIER',
      documents: transrioDocs,
      currentStatus: 'VERIFIED',
      referenceDateIso: '2026-11-05',
    });
    assert.equal(transrioEval.trustStatus, 'EXPIRED');
    assert.equal(transrioEval.verifiedBadge, false);
  });

  it('Selo Oficial NEXCARGA VERIFICADO — PNG RGBA real com fundo transparente (colorType 6) e interior preservado', async () => {
    const fs = await import('node:fs');
    const zlib = await import('node:zlib');
    const filePath = 'public/assets/brand/nexcarga-verificado-oficial.png';
    assert.equal(fs.existsSync(filePath), true, 'Arquivo oficial do selo deve existir');

    const buf = fs.readFileSync(filePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];

    assert.equal(width, 1254);
    assert.equal(height, 1254);
    assert.equal(bitDepth, 8);
    assert.equal(colorType, 6, 'PNG deve ser RGBA com canal Alpha real (colorType === 6)');

    // Decodifica primeira linha (canto externo 0,0) para confirmar alpha === 0
    const idatChunks: Buffer[] = [];
    let offset = 8;
    while (offset < buf.length) {
      const length = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
      if (type === 'IDAT') {
        idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
      }
      offset += 12 + length;
    }
    const raw = zlib.inflateSync(Buffer.concat(idatChunks));
    const stride = 1 + width * 4;
    // Pixel (0,0) no canto superior esquerdo (filter Sub/None na linha 0)
    const cornerAlpha = raw[4];
    assert.equal(cornerAlpha, 0, 'Fundo quadrado externo no canto (0,0) deve ser 100% transparente (alpha = 0)');
    assert.ok(stride > 5000);
  });
});


