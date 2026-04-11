import Dexie, { type Table } from 'dexie';

export interface Well {
  id?: number;
  tenantId: string;
  name: string;
  apiNumber: string;
  wellType: 'rod_pump' | 'esp' | 'gas_lift' | 'swd';
  padName: string;
  field: string;
  lat: number;
  lng: number;
  lastInspectionDate?: string;
}

export interface SubItem {
  id: string;
  label: string;
  inputType: 'text' | 'select' | 'number';
  options?: string[];
}

export interface ConditionalLogic {
  triggerValue: 'fail';
  subItems: SubItem[];
}

export interface TemplateItem {
  id: string;
  label: string;
  required: boolean;
  hasConditional?: boolean;
  conditional?: ConditionalLogic;
}

export interface TemplateCategory {
  id: string;
  name: string;
  items: TemplateItem[];
}

export interface Template {
  id?: number;
  tenantId: string;
  wellType: 'rod_pump' | 'esp' | 'gas_lift' | 'swd';
  version: number;
  name: string;
  categories: TemplateCategory[];
}

export interface Inspection {
  id?: number;
  tenantId: string;
  wellId: number;
  templateId: number;
  inspectorName: string;
  startedAt: string;
  completedAt?: string;
  synced: boolean;
}

export interface InspectionItem {
  id?: number;
  tenantId: string;
  inspectionId: number;
  templateItemId: string;
  status: 'pass' | 'fail' | 'na' | 'pending';
  notes: string;
  conditionalData?: Record<string, string>;
}

export interface Photo {
  id?: number;
  tenantId: string;
  inspectionItemId: number;
  blob: Blob;
  thumbnailBlob: Blob;
  capturedAt: string;
  synced: boolean;
}

export interface SyncQueueEntry {
  id?: number;
  tenantId: string;
  operation: 'create' | 'update';
  entityType: string;
  entityId: number;
  payload: string;
  createdAt: string;
  status: 'pending' | 'failed' | 'done';
  retryCount: number;
}

export interface Organization {
  id?: number;
  tenantId: string;      // unique slug, e.g. "pioneer-natural"
  name: string;          // display name, e.g. "Pioneer Natural Resources"
  createdAt: string;
}

export interface UserProfile {
  name: string;
  role: 'admin' | 'supervisor' | 'inspector';
  tenantId: string;
  organizationName: string;
}

export class CopaDB extends Dexie {
  wells!: Table<Well, number>;
  templates!: Table<Template, number>;
  inspections!: Table<Inspection, number>;
  inspectionItems!: Table<InspectionItem, number>;
  photos!: Table<Photo, number>;
  syncQueue!: Table<SyncQueueEntry, number>;
  organizations!: Table<Organization, number>;

  constructor() {
    super('CopaDB');
    this.version(1).stores({
      wells: '++id, tenantId, wellType, padName, apiNumber',
      templates: '++id, tenantId, wellType, version',
      inspections: '++id, tenantId, wellId, completedAt',
      inspectionItems: '++id, tenantId, inspectionId, templateItemId',
      photos: '++id, tenantId, inspectionItemId',
      syncQueue: '++id, tenantId, createdAt, status',
    });
    this.version(2).stores({
      organizations: '++id, &tenantId, name'
    });
  }
}

export const db = new CopaDB();
