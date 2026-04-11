import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';

import { db, type InspectionItem } from '@/src/db/schema';
import { scadaRepository } from '@/src/data/scada';
import { getRecurringIssueIds } from '@/src/features/history/recurringIssues';
import { InspectionReport } from './InspectionReport';
import { Button } from '@/components/ui/button';

interface PDFReportButtonProps {
  inspectionId: number;
}

export function PDFReportButton({ inspectionId }: PDFReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generatePDF = async () => {
    setLoading(true);
    try {
      // 1. Load data from Dexie
      const inspection = await db.inspections.get(inspectionId);
      if (!inspection) throw new Error('Inspection not found');

      const well = await db.wells.get(inspection.wellId);
      if (!well) throw new Error('Well not found');

      const template = await db.templates.get(inspection.templateId);
      if (!template) throw new Error('Template not found');

      const items = await db.inspectionItems
        .where('inspectionId')
        .equals(inspectionId)
        .toArray();

      // 2. Load photos and convert to base64
      const photosMap = new Map<number, string[]>();
      for (const item of items) {
        if (item.id) {
          const itemPhotos = await db.photos
            .where('inspectionItemId')
            .equals(item.id)
            .toArray();
          
          if (itemPhotos.length > 0) {
            const base64Photos = await Promise.all(
              itemPhotos.map(p => blobToBase64(p.blob))
            );
            photosMap.set(item.id, base64Photos);
          }
        }
      }

      // 3. Load SCADA summary
      const scadaSummary = await scadaRepository.getProductionData(well.id!);

      // 4. Compute recurring issues (last 5 inspections)
      const last5Inspections = await db.inspections
        .where('wellId')
        .equals(well.id!)
        .reverse()
        .limit(5)
        .toArray();
      
      const inspectionItemsByIns: InspectionItem[][] = [];
      for (const ins of last5Inspections) {
        if (ins.id) {
          const insItems = await db.inspectionItems
            .where('inspectionId')
            .equals(ins.id)
            .toArray();
          inspectionItemsByIns.push(insItems);
        }
      }
      const recurringIssueIds = getRecurringIssueIds(inspectionItemsByIns, 3);

      // 5. Generate PDF
      const blob = await pdf(
        <InspectionReport
          well={well}
          inspection={inspection}
          items={items}
          template={template}
          photos={photosMap}
          scadaSummary={scadaSummary}
          recurringIssueIds={recurringIssueIds}
        />
      ).toBlob();

      // 6. Download or Share
      const fileName = `copa-inspection-${well.name.replace(/\s+/g, '-').toLowerCase()}-${new Date(inspection.completedAt || inspection.startedAt).toISOString().split('T')[0]}.pdf`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/pdf' })] })) {
        await navigator.share({
          files: [new File([blob], fileName, { type: 'application/pdf' })],
          title: `Inspection Report: ${well.name}`,
          text: `Field inspection report for ${well.name} (${well.apiNumber})`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-2 h-8 text-[11px] font-bold uppercase tracking-tight"
      onClick={generatePDF}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="w-3.5 h-3.5" />
          Download PDF
        </>
      )}
    </Button>
  );
}
