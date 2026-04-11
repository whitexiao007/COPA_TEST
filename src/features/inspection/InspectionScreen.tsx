import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Check, X as XIcon, Minus, AlertCircle, Save, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { db, type Well, type Template, type Inspection, type InspectionItem } from '@/src/db/schema';
import { useAppStore } from '@/src/stores/appStore';
import { WellTypeBadge } from '@/src/features/wells/WellTypeBadge';
import { usePhotoCapture } from '@/src/hooks/usePhotoCapture';
import { PhotoThumbnails } from './PhotoThumbnails';
import { getRecurringIssueIds } from '../history/recurringIssues';
import { DiagnosticPanel } from './DiagnosticPanel';
import { getApplicableRules } from './diagnostics';
import { WellStatusCard } from '@/src/features/inspection/WellStatusCard';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type ItemStatus = 'pass' | 'fail' | 'na' | 'pending';

interface ItemState {
  status: ItemStatus;
  notes: string;
  conditionalData: Record<string, string>;
  tempId: number; // For photo association before saving
}

export default function InspectionScreen() {
  const { wellId } = useParams({ from: '/inspect/$wellId' });
  const navigate = useNavigate();
  const tenantId = useAppStore((state) => state.tenantId);
  const currentUser = useAppStore((state) => state.currentUser);
  const { capturePhoto } = usePhotoCapture();

  const well = useLiveQuery(() => db.wells.get(Number(wellId)), [wellId]);
  
  const template = useLiveQuery(
    () => {
      if (!well) return undefined;
      return db.templates
        .where('tenantId').equals(tenantId)
        .and(t => t.wellType === well.wellType)
        .first();
    },
    [well, tenantId]
  );

  const lastInspections = useLiveQuery(
    async () => {
      if (!wellId) return [];
      return db.inspections
        .where('wellId')
        .equals(Number(wellId))
        .reverse()
        .limit(5)
        .toArray();
    },
    [wellId]
  );

  const lastItemsByInspection = useLiveQuery(
    async () => {
      if (!lastInspections) return [];
      const result: InspectionItem[][] = [];
      for (const ins of lastInspections) {
        if (ins.id) {
          const items = await db.inspectionItems
            .where('inspectionId')
            .equals(ins.id)
            .toArray();
          result.push(items);
        }
      }
      return result;
    },
    [lastInspections]
  );

  const recurringIssueIds = useMemo(() => {
    if (!lastItemsByInspection) return new Set<string>();
    return getRecurringIssueIds(lastItemsByInspection, 3);
  }, [lastItemsByInspection]);

  const [itemsState, setItemsState] = useState<Record<string, ItemState>>({});

  // Initialize state when template is loaded
  useEffect(() => {
    if (template && Object.keys(itemsState).length === 0) {
      const initialState: Record<string, ItemState> = {};
      let tempCounter = Date.now();
      template.categories.forEach(cat => {
        cat.items.forEach(item => {
          initialState[item.id] = {
            status: 'pending',
            notes: '',
            conditionalData: {},
            tempId: tempCounter++,
          };
        });
      });
      setItemsState(initialState);
    }
  }, [template]);

  const progress = useMemo(() => {
    const total = template?.categories.reduce((acc, c) => acc + c.items.length, 0) || 0;
    if (total === 0) return 0;
    const completed = Object.values(itemsState).filter(s => s.status !== 'pending').length;
    return Math.round((completed / total) * 100);
  }, [itemsState, template]);

  const handleStatusChange = (itemId: string, status: ItemStatus) => {
    setItemsState(prev => ({
      ...prev,
      [itemId]: { 
        ...prev[itemId]!, 
        status: prev[itemId]?.status === status ? 'pending' : status 
      }
    }));
  };

  const handleNoteChange = (itemId: string, notes: string) => {
    setItemsState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId]!, notes }
    }));
  };

  const handleConditionalChange = (itemId: string, subItemId: string, value: string) => {
    setItemsState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId]!,
        conditionalData: { ...prev[itemId]!.conditionalData, [subItemId]: value }
      }
    }));
  };

  const handleDiagnosticChange = (itemId: string, data: Record<string, string>) => {
    setItemsState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId]!,
        conditionalData: data
      }
    }));
  };

  const handleComplete = async () => {
    if (!well || !template) return;

    const inspection: Inspection = {
      tenantId,
      wellId: well.id!,
      templateId: template.id!,
      inspectorName: currentUser?.name || 'Unknown',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      synced: false,
    };

    const inspectionId = await db.inspections.add(inspection);

    // Save items
    const inspectionItems: InspectionItem[] = Object.entries(itemsState).map(([templateItemId, state]) => ({
      tenantId,
      inspectionId,
      templateItemId,
      status: state.status,
      notes: state.notes,
      conditionalData: state.conditionalData,
    }));

    await db.transaction('rw', [db.inspectionItems, db.photos, db.wells], async () => {
      for (const item of inspectionItems) {
        const itemId = await db.inspectionItems.add(item);
        
        // Re-associate photos from tempId to real itemId
        const state = itemsState[item.templateItemId]!;
        await db.photos
          .where('inspectionItemId')
          .equals(state.tempId)
          .modify({ inspectionItemId: itemId });
      }

      // Update well last inspection date
      await db.wells.update(well.id!, {
        lastInspectionDate: new Date().toISOString()
      });
    });

    navigate({ to: `/history/${well.id}` });
  };

  if (!well || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-900 font-bold">Loading inspection...</h3>
          <p className="text-slate-500 text-sm">Please wait while we prepare the template.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      <header className="bg-slate-900 text-white py-6 px-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-slate-800"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight truncate">{well.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <WellTypeBadge wellType={well.wellType} />
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">API: {well.apiNumber}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Tracker */}
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inspection Progress</span>
            <span className="text-sm font-mono font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <WellStatusCard wellId={well.id!} />

        <Accordion defaultValue={[template.categories[0]?.id || '']} multiple className="space-y-4">
          {template.categories.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border-none">
              <Card className="border-none shadow-sm overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 transition-colors border-b border-slate-50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="bg-blue-50 p-1.5 rounded-lg">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{category.name}</span>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                        {category.items.length} Points to verify
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-4">
                  <div className="space-y-8">
                    {category.items.map((item) => {
                      const state = itemsState[item.id];
                      if (!state) return null;

                      return (
                        <div key={item.id} className="space-y-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                              <Label className={`text-sm leading-snug font-semibold flex-1 ${state.status !== 'pending' ? 'text-slate-900' : 'text-slate-700'}`}>
                                {item.label}
                                {item.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {recurringIssueIds.has(item.id) && (
                                <Badge variant="destructive" className="text-[9px] uppercase tracking-tighter px-1.5 h-4 flex items-center gap-0.5 shrink-0">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Recurring
                                </Badge>
                              )}
                            </div>

                            {/* History Dots */}
                            {lastItemsByInspection && lastItemsByInspection.length > 0 && (
                              <div className="flex gap-1 mb-1">
                                {lastItemsByInspection.map((items, idx) => {
                                  const histItem = items.find(i => i.templateItemId === item.id);
                                  const status = histItem?.status || 'pending';
                                  const color = status === 'pass' ? 'bg-green-500' : status === 'fail' ? 'bg-red-500' : 'bg-slate-300';
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`w-1.5 h-1.5 rounded-full ${color}`} 
                                      title={status}
                                    />
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={state.status === 'pass' ? 'default' : 'outline'}
                                className={`flex-1 gap-1.5 rounded-full ${state.status === 'pass' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : 'text-slate-500 border-slate-200'}`}
                                onClick={() => handleStatusChange(item.id, 'pass')}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Pass
                              </Button>
                              <Button
                                size="sm"
                                variant={state.status === 'fail' ? 'default' : 'outline'}
                                className={`flex-1 gap-1.5 rounded-full ${state.status === 'fail' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'text-slate-500 border-slate-200'}`}
                                onClick={() => handleStatusChange(item.id, 'fail')}
                              >
                                <XIcon className="w-3.5 h-3.5" />
                                Fail
                              </Button>
                              <Button
                                size="sm"
                                variant={state.status === 'na' ? 'default' : 'outline'}
                                className={`flex-1 gap-1.5 rounded-full ${state.status === 'na' ? 'bg-slate-600 hover:bg-slate-700 text-white border-slate-600' : 'text-slate-500 border-slate-200'}`}
                                onClick={() => handleStatusChange(item.id, 'na')}
                              >
                                <Minus className="w-3.5 h-3.5" />
                                N/A
                              </Button>
                            </div>
                          </div>

                          <AnimatePresence>
                            {(state.status === 'pass' || state.status === 'fail') && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 overflow-hidden pt-1"
                              >
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Observations & Notes</Label>
                                  <Textarea
                                    placeholder="Enter details about findings..."
                                    className="text-xs bg-slate-50 border-slate-200 min-h-[80px] rounded-xl focus:ring-blue-500/20"
                                    value={state.notes}
                                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Photo Evidence</Label>
                                  <PhotoThumbnails 
                                    inspectionItemId={state.tempId} 
                                    onCapture={() => capturePhoto(state.tempId)} 
                                  />
                                </div>

                                {state.status === 'fail' && (well.wellType === 'esp' || well.wellType === 'rod_pump') && getApplicableRules(well.wellType, item.id) && (
                                  <DiagnosticPanel 
                                    wellType={well.wellType} 
                                    templateItemId={item.id} 
                                    data={state.conditionalData} 
                                    onChange={(data) => handleDiagnosticChange(item.id, data)}
                                  />
                                )}

                                {item.hasConditional && state.status === 'fail' && item.conditional && !getApplicableRules(well.wellType, item.id) && (
                                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
                                    <p className="text-xs font-bold text-red-800 uppercase tracking-tight">Conditional Requirements</p>
                                    {item.conditional.subItems.map(sub => (
                                      <div key={sub.id} className="space-y-2">
                                        <Label className="text-xs font-medium text-slate-700">{sub.label}</Label>
                                        {sub.inputType === 'text' && (
                                          <Input 
                                            className="bg-white" 
                                            value={state.conditionalData[sub.id] || ''} 
                                            onChange={(e) => handleConditionalChange(item.id, sub.id, e.target.value)}
                                          />
                                        )}
                                        {sub.inputType === 'number' && (
                                          <Input 
                                            type="number" 
                                            className="bg-white" 
                                            value={state.conditionalData[sub.id] || ''} 
                                            onChange={(e) => handleConditionalChange(item.id, sub.id, e.target.value)}
                                          />
                                        )}
                                        {sub.inputType === 'select' && (
                                          <Select 
                                            value={state.conditionalData[sub.id] || ''} 
                                            onValueChange={(v) => handleConditionalChange(item.id, sub.id, v || '')}
                                          >
                                            <SelectTrigger className="bg-white">
                                              <SelectValue placeholder="Select option" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {sub.options?.map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <Separator className="mt-6 opacity-50" />
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="pt-8">
          <Button 
            className="w-full py-7 text-lg font-bold bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 rounded-2xl group transition-all"
            onClick={handleComplete}
            disabled={progress < 100}
          >
            <Save className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform text-blue-400" />
            Complete Inspection
          </Button>
          {progress < 100 && (
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              Complete all items to submit report
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
