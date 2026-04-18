import { ChecklistItem } from './types';

export const WELL_SITES = [
  "Ironvale Well #12",
  "Dustridge Site A-4",
  "Crestfall Formation #7",
  "Shalerock Unit 3",
  "Highplain Gas Field #2"
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Safety
  { id: 'safety-1', label: 'PPE compliance verified', category: 'Safety' },
  { id: 'safety-2', label: 'Emergency shutdown valves accessible', category: 'Safety' },
  { id: 'safety-3', label: 'Fire extinguishers inspected and charged', category: 'Safety' },
  { id: 'safety-4', label: 'H2S monitors functional', category: 'Safety' },
  
  // Equipment
  { id: 'equip-1', label: 'Wellhead pressure within normal range', category: 'Equipment' },
  { id: 'equip-2', label: 'Pump jack lubrication levels checked', category: 'Equipment' },
  { id: 'equip-3', label: 'Flow lines inspected for leaks', category: 'Equipment' },
  { id: 'equip-4', label: 'Separator vessel operating correctly', category: 'Equipment' },

  // Environmental
  { id: 'env-1', label: 'Secondary containment free of fluids', category: 'Environmental' },
  { id: 'env-2', label: 'No visible soil staining or leaks', category: 'Environmental' },
  { id: 'env-3', label: 'Spill kit fully stocked and accessible', category: 'Environmental' },
  { id: 'env-4', label: 'Vegetation control maintained', category: 'Environmental' },

  // Production
  { id: 'prod-1', label: 'Tank levels recorded', category: 'Production' },
  { id: 'prod-2', label: 'Gas meter readings documented', category: 'Production' },
  { id: 'prod-3', label: 'Chemical injection pumps operational', category: 'Production' },
  { id: 'prod-4', label: 'Water disposal system functional', category: 'Production' },
];
