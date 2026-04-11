import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import { 
  ClipboardCheck, 
  MapPin, 
  User, 
  Clock, 
  ShieldCheck, 
  Settings, 
  Leaf, 
  BarChart3, 
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Database
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import { WELL_SITES, CHECKLIST_ITEMS } from './constants';
import { InspectionState } from './types';
import { ConnectivityIndicator } from '@/src/components/ConnectivityIndicator';

export default function App() {
  const navigate = useNavigate();
  const [state, setState] = useState<InspectionState>({
    wellSite: '',
    inspectorName: '',
    timestamp: new Date().toLocaleString(),
    checks: CHECKLIST_ITEMS.reduce((acc, item) => {
      acc[item.id] = { checked: false, notes: '' };
      return acc;
    }, {} as Record<string, { checked: boolean; notes: string }>)
  });

  const [showSummary, setShowSummary] = useState(false);

  const categories = ['Safety', 'Equipment', 'Environmental', 'Production'] as const;

  const handleCheckChange = (id: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      checks: {
        ...prev.checks,
        [id]: { checked, notes: prev.checks[id]?.notes ?? '' }
      }
    }));
  };

  const handleNoteChange = (id: string, notes: string) => {
    setState(prev => ({
      ...prev,
      checks: {
        ...prev.checks,
        [id]: { checked: prev.checks[id]?.checked ?? false, notes }
      }
    }));
  };

  const progress = useMemo(() => {
    const total = CHECKLIST_ITEMS.length;
    if (total === 0) return 0;
    const checksArray = Object.values(state.checks);
    const completed = checksArray.filter(c => c?.checked).length;
    return Math.round((completed / total) * 100);
  }, [state.checks]);

  const categoryIcons = {
    Safety: <ShieldCheck className="w-5 h-5 text-red-500" />,
    Equipment: <Settings className="w-5 h-5 text-blue-500" />,
    Environmental: <Leaf className="w-5 h-5 text-green-500" />,
    Production: <BarChart3 className="w-5 h-5 text-amber-500" />
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Dark Header */}
      <header className="bg-slate-900 text-white py-6 px-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Well Site Inspection</h1>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">Daily Operations Log</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="xs" 
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-7 px-2 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => navigate({ to: '/wells' })}
              >
                <Database className="w-3 h-3 mr-1" />
                Wells
              </Button>
              <div className="hidden sm:flex items-center gap-2 text-slate-300 text-sm">
                <Clock className="w-4 h-4" />
                <span>{state.timestamp}</span>
              </div>
            </div>
            <ConnectivityIndicator />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Site & Inspector Info */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Site Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="well-site" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Well Site</Label>
                <Select onValueChange={(val) => setState(prev => ({ ...prev, wellSite: typeof val === 'string' ? val : '' }))}>
                  <SelectTrigger id="well-site" className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select a well site" />
                  </SelectTrigger>
                  <SelectContent>
                    {WELL_SITES.map(site => (
                      <SelectItem key={site} value={site}>{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspector" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Inspector Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="inspector" 
                    placeholder="Enter name" 
                    className="pl-10 bg-slate-50 border-slate-200"
                    value={state.inspectorName}
                    onChange={(e) => setState(prev => ({ ...prev, inspectorName: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="sm:hidden flex items-center gap-2 text-slate-500 text-xs pt-2">
              <Clock className="w-3 h-3" />
              <span>{state.timestamp}</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracker */}
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Inspection Progress</span>
            <span className="text-sm font-mono font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Checklist Categories */}
        <Accordion defaultValue={['Safety']} className="space-y-4">
          {categories.map((category) => (
            <AccordionItem key={category} value={category} className="border-none">
              <Card className="border-none shadow-sm overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    {categoryIcons[category]}
                    <div>
                      <span className="font-bold text-slate-800">{category}</span>
                      <p className="text-xs text-slate-500 font-normal">
                        {CHECKLIST_ITEMS.filter(i => i.category === category).length} items to verify
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="space-y-6">
                    {CHECKLIST_ITEMS.filter(i => i.category === category).map((item) => {
                      const itemCheck = state.checks[item.id] ?? { checked: false, notes: '' };
                      return (
                        <div key={item.id} className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={item.id}
                              className="mt-1"
                              checked={itemCheck.checked}
                              onCheckedChange={(checked) => handleCheckChange(item.id, !!checked)}
                            />
                            <Label
                              htmlFor={item.id}
                              className={`text-sm leading-tight cursor-pointer transition-colors ${itemCheck.checked ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}
                            >
                              {item.label}
                            </Label>
                          </div>
                          <AnimatePresence>
                            {itemCheck.checked && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pl-7 overflow-hidden"
                              >
                                <Textarea
                                  placeholder="Add notes (optional)..."
                                  className="text-xs bg-slate-50 border-slate-200 min-h-[60px] resize-none"
                                  value={itemCheck.notes}
                                  onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Action Button */}
        <div className="pt-4">
          <Button 
            className="w-full py-6 text-lg font-bold bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 group"
            onClick={() => setShowSummary(true)}
            disabled={!state.wellSite || !state.inspectorName}
          >
            <FileText className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
            Generate Summary Report
          </Button>
          {(!state.wellSite || !state.inspectorName) && (
            <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Please select a site and enter inspector name to generate report
            </p>
          )}
        </div>
      </main>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              Inspection Summary
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Final report for {state.wellSite} conducted by {state.inspectorName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Well Site</p>
                <p className="font-semibold text-slate-800">{state.wellSite}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Inspector</p>
                <p className="font-semibold text-slate-800">{state.inspectorName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Date & Time</p>
                <p className="font-semibold text-slate-800">{state.timestamp}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              {categories.map(category => {
                const items = CHECKLIST_ITEMS.filter(i => i.category === category);
                const checkedItems = items.filter(i => state.checks[i.id]?.checked);

                if (checkedItems.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      {categoryIcons[category]}
                      {category}
                    </h3>
                    <div className="space-y-2 pl-7">
                      {checkedItems.map(item => {
                        const c = state.checks[item.id];
                        return (
                          <div key={item.id} className="text-sm border-l-2 border-slate-100 pl-3 py-1">
                            <p className="text-slate-700 font-medium">{item.label}</p>
                            {c?.notes && (
                              <p className="text-xs text-slate-500 italic mt-1">
                                " {c.notes} "
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {progress < 100 && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Incomplete Inspection</p>
                  <p className="text-xs text-amber-700">
                    {CHECKLIST_ITEMS.length - Object.values(state.checks).filter(c => c?.checked).length} items were not verified during this session.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between gap-4">
            <Button variant="outline" onClick={() => window.print()} className="flex-1">
              Print Report
            </Button>
            <Button onClick={() => setShowSummary(false)} className="flex-1 bg-slate-900">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Bar (Optional visual touch) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center sm:hidden z-20">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <Button 
          size="sm" 
          className="bg-slate-900 font-bold"
          onClick={() => setShowSummary(true)}
          disabled={!state.wellSite || !state.inspectorName}
        >
          View Summary
          <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
