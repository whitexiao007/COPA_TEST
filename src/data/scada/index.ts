import { MockScadaRepository } from './MockScadaRepository';
export const scadaRepository = new MockScadaRepository();
export type { ScadaRepository, WellProductionSummary, ProductionDataPoint } from './ScadaRepository';
