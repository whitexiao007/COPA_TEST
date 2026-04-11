export interface DiagnosticRule {
  wellType: 'esp' | 'rod_pump';
  triggerItemId: string;    // templateItemId that triggers this
  triggerStatus: 'fail';
  subItems: DiagnosticSubItem[];
  recommendedActions: RecommendationRule[];
}

export interface DiagnosticSubItem {
  id: string;
  label: string;
  inputType: 'text' | 'select' | 'number';
  options?: string[];
  unit?: string;
}

export interface RecommendationRule {
  conditions: Record<string, string>;  // subItem id → value that triggers it
  recommendation: string;
}

export const DIAGNOSTIC_RULES: DiagnosticRule[] = [
  // ESP Rules
  {
    wellType: 'esp',
    triggerItemId: 'amp_reading',
    triggerStatus: 'fail',
    subItems: [
      { id: 'amp_value', label: 'Amp Value', inputType: 'number', unit: 'amps' },
      { id: 'vsd_frequency', label: 'VSD Frequency', inputType: 'number', unit: 'Hz' },
      { id: 'intake_pressure', label: 'Intake Pressure', inputType: 'number', unit: 'psi' },
      { id: 'trend', label: 'Trend', inputType: 'select', options: ['Rising', 'Stable', 'Falling'] }
    ],
    recommendedActions: [
      {
        conditions: { trend: 'Rising' },
        recommendation: 'Escalating amp draw — monitor closely, pull may be required within 24-48h'
      },
      {
        conditions: { vsd_frequency: '60' }, // Assuming > 60 logic in evaluate
        recommendation: 'VSD overfrequency detected — reduce to nameplate spec'
      }
    ]
  },
  {
    wellType: 'esp',
    triggerItemId: 'vsd_panel',
    triggerStatus: 'fail',
    subItems: [
      { id: 'fault_code', label: 'Fault Code', inputType: 'text' },
      { id: 'bypass_available', label: 'Bypass Available', inputType: 'select', options: ['Yes', 'No'] },
      { id: 'last_reset', label: 'Last Reset', inputType: 'select', options: ['< 1 hour', '1-8 hours', '> 8 hours'] }
    ],
    recommendedActions: [
      {
        conditions: { bypass_available: 'No' },
        recommendation: 'No bypass available — site may go offline. Notify supervisor immediately'
      },
      {
        conditions: { last_reset: '< 1 hour' },
        recommendation: 'Recent reset suggests persistent fault — do not reset again, call vendor'
      }
    ]
  },
  // Rod Pump Rules
  {
    wellType: 'rod_pump',
    triggerItemId: 'stuffing_box',
    triggerStatus: 'fail',
    subItems: [
      { id: 'leak_severity', label: 'Leak Severity', inputType: 'select', options: ['Drip', 'Stream', 'Spray'] },
      { id: 'cause', label: 'Cause', inputType: 'select', options: ['Packing', 'Polish Rod', 'Unknown'] },
      { id: 'hours_since_last_service', label: 'Hours Since Last Service', inputType: 'number', unit: 'hours' }
    ],
    recommendedActions: [
      {
        conditions: { leak_severity: 'Spray' },
        recommendation: 'Spray-level leak — shut in well immediately, notify supervisor'
      },
      {
        conditions: { leak_severity: 'Stream', cause: 'Polish Rod' },
        recommendation: 'Polish rod wear likely — schedule rod replacement within 24h'
      },
      {
        conditions: { leak_severity: 'Drip', cause: 'Packing' },
        recommendation: 'Packing adjustment may resolve — attempt packing nut tighten'
      }
    ]
  },
  {
    wellType: 'rod_pump',
    triggerItemId: 'gearbox_oil',
    triggerStatus: 'fail',
    subItems: [
      { id: 'oil_level', label: 'Oil Level', inputType: 'select', options: ['Low', 'Empty', 'Contaminated'] },
      { id: 'metal_shavings', label: 'Metal Shavings', inputType: 'select', options: ['Yes', 'No'] },
      { id: 'last_change', label: 'Last Change', inputType: 'number', unit: 'days' }
    ],
    recommendedActions: [
      {
        conditions: { oil_level: 'Empty' },
        recommendation: 'Gearbox running dry — shut in immediately to prevent catastrophic failure'
      },
      {
        conditions: { metal_shavings: 'Yes' },
        recommendation: 'Metal contamination found — gearbox failure imminent, shut in and call vendor'
      },
      {
        conditions: { oil_level: 'Contaminated' },
        recommendation: 'Contaminated oil — drain and refill required before next startup'
      }
    ]
  }
];

export function getApplicableRules(wellType: string, templateItemId: string): DiagnosticRule | undefined {
  return DIAGNOSTIC_RULES.find(r => r.wellType === wellType && r.triggerItemId === templateItemId);
}

export function evaluateRecommendations(rule: DiagnosticRule, subItemData: Record<string, string>): string[] {
  const recommendations: string[] = [];

  // Special logic for ESP amp_reading/vsd_frequency
  if (rule.triggerItemId === 'amp_reading') {
    const ampValue = Number(subItemData['amp_value']);
    const intakePressure = Number(subItemData['intake_pressure']);
    const vsdFreq = Number(subItemData['vsd_frequency']);

    // "amp_value > "threshold" AND intake_pressure low: "Possible gas interference — consider adjusting VSD frequency down 2-3 Hz""
    // Assuming threshold 50 and low pressure < 100 for this example
    if (ampValue > 50 && intakePressure < 100) {
      recommendations.push('Possible gas interference — consider adjusting VSD frequency down 2-3 Hz');
    }
    
    if (vsdFreq > 60) {
      recommendations.push('VSD overfrequency detected — reduce to nameplate spec');
    }
  }

  rule.recommendedActions.forEach(rec => {
    // Skip if vsd_frequency is already handled by special logic
    if (rec.conditions.vsd_frequency) return;

    const matches = Object.entries(rec.conditions).every(([id, val]) => subItemData[id] === val);
    if (matches && Object.keys(rec.conditions).length > 0) {
      recommendations.push(rec.recommendation);
    }
  });

  return recommendations;
}
