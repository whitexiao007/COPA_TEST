import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, AlertCircle, CheckCircle2, XCircle, MinusCircle, History, TrendingUp, AlertTriangle } from 'lucide-react';

import { db, type InspectionItem } from '@/src/db/schema';
import { WellTypeBadge } from '@/src/features/wells/WellTypeBadge';
import { getRecurringIssueIds } from './recurringIssues';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function HistoryScreen() {
  const { wellId } = useParams({ from: '/history/$wellId' });
  const navigate = useNavigate();

  const well = useLiveQuery(() => db.wells.get(Number(wellId)), [wellId]);
  
  const inspections = useLiveQuery(
    async () => {
      return db.inspections
        .where('wellId')
        .equals(Number(wellId))
        .reverse()
        .limit(10)
        .toArray();
    },
    [wellId]
  );

  const inspectionItemsByInspection = useLiveQuery(
    async () => {
      if (!inspections) return {};
      const items: Record<number, InspectionItem[]> = {};
      for (const ins of inspections) {
        if (ins.id) {
          items[ins.id] = await db.inspectionItems
            .where('inspectionId')
            .equals(ins.id)
            .toArray();
        }
      }
      return items;
    },
    [inspections]
  );

  const template = useLiveQuery(
    async () => {
      if (!well) return undefined;
      return db.templates
        .where('wellType')
        .equals(well.wellType)
        .first();
    },
    [well]
  );

  if (!well || !inspections || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-900 font-bold">Loading history...</h3>
        </div>
      </div>
    );
  }

  const allTemplateItems = template.categories.flatMap(cat => cat.items);
  
  // Last 5 inspections for trend analysis
  const last5Inspections = inspections.slice(0, 5);
  const itemsForTrend = last5Inspections.map(ins => (inspectionItemsByInspection || {})[ins.id!] || []);
  const recurringIssueIds = getRecurringIssueIds(itemsForTrend, 3);

  // Helper to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-500 bg-green-500';
      case 'fail': return 'text-red-500 bg-red-500';
      default: return 'text-slate-300 bg-slate-300';
    }
  };

  const trendData = allTemplateItems.map(tItem => {
    const history = last5Inspections.map(ins => {
      const item = ((inspectionItemsByInspection || {})[ins.id!] || []).find(i => i.templateItemId === tItem.id);
      return item?.status || 'pending';
    });
    
    const lastFailureIndex = history.findIndex(s => s === 'fail');
    const isRecurring = recurringIssueIds.has(tItem.id);

    return {
      ...tItem,
      history,
      isRecurring,
      lastFailureIndex: lastFailureIndex === -1 ? Infinity : lastFailureIndex
    };
  }).sort((a, b) => {
    if (a.isRecurring && !b.isRecurring) return -1;
    if (!a.isRecurring && b.isRecurring) return 1;
    return a.lastFailureIndex - b.lastFailureIndex;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <header className="bg-slate-900 text-white py-6 px-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-slate-800"
            onClick={() => navigate({ to: '/' })}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight truncate">{well.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <WellTypeBadge wellType={well.wellType} />
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">History</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Trend Analysis Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Item Trend Analysis (Last 5)</h2>
          </div>
          
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {trendData.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 truncate">{item.label}</span>
                        {item.isRecurring && (
                          <Badge variant="destructive" className="text-[9px] uppercase tracking-tighter px-1.5 h-4 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Recurring
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {item.history.map((status, idx) => (
                        <div 
                          key={idx} 
                          className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`}
                          title={status}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* History List Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Last 10 Inspections</h2>
          </div>

          <Accordion className="space-y-3">
            {inspections.map((ins) => {
              const items = (inspectionItemsByInspection || {})[ins.id!] || [];
              const passed = items.filter(i => i.status === 'pass').length;
              const total = items.length;
              const progress = total > 0 ? Math.round((passed / total) * 100) : 0;

              return (
                <AccordionItem key={ins.id} value={String(ins.id)} className="border-none">
                  <Card className="border-none shadow-sm overflow-hidden">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col items-start text-left gap-1">
                        <span className="text-sm font-bold text-slate-800">
                          {formatDate(ins.startedAt)}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            By {ins.inspectorName}
                          </span>
                          <span className="flex items-center gap-1">
                            {progress}% Pass Rate
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2 border-t border-slate-50">
                      <div className="space-y-4">
                        {items.map((item) => {
                          const label = allTemplateItems.find(t => t.id === item.templateItemId)?.label || 'Unknown Item';
                          return (
                            <div key={item.id} className="flex gap-3">
                              <div className="mt-0.5">
                                {item.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {item.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                                {item.status === 'na' && <MinusCircle className="w-4 h-4 text-slate-300" />}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-700">{label}</p>
                                {item.notes && (
                                  <p className="text-xs text-slate-500 italic">"{item.notes}"</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      </main>
    </div>
  );
}
