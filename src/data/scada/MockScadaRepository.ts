import { 
  ScadaRepository, 
  WellProductionSummary, 
  ProductionDataPoint 
} from './ScadaRepository';

export class MockScadaRepository implements ScadaRepository {
  async getProductionData(wellId: number): Promise<WellProductionSummary> {
    const seededRandom = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };

    const random = seededRandom(wellId * 7919);

    const baseValues = {
      oilRate: 50 + (wellId * 37 % 200),
      waterRate: (50 + (wellId * 37 % 200)) * (1 + (wellId * 13 % 3)),
      gasRate: (50 + (wellId * 37 % 200)) * (0.5 + (wellId * 7 % 2)),
      casingPressure: 200 + (wellId * 17 % 600),
      tubingPressure: (200 + (wellId * 17 % 600)) * 0.7 + (wellId * 11 % 100),
      runtimeHours: 20 + (wellId % 4),
    };

    const thirtyDayData: ProductionDataPoint[] = [];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0]!;

      // Daily noise: ±15%
      const getVal = (base: number) => base * (0.85 + random() * 0.3);

      const dataPoint: ProductionDataPoint = {
        date: dateString,
        oilRate: getVal(baseValues.oilRate),
        waterRate: getVal(baseValues.waterRate),
        gasRate: getVal(baseValues.gasRate),
        casingPressure: getVal(baseValues.casingPressure),
        tubingPressure: getVal(baseValues.tubingPressure),
        runtimeHours: Math.min(24, getVal(baseValues.runtimeHours)),
      };

      thirtyDayData.push(dataPoint);
    }

    // For yesterday (index 0): add a ±25% spike on one random metric
    const yesterday = thirtyDayData[0]!;
    const metrics: (keyof ProductionDataPoint)[] = [
      'oilRate', 'waterRate', 'gasRate', 'casingPressure', 'tubingPressure', 'runtimeHours'
    ];
    const spikeMetric = metrics[Math.floor(random() * metrics.length)]!;
    if (spikeMetric !== 'date') {
      const spikeDir = random() > 0.5 ? 1.25 : 0.75;
      (yesterday as any)[spikeMetric] *= spikeDir;
      if (spikeMetric === 'runtimeHours') {
        yesterday.runtimeHours = Math.min(24, yesterday.runtimeHours);
      }
    }

    // Compute 7-day averages from days 1-7 (not yesterday)
    const last7Days = thirtyDayData.slice(1, 8);
    const avg = (key: keyof Omit<ProductionDataPoint, 'date'>) => 
      last7Days.reduce((sum, day) => sum + (day[key] as number), 0) / last7Days.length;

    const sevenDayAvg = {
      oilRate: avg('oilRate'),
      waterRate: avg('waterRate'),
      gasRate: avg('gasRate'),
      casingPressure: avg('casingPressure'),
      tubingPressure: avg('tubingPressure'),
      runtimeHours: avg('runtimeHours'),
    };

    // Compute deviations: |yesterday - avg| / avg > 0.20
    const isDeviated = (key: keyof typeof sevenDayAvg) => {
      const yesterdayVal = yesterday[key] as number;
      const avgVal = sevenDayAvg[key];
      return Math.abs(yesterdayVal - avgVal) / avgVal > 0.20;
    };

    const deviations = {
      oilRate: isDeviated('oilRate'),
      waterRate: isDeviated('waterRate'),
      gasRate: isDeviated('gasRate'),
      casingPressure: isDeviated('casingPressure'),
      tubingPressure: isDeviated('tubingPressure'),
      runtimeHours: isDeviated('runtimeHours'),
    };

    return {
      wellId,
      yesterday,
      sevenDayAvg,
      thirtyDayData,
      deviations,
    };
  }
}
