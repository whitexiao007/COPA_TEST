export interface ChecklistItem {
  id: string;
  label: string;
  category: 'Safety' | 'Equipment' | 'Environmental' | 'Production';
}

export interface InspectionState {
  wellSite: string;
  inspectorName: string;
  timestamp: string;
  checks: Record<string, { checked: boolean; notes: string }>;
}
