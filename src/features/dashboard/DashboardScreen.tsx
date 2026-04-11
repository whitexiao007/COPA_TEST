import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart3, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  Search,
  ChevronRight,
  ShieldAlert,
  Users
} from 'lucide-react';
import { db, Well, Inspection, InspectionItem } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import { getRecurringIssueIds } from '../history/recurringIssues';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DashboardScreen() {
  const { tenantId, currentUser } = useAppStore();
  const [overdueThreshold, setOverdueThreshold] = useState(7);

  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  const wells = useLiveQuery(() => db.wells.where('tenantId').equals(tenantId).toArray());
  const inspections = useLiveQuery(() => db.inspections.where('tenantId').equals(tenantId).toArray());

  // Section 1: Inspection Activity
  const activityStats = useMemo(() => {
    if (!inspections) return { thisWeek: 0, thisMonth: 0, total: 0, byInspector: {} as Record<string, { week: number; month: number }> };
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      thisWeek: 0,
      thisMonth: 0,
      total: inspections.length,
      byInspector: {} as Record<string, { week: number; month: number }>
    };

    inspections.forEach(ins => {
      const date = new Date(ins.startedAt);
      const inspector = ins.inspectorName;
      
      if (!stats.byInspector[inspector]) {
        stats.byInspector[inspector] = { week: 0, month: 0 };
      }

      if (date >= startOfWeek) {
        stats.thisWeek++;
        stats.byInspector[inspector]!.week++;
      }
      if (date >= startOfMonth) {
        stats.thisMonth++;
        stats.byInspector[inspector]!.month++;
      }
    });

    return stats;
  }, [inspections]);

  // Section 2: Overdue Wells
  const overdueWells = useMemo(() => {
    if (!wells) return [];
    const now = new Date();
    const thresholdMs = overdueThreshold * 24 * 60 * 60 * 1000;

    return wells
      .filter(well => {
        if (!well.lastInspectionDate) return true;
        const lastDate = new Date(well.lastInspectionDate);
        return (now.getTime() - lastDate.getTime()) > thresholdMs;
      })
      .map(well => {
        const lastDate = well.lastInspectionDate ? new Date(well.lastInspectionDate) : null;
        const daysOverdue = lastDate 
          ? Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
          : Infinity;
        return { ...well, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [wells, overdueThreshold]);

  // Section 3: Recurring Issues Summary
  const recurringIssuesSummary = useLiveQuery(async () => {
    if (!wells || !tenantId) return [];
    
    const wellIssues: Record<string, { affectedWells: Set<string>; label: string }> = {};

    for (const well of wells) {
      if (!well.id) continue;
      
      // Get last 5 inspections for this well
      const wellInspections = await db.inspections
        .where('wellId')
        .equals(well.id)
        .filter(i => i.tenantId === tenantId)
        .reverse()
        .limit(5)
        .toArray();
      
      if (wellInspections.length < 3) continue;

      const itemsByInspection: InspectionItem[][] = [];
      for (const ins of wellInspections) {
        if (!ins.id) continue;
        const items = await db.inspectionItems.where('inspectionId').equals(ins.id).toArray();
        itemsByInspection.push(items);
      }

      const recurringIds = getRecurringIssueIds(itemsByInspection, 3);
      
      for (const itemId of recurringIds) {
        if (!wellIssues[itemId]) {
          wellIssues[itemId] = { affectedWells: new Set(), label: itemId };
        }
        wellIssues[itemId]!.affectedWells.add(well.name);
      }
    }

    // Attempt to enrich labels from templates
    const templates = await db.templates.where('tenantId').equals(tenantId).toArray();
    for (const itemId in wellIssues) {
      for (const t of templates) {
        for (const cat of t.categories) {
          const item = cat.items.find(i => i.id === itemId);
          if (item) {
            wellIssues[itemId]!.label = item.label;
            break;
          }
        }
      }
    }

    return Object.entries(wellIssues)
      .map(([id, data]) => ({ 
        id, 
        label: data.label, 
        count: data.affectedWells.size, 
        wells: Array.from(data.affectedWells).slice(0, 3) 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [wells, tenantId]);

  // Section 4: Compliance
  const compliance = useMemo(() => {
    if (!wells) return { percent: 0, byPad: {} as Record<string, { total: number; onTime: number }> };
    
    const now = new Date();
    const thresholdMs = overdueThreshold * 24 * 60 * 60 * 1000;
    
    let onTimeCount = 0;
    const byPad: Record<string, { total: number; onTime: number }> = {};

    wells.forEach(well => {
      if (!byPad[well.padName]) {
        byPad[well.padName] = { total: 0, onTime: 0 };
      }
      byPad[well.padName]!.total++;

      const isOverdue = !well.lastInspectionDate || (now.getTime() - new Date(well.lastInspectionDate).getTime()) > thresholdMs;
      if (!isOverdue) {
        onTimeCount++;
        byPad[well.padName]!.onTime++;
      }
    });

    return {
      percent: Math.round((onTimeCount / wells.length) * 100) || 0,
      byPad
    };
  }, [wells, overdueThreshold]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-slate-500 mt-2">Only supervisors and administrators can access the dashboard.</p>
        <Button className="mt-6" onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-slate-900 text-white py-8 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Supervisor Dashboard</h1>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">Field Operations Overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300 font-medium">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Section 4: Compliance (Top) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider">Overall Compliance</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex flex-col items-center">
              <div className="w-full space-y-4 py-4">
                <div className="flex items-end justify-between">
                  <span className="text-5xl font-black text-slate-900">{compliance.percent}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-2">On Schedule</span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${
                      compliance.percent > 80 ? 'bg-green-500' : compliance.percent > 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${compliance.percent}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Threshold: {overdueThreshold} days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider">Compliance by Pad</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-y border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Pad Name</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Wells</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 text-center">In Compliance</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(compliance.byPad).map(([pad, stats]) => (
                      <tr key={pad} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{pad}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{stats.total}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 text-center">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono">{stats.onTime}/{stats.total}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-black ${stats.onTime / stats.total > 0.8 ? 'text-green-600' : 'text-amber-600'}`}>
                            {Math.round((stats.onTime / stats.total) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Inspection Activity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">Activity: This Week</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{activityStats.thisWeek}</div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Inspections completed</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">Activity: This Month</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{activityStats.thisMonth}</div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Inspections completed</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">Activity: Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{activityStats.total}</div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Life-to-date inspections</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity by Inspector Table */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base font-bold text-slate-800">Inspection Volume by Inspector</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Inspector</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 text-center">This Week</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 text-center">This Month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(activityStats.byInspector).map(([name, stats]) => (
                      <tr key={name} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-center font-mono">{stats.week}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-center font-mono">{stats.month}</td>
                      </tr>
                    ))}
                    {Object.keys(activityStats.byInspector).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-400 italic">No activity recorded for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Overdue Wells */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base font-bold text-slate-800">Attention Required</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="threshold" className="text-[10px] font-bold uppercase text-slate-400">Threshold</Label>
                <Input 
                  id="threshold" 
                  type="number" 
                  className="w-16 h-8 text-xs font-bold" 
                  value={overdueThreshold}
                  onChange={(e) => setOverdueThreshold(parseInt(e.target.value) || 0)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {overdueWells.map(well => (
                    <div key={well.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 text-sm">{well.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{well.padName} • {well.field}</div>
                        <div className="text-xs text-slate-400">
                          Last Inspection: <span className="font-medium text-slate-600">{well.lastInspectionDate || 'Never'}</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="font-mono bg-red-50 text-red-600 border-red-100">
                        {well.daysOverdue === Infinity ? 'NEW' : `+${well.daysOverdue}d`}
                      </Badge>
                    </div>
                  ))}
                  {overdueWells.length === 0 && (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-20" />
                      <p className="text-sm text-slate-400 font-medium">All wells are currently in compliance.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Recurring Issues Summary */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <CardTitle className="text-base font-bold text-slate-800">Most Common Recurring Issues</CardTitle>
            </div>
            <CardDescription>Top failure items across all wells (last 5 inspections per well)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 w-16">Rank</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Issue Item</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 text-center">Wells Affected</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Examples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recurringIssuesSummary?.map((issue, index) => (
                    <tr key={issue.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">{issue.label}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className="bg-red-50 text-red-600 border-red-100 font-bold">{issue.count} wells</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {issue.wells.map(well => (
                            <Badge key={well} variant="outline" className="text-[10px] font-medium text-slate-500 border-slate-200">
                              {well}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!recurringIssuesSummary || recurringIssuesSummary.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400 italic">No significant recurring issues detected.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
