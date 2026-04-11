import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ChevronLeft, 
  Search, 
  MapPin, 
  ChevronRight, 
  X,
  Info
} from 'lucide-react';

import { db, type Well } from '@/src/db/schema';
import { useAppStore } from '@/src/stores/appStore';
import { WellTypeBadge } from './WellTypeBadge';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type WellTypeFilter = 'All' | Well['wellType'];

export default function WellMasterScreen() {
  const tenantId = useAppStore((state) => state.tenantId);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WellTypeFilter>('All');
  const [selectedWell, setSelectedWell] = useState<Well | null>(null);

  const wells = useLiveQuery(
    () => db.wells.where('tenantId').equals(tenantId).toArray(),
    [tenantId]
  ) ?? [];

  const filteredWells = useMemo(() => {
    return wells.filter((well) => {
      const matchesSearch = 
        well.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        well.apiNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        well.padName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'All' || well.wellType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [wells, searchQuery, typeFilter]);

  const groupedWells = useMemo(() => {
    const groups: Record<string, Well[]> = {};
    
    filteredWells.forEach((well) => {
      if (!groups[well.padName]) {
        groups[well.padName] = [];
      }
      groups[well.padName]?.push(well);
    });

    // Sort wells within each group
    Object.keys(groups).forEach((padName) => {
      groups[padName]?.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Return sorted pad names
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((padName) => ({
        padName,
        wells: groups[padName] ?? [],
      }));
  }, [filteredWells]);

  const wellTypes: { label: string; value: WellTypeFilter }[] = [
    { label: 'All', value: 'All' },
    { label: 'Rod Pump', value: 'rod_pump' },
    { label: 'ESP', value: 'esp' },
    { label: 'Gas Lift', value: 'gas_lift' },
    { label: 'SWD', value: 'swd' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
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
            <h1 className="text-xl font-bold tracking-tight">Well Master</h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">
              {wells.length} Wells Total • {filteredWells.length} Filtered
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by name, API, or pad..." 
              className="pl-10 bg-white border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {wellTypes.map((type) => (
              <Button
                key={type.value}
                variant={typeFilter === type.value ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full whitespace-nowrap ${
                  typeFilter === type.value ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'
                }`}
                onClick={() => setTypeFilter(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Wells List */}
        {groupedWells.length > 0 ? (
          <Accordion defaultValue={groupedWells.map(g => g.padName)} className="space-y-4">
            {groupedWells.map((group) => (
              <AccordionItem key={group.padName} value={group.padName} className="border-none">
                <Card className="border-none shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg">
                        <MapPin className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-slate-800 uppercase tracking-tight text-sm">{group.padName}</span>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {group.wells.length} WELL{group.wells.length !== 1 ? 'S' : ''}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-1">
                    <div className="space-y-3">
                      {group.wells.map((well) => (
                        <div 
                          key={well.id} 
                          className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group"
                          onClick={() => setSelectedWell(well)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {well.name}
                              </h3>
                              <p className="text-[10px] text-slate-500 font-mono">API: {well.apiNumber}</p>
                            </div>
                            <WellTypeBadge wellType={well.wellType} />
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                            <div className="text-[10px] text-slate-500">
                              <span className="uppercase font-bold tracking-widest mr-1 text-slate-400">Field:</span>
                              {well.field}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span className="uppercase font-bold tracking-widest text-slate-400">Last:</span>
                              {well.lastInspectionDate ? new Date(well.lastInspectionDate).toLocaleDateString() : 'Never inspected'}
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-20">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">No wells found</h3>
            <p className="text-slate-500 text-sm">No wells match your search or filters.</p>
            <Button 
              variant="link" 
              className="mt-2 text-blue-600 font-bold"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('All');
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </main>

      {/* Well Details Dialog */}
      <Dialog open={!!selectedWell} onOpenChange={(open) => !open && setSelectedWell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <Info className="w-5 h-5" />
              </div>
              Well Details
            </DialogTitle>
          </DialogHeader>

          {selectedWell && (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Well Name</p>
                <p className="text-lg font-bold text-slate-900">{selectedWell.name}</p>
                <WellTypeBadge wellType={selectedWell.wellType} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">API Number</p>
                  <p className="font-semibold text-slate-800">{selectedWell.apiNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Pad Name</p>
                  <p className="font-semibold text-slate-800">{selectedWell.padName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Field</p>
                  <p className="font-semibold text-slate-800">{selectedWell.field}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Last Inspected</p>
                  <p className="font-semibold text-slate-800">
                    {selectedWell.lastInspectionDate ? new Date(selectedWell.lastInspectionDate).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Location Coordinates</p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between font-mono text-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">LATITUDE</span>
                    <span className="text-slate-700">{selectedWell.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400">LONGITUDE</span>
                    <span className="text-slate-700">{selectedWell.lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full bg-slate-900 font-bold" 
                  onClick={() => setSelectedWell(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
