import { useEffect, useState } from 'react';
import { 
  Droplets, 
  Waves, 
  Wind, 
  Gauge, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';

import { scadaRepository, type WellProductionSummary } from '@/src/data/scada';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface WellStatusCardProps {
  wellId: number;
}

export function WellStatusCard({ wellId }: WellStatusCardProps) {
  const [data, setData] = useState<WellProductionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    scadaRepository.getProductionData(wellId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch SCADA data:', err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [wellId]);

  if (loading) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[60px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const metrics = [
    { 
      label: 'Oil Rate', 
      value: data.yesterday.oilRate, 
      unit: 'bbl/d', 
      icon: Droplets, 
      dev: data.deviations.oilRate,
      avg: data.sevenDayAvg.oilRate,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    { 
      label: 'Water Rate', 
      value: data.yesterday.waterRate, 
      unit: 'bbl/d', 
      icon: Waves, 
      dev: data.deviations.waterRate,
      avg: data.sevenDayAvg.waterRate,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Gas Rate', 
      value: data.yesterday.gasRate, 
      unit: 'Mcf/d', 
      icon: Wind, 
      dev: data.deviations.gasRate,
      avg: data.sevenDayAvg.gasRate,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50'
    },
    { 
      label: 'Casing PSI', 
      value: data.yesterday.casingPressure, 
      unit: 'psi', 
      icon: Gauge, 
      dev: data.deviations.casingPressure,
      avg: data.sevenDayAvg.casingPressure,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'Tubing PSI', 
      value: data.yesterday.tubingPressure, 
      unit: 'psi', 
      icon: Gauge, 
      dev: data.deviations.tubingPressure,
      avg: data.sevenDayAvg.tubingPressure,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    { 
      label: 'Runtime', 
      value: data.yesterday.runtimeHours, 
      unit: 'hrs', 
      icon: Clock, 
      dev: data.deviations.runtimeHours,
      avg: data.sevenDayAvg.runtimeHours,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
  ];

  // Recharts needs data in reverse chronological for a trend (left to right)
  const sparklineData = [...data.thirtyDayData].slice(0, 7).reverse();

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            Well Status — Yesterday
          </CardTitle>
          <span className="text-[10px] font-mono text-slate-400">{data.yesterday.date}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map((m) => {
            const diff = m.value - m.avg;
            const pct = Math.round((diff / m.avg) * 100);
            const isUp = pct > 0;
            
            return (
              <div 
                key={m.label} 
                className={`p-3 rounded-xl border border-transparent transition-all ${m.dev ? 'bg-amber-50 border-amber-100' : 'bg-slate-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <m.icon className={`w-3.5 h-3.5 ${m.dev ? 'text-amber-600' : 'text-slate-400'}`} />
                  {m.dev && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-amber-100 border-amber-200 text-amber-700 font-bold">
                      {isUp ? '↑' : '↓'} {Math.abs(pct)}%
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-none">
                    {m.value.toFixed(1)} <span className="text-[9px] font-normal text-slate-500">{m.unit}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium uppercase mt-1 tracking-tighter">{m.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">7-Day Oil Trend</span>
            <span className="text-[10px] font-mono text-slate-400">
              {sparklineData[0]!.oilRate.toFixed(0)} → {sparklineData[sparklineData.length - 1]!.oilRate.toFixed(0)} bbl/d
            </span>
          </div>
          <div className="h-[60px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="oilRate" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
