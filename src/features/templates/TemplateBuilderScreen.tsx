import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Plus, Layout, Layers, ListTodo, Info } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { db, type Template } from '@/src/db/schema';
import { useAppStore } from '@/src/stores/appStore';
import { WellTypeBadge } from '@/src/features/wells/WellTypeBadge';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export default function TemplateBuilderScreen() {
  const navigate = useNavigate();
  const tenantId = useAppStore((state) => state.tenantId);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newWellType, setNewWellType] = useState<Template['wellType']>('rod_pump');

  const templates = useLiveQuery(
    () => db.templates.where('tenantId').equals(tenantId).toArray(),
    [tenantId]
  ) ?? [];

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    templates.forEach((t) => {
      if (!groups[t.wellType]) groups[t.wellType] = [];
      groups[t.wellType]?.push(t);
    });
    return groups;
  }, [templates]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName) return;

    const template: Template = {
      tenantId,
      name: newTemplateName,
      wellType: newWellType,
      version: 1,
      categories: [
        {
          id: crypto.randomUUID(),
          name: 'General',
          items: [
            {
              id: crypto.randomUUID(),
              label: 'Initial inspection item',
              required: true,
            },
          ],
        },
      ],
    };

    await db.templates.add(template);
    setIsCreateDialogOpen(false);
    setNewTemplateName('');
  };

  const wellTypes: { label: string; value: Template['wellType'] }[] = [
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
            onClick={() => navigate({ to: '/' })}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Templates</h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">
              {templates.length} Active Templates
            </p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 font-bold"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {Object.entries(groupedTemplates).map(([wellType, typeTemplates]) => (
          <div key={wellType} className="space-y-4">
            <div className="flex items-center gap-2">
              <WellTypeBadge wellType={wellType as Template['wellType']} />
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {typeTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:border-blue-300 transition-colors border-slate-200 shadow-sm"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-900">{template.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-slate-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {template.categories.length} Categories
                          </span>
                          <span className="flex items-center gap-1">
                            <ListTodo className="w-3 h-3" />
                            {template.categories.reduce((acc, c) => acc + c.items.length, 0)} Items
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase">
                        v{template.version}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">No templates yet</h3>
            <p className="text-slate-500 text-sm">Create your first inspection template to get started.</p>
            <Button 
              variant="link" 
              className="mt-2 text-blue-600 font-bold"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add a template
            </Button>
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input 
                id="templateName" 
                placeholder="e.g., Standard ESP Inspection" 
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wellType">Well Type</Label>
              <Select value={newWellType} onValueChange={(v) => setNewWellType(v as Template['wellType'])}>
                <SelectTrigger id="wellType">
                  <SelectValue placeholder="Select well type" />
                </SelectTrigger>
                <SelectContent>
                  {wellTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                This will create a new template for <strong>{wellTypes.find(w => w.value === newWellType)?.label}</strong> wells. 
                It will include a default category and item to get you started.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog (Read Only) */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <Info className="w-5 h-5" />
              </div>
              Template Details
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedTemplate.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <WellTypeBadge wellType={selectedTemplate.wellType as Template['wellType']} />
                  <span className="text-xs text-slate-400">Version {selectedTemplate.version}</span>
                </div>
              </div>
              
              <Separator />

              <div className="space-y-6">
                {selectedTemplate.categories.map((cat) => (
                  <div key={cat.id} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">{cat.name}</h4>
                    <div className="space-y-1">
                      {cat.items.map((item) => (
                        <div key={item.id} className="p-2 bg-slate-50 rounded border border-slate-100 text-sm text-slate-700">
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full bg-slate-900 font-bold" 
                  onClick={() => setSelectedTemplate(null)}
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
