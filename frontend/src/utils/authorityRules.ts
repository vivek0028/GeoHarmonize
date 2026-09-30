export interface AuthorityRule {
  id: string;
  attribute: string;
  target: string;
  winner: string;
  condition: string;
  firedRuleText: string;
  active: boolean;
}

export function getAuthorityRules(): AuthorityRule[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('GEOHARMONIZE_AUTHORITY_RULES');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
  }
  return [
    {
      id: 'rule_owner',
      attribute: 'owner_name',
      target: 'Owner Identity',
      winner: '1998 Revenue Cadastre',
      condition: 'Official State Revenue Authority Hierarchy',
      firedRuleText: 'Revenue record is authoritative for ownership fields',
      active: true
    },
    {
      id: 'rule_khasra',
      attribute: 'khasra_no',
      target: 'Khasra / Plot Number',
      winner: '1998 Revenue Cadastre',
      condition: 'Official Revenue Register Normalization',
      firedRuleText: 'Revenue record wins, formatting normalized',
      active: true
    },
    {
      id: 'rule_area',
      attribute: 'area_m2',
      target: 'Parcel Polygon Area (m²)',
      winner: '2026 Drone & RTK Survey',
      condition: 'Positional Accuracy ±0.02m vs ±1.5m',
      firedRuleText: 'Survey wins geometry: ±0.02 m vs ±1.5 m',
      active: true
    },
    {
      id: 'rule_landuse',
      attribute: 'land_use',
      target: 'Zoning & Physical Land Use',
      winner: 'Municipal GIS 2025',
      condition: 'Municipal zoning supersedes historical rural classification',
      firedRuleText: 'Municipal zoning wins land use (2025 > 1998)',
      active: true
    },
    {
      id: 'rule_geom',
      attribute: 'boundary',
      target: 'Spatial Boundary & Vertices',
      winner: '2026 Drone & RTK Survey',
      condition: 'Sub-decimeter survey fit (±0.02m)',
      firedRuleText: 'Highest positional accuracy wins boundary',
      active: true
    },
    {
      id: 'rule_survey',
      attribute: 'survey_status',
      target: 'Ground Survey Verification',
      winner: '2026 Drone & RTK Survey',
      condition: 'Single authentic RTK-GNSS observation source',
      firedRuleText: 'Only one source',
      active: true
    }
  ];
}

export function getAuthorityRuleText(attr: string): string {
  const rules = getAuthorityRules();
  const rule = rules.find(r => r.attribute.toLowerCase() === attr.toLowerCase());
  if (rule && rule.firedRuleText) return rule.firedRuleText;
  if (attr === 'owner_name') return 'Revenue record is authoritative for ownership fields';
  if (attr === 'khasra_no') return 'Revenue record wins, formatting normalized';
  if (attr === 'area_m2' || attr === 'area') return 'Survey wins geometry: ±0.02 m vs ±1.5 m';
  if (attr === 'land_use') return 'Municipal zoning wins land use (2025 > 1998)';
  if (attr === 'boundary') return 'Highest positional accuracy wins boundary';
  if (attr === 'survey_status') return 'Only one source';
  return 'Precedence hierarchy applied';
}

export function saveAuthorityRules(rules: AuthorityRule[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('GEOHARMONIZE_AUTHORITY_RULES', JSON.stringify(rules));
  }
}

export function getConfidenceWeights(): { spatial: number; source: number; quality: number; recency: number } {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('GEOHARMONIZE_WEIGHTS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.spatial !== undefined) return parsed;
      } catch {}
    }
  }
  return { spatial: 35, source: 25, quality: 25, recency: 15 };
}

export function saveConfidenceWeights(weights: { spatial: number; source: number; quality: number; recency: number }) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('GEOHARMONIZE_WEIGHTS', JSON.stringify(weights));
  }
}
