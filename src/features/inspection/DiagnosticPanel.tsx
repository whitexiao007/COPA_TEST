import { Wrench, Lightbulb } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApplicableRules, evaluateRecommendations } from './diagnostics';

interface DiagnosticPanelProps {
  wellType: 'esp' | 'rod_pump';
  templateItemId: string;
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}

export function DiagnosticPanel({ wellType, templateItemId, data, onChange }: DiagnosticPanelProps) {
  const rule = getApplicableRules(wellType, templateItemId);

  if (!rule) return null;

  const handleInputChange = (subItemId: string, value: string) => {
    onChange({ ...data, [subItemId]: value });
  };

  const recommendations = evaluateRecommendations(rule, data);

  return (
    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-amber-100 p-1 rounded-md">
          <Wrench className="w-3.5 h-3.5 text-amber-700" />
        </div>
        <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">Diagnostic Questions</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rule.subItems.map((sub) => (
          <div key={sub.id} className="space-y-1.5">
            <Label className="text-[11px] font-bold text-amber-900/70 uppercase tracking-wider ml-0.5">
              {sub.label} {sub.unit && <span className="lowercase font-normal">({sub.unit})</span>}
            </Label>
            
            {sub.inputType === 'select' ? (
              <Select 
                value={data[sub.id] || ''} 
                onValueChange={(v) => handleInputChange(sub.id, v || '')}
              >
                <SelectTrigger className="bg-white border-amber-200 h-9 text-sm focus:ring-amber-500/20">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {sub.options?.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={sub.inputType === 'number' ? 'number' : 'text'}
                value={data[sub.id] || ''}
                onChange={(e) => handleInputChange(sub.id, e.target.value)}
                className="bg-white border-amber-200 h-9 text-sm focus:ring-amber-500/20"
                placeholder={`Enter ${sub.label.toLowerCase()}...`}
              />
            )}
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-2 space-y-2">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white/60 p-3 rounded-lg border border-amber-200/50 flex gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-900 leading-relaxed">
                <span className="font-bold">Recommendation:</span> {rec}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
