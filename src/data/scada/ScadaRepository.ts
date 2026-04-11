export interface ProductionDataPoint {
  date: string;        // ISO date string YYYY-MM-DD
  oilRate: number;     // bbl/day
  waterRate: number;   // bbl/day
  gasRate: number;     // Mcf/day
  casingPressure: number;  // psi
  tubingPressure: number;  // psi
  runtimeHours: number;    // hours/day (0-24)
}

export interface WellProductionSummary {
  wellId: number;
  yesterday: ProductionDataPoint;
  sevenDayAvg: {
    oilRate: number;
    waterRate: number;
    gasRate: number;
    casingPressure: number;
    tubingPressure: number;
    runtimeHours: number;
  };
  thirtyDayData: ProductionDataPoint[];
  deviations: {  // true if yesterday deviates >20% from 7-day avg
    oilRate: boolean;
    waterRate: boolean;
    gasRate: boolean;
    casingPressure: boolean;
    tubingPressure: boolean;
    runtimeHours: boolean;
  };
}

export interface ScadaRepository {
  getProductionData(wellId: number): Promise<WellProductionSummary>;
}
