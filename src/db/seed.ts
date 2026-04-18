import { db, type Well, type Template, type TemplateCategory } from './schema';

const createDefaultTemplate = (wellType: Template['wellType'], name: string, tenantId: string): Template => {
  const safetyCategory: TemplateCategory = {
    id: 'safety',
    name: 'Safety',
    items: [
      { id: 'ppe', label: 'PPE (Hard hat, steel toes, FR)', required: true },
      { id: 'esd', label: 'ESD Valves Functioning', required: true, hasConditional: true, conditional: { triggerValue: 'fail', subItems: [{ id: 'esd_notes', label: 'ESD Issue Details', inputType: 'text' }] } },
      { id: 'h2s', label: 'H2S Monitors Calibrated', required: true },
      { id: 'fire_ext', label: 'Fire Extinguisher Charge', required: true }
    ]
  };

  const environmentalCategory: TemplateCategory = {
    id: 'environmental',
    name: 'Environmental',
    items: [
      { id: 'secondary_containment', label: 'Secondary Containment Clear', required: true },
      { id: 'soil_staining', label: 'No Soil Staining Observed', required: true, hasConditional: true, conditional: { triggerValue: 'fail', subItems: [{ id: 'staining_area', label: 'Area of Staining', inputType: 'text' }] } },
      { id: 'spill_kit', label: 'Spill Kit Present', required: true },
    ]
  };

  if (wellType === 'swd') {
    environmentalCategory.items.push({ id: 'injection_disposal', label: 'Injection Disposal Recorded', required: true });
  }

  const equipmentCategory: TemplateCategory = {
    id: 'equipment',
    name: 'Equipment',
    items: []
  };

  const productionCategory: TemplateCategory = {
    id: 'production',
    name: 'Production',
    items: [
      { id: 'tank_levels', label: 'Tank Levels Recorded', required: true, hasConditional: false },
      { id: 'gas_meter', label: 'Gas Meter Reading', required: true },
      { id: 'chemical_injection', label: 'Chemical Injection Rate', required: true },
      { id: 'runtime_hours', label: 'Runtime Hours', required: true }
    ]
  };

  switch (wellType) {
    case 'rod_pump':
      equipmentCategory.items = [
        { id: 'stuffing_box', label: 'Stuffing Box Condition', required: true },
        { id: 'counterbalance', label: 'Counterbalance Weight Secure', required: true },
        { id: 'gearbox_oil', label: 'Gearbox Oil Level', required: true },
        { id: 'belt_tension', label: 'Belt Tension', required: true },
        { id: 'polished_rod', label: 'Polished Rod Condition', required: true },
        { id: 'pump_jack_lubrication', label: 'Pump Jack Lubrication', required: true }
      ];
      break;
    case 'esp':
      equipmentCategory.items = [
        { id: 'vsd_panel', label: 'VSD/Drive Panel Functioning', required: true },
        { id: 'surface_cable', label: 'Surface Cable Integrity', required: true },
        { id: 'amp_reading', label: 'Amp Reading', required: true },
        { id: 'wellhead_pressure', label: 'Wellhead Pressure', required: true },
        { id: 'junction_box', label: 'Junction Box Condition', required: true }
      ];
      break;
    case 'gas_lift':
      equipmentCategory.items = [
        { id: 'injection_pressure', label: 'Injection Pressure', required: true },
        { id: 'control_valve', label: 'Control Valve Position', required: true },
        { id: 'wellhead_pressure', label: 'Wellhead Pressure', required: true },
        { id: 'flowline', label: 'Flowline Integrity', required: true }
      ];
      break;
    case 'swd':
      equipmentCategory.items = [
        { id: 'injection_pressure', label: 'Injection Pressure', required: true },
        { id: 'wellhead_pressure', label: 'Wellhead Pressure', required: true },
        { id: 'pump_condition', label: 'Pump Condition', required: true },
        { id: 'filter_condition', label: 'Filter Condition', required: true }
      ];
      productionCategory.items = [
        { id: 'injection_volume', label: 'Injection Volume', required: true },
        { id: 'pressure', label: 'Pressure', required: true },
        { id: 'chemical_injection', label: 'Chemical Injection Rate', required: true }
      ];
      break;
  }

  return {
    tenantId,
    wellType,
    version: 1,
    name,
    categories: [safetyCategory, equipmentCategory, productionCategory, environmentalCategory]
  };
};

export const seedDatabase = async (tenantId: string = 'default-tenant') => {
  const wellCount = await db.wells.where('tenantId').equals(tenantId).count();
  if (wellCount > 0) return;

  console.log(`Seeding database for tenant: ${tenantId}...`);

  const templates: Template[] = [
    createDefaultTemplate('rod_pump', 'Standard Rod Pump Template', tenantId),
    createDefaultTemplate('esp', 'Standard ESP Template', tenantId),
    createDefaultTemplate('gas_lift', 'Standard Gas Lift Template', tenantId),
    createDefaultTemplate('swd', 'Standard SWD Template', tenantId)
  ];

  await db.templates.bulkAdd(templates);

  const wells: Well[] = [
    // Ironvale Pad 1
    { tenantId, name: 'Ironvale A-1H', wellType: 'rod_pump', apiNumber: '42-329-40001-00-00', lat: 31.9973, lng: -102.0779, padName: 'Ironvale Pad 1', field: 'Ironvale Basin' },
    { tenantId, name: 'Ironvale A-2H', wellType: 'esp', apiNumber: '42-329-40002-00-00', lat: 31.9975, lng: -102.0781, padName: 'Ironvale Pad 1', field: 'Ironvale Basin' },
    { tenantId, name: 'Ironvale A-3H', wellType: 'rod_pump', apiNumber: '42-329-40003-00-00', lat: 31.9977, lng: -102.0783, padName: 'Ironvale Pad 1', field: 'Ironvale Basin' },
    { tenantId, name: 'Ironvale A-4H', wellType: 'gas_lift', apiNumber: '42-329-40004-00-00', lat: 31.9979, lng: -102.0785, padName: 'Ironvale Pad 1', field: 'Ironvale Basin' },

    // Dustridge Pad 2
    { tenantId, name: 'Dustridge 1H', wellType: 'esp', apiNumber: '42-329-40011-00-00', lat: 32.1123, lng: -101.9456, padName: 'Dustridge Pad 2', field: 'Ironvale Basin' },
    { tenantId, name: 'Dustridge 2H', wellType: 'rod_pump', apiNumber: '42-329-40012-00-00', lat: 32.1125, lng: -101.9458, padName: 'Dustridge Pad 2', field: 'Ironvale Basin' },
    { tenantId, name: 'Dustridge 3H', wellType: 'swd', apiNumber: '42-329-40013-00-00', lat: 32.1127, lng: -101.9460, padName: 'Dustridge Pad 2', field: 'Ironvale Basin' },
    { tenantId, name: 'Dustridge 4H', wellType: 'gas_lift', apiNumber: '42-329-40014-00-00', lat: 32.1129, lng: -101.9462, padName: 'Dustridge Pad 2', field: 'Ironvale Basin' },

    // Crestfall Pad 3
    { tenantId, name: 'Crestfall 1H', wellType: 'esp', apiNumber: '42-389-40021-00-00', lat: 31.6543, lng: -103.1234, padName: 'Crestfall Pad 3', field: 'Crestfall Basin' },
    { tenantId, name: 'Crestfall 2H', wellType: 'rod_pump', apiNumber: '42-389-40022-00-00', lat: 31.6545, lng: -103.1236, padName: 'Crestfall Pad 3', field: 'Crestfall Basin' },
    { tenantId, name: 'Crestfall 3H', wellType: 'esp', apiNumber: '42-389-40023-00-00', lat: 31.6547, lng: -103.1238, padName: 'Crestfall Pad 3', field: 'Crestfall Basin' },
    { tenantId, name: 'Crestfall 4H', wellType: 'gas_lift', apiNumber: '42-389-40024-00-00', lat: 31.6549, lng: -103.1240, padName: 'Crestfall Pad 3', field: 'Crestfall Basin' },

    // Shalerock Pad 4
    { tenantId, name: 'Shalerock 1H', wellType: 'rod_pump', apiNumber: '42-389-40031-00-00', lat: 31.7890, lng: -103.2345, padName: 'Shalerock Pad 4', field: 'Crestfall Basin' },
    { tenantId, name: 'Shalerock 2H', wellType: 'swd', apiNumber: '42-389-40032-00-00', lat: 31.7892, lng: -103.2347, padName: 'Shalerock Pad 4', field: 'Crestfall Basin' },
    { tenantId, name: 'Shalerock 3H', wellType: 'esp', apiNumber: '42-389-40033-00-00', lat: 31.7894, lng: -103.2349, padName: 'Shalerock Pad 4', field: 'Crestfall Basin' },
    { tenantId, name: 'Shalerock 4H', wellType: 'rod_pump', apiNumber: '42-389-40034-00-00', lat: 31.7896, lng: -103.2351, padName: 'Shalerock Pad 4', field: 'Crestfall Basin' },

    // Highplain Pad 5
    { tenantId, name: 'Highplain 1H', wellType: 'gas_lift', apiNumber: '42-227-40041-00-00', lat: 31.5432, lng: -102.5678, padName: 'Highplain Pad 5', field: 'Highplain Platform' },
    { tenantId, name: 'Highplain 2H', wellType: 'rod_pump', apiNumber: '42-227-40042-00-00', lat: 31.5434, lng: -102.5680, padName: 'Highplain Pad 5', field: 'Highplain Platform' },
    { tenantId, name: 'Highplain 3H', wellType: 'swd', apiNumber: '42-227-40043-00-00', lat: 31.5436, lng: -102.5682, padName: 'Highplain Pad 5', field: 'Highplain Platform' },
    { tenantId, name: 'Highplain 4H', wellType: 'esp', apiNumber: '42-227-40044-00-00', lat: 31.5438, lng: -102.5684, padName: 'Highplain Pad 5', field: 'Highplain Platform' }
  ];

  await db.wells.bulkAdd(wells);
  console.log('Seeding complete.');
};
