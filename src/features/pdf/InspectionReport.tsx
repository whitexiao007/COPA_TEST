import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Well, Inspection, InspectionItem, Template } from '@/src/db/schema';
import type { WellProductionSummary } from '@/src/data/scada';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  logoPlaceholder: {
    width: 60,
    height: 30,
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    padding: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    marginBottom: 6,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemLabel: {
    fontWeight: 'bold',
    width: '70%',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  statusPass: { backgroundColor: '#22c55e' },
  statusFail: { backgroundColor: '#ef4444' },
  statusNA: { backgroundColor: '#94a3b8' },
  recurringBadge: {
    color: '#ef4444',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  notes: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 2,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
  },
  photo: {
    width: 100,
    height: 75,
    borderRadius: 4,
    objectFit: 'cover',
  },
  diagnosticGrid: {
    marginTop: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  diagnosticItem: {
    width: '33%',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  }
});

interface InspectionReportProps {
  well: Well;
  inspection: Inspection;
  items: InspectionItem[];
  template: Template;
  photos: Map<number, string[]>; // inspectionItemId → array of base64 data URLs
  scadaSummary: WellProductionSummary | null;
  recurringIssueIds: Set<string>;
}

export const InspectionReport = ({
  well,
  inspection,
  items,
  template,
  photos,
  scadaSummary,
  recurringIssueIds
}: InspectionReportProps) => {
  const categories = template.categories;
  
  const stats = {
    total: items.length,
    pass: items.filter(i => i.status === 'pass').length,
    fail: items.filter(i => i.status === 'fail').length,
    na: items.filter(i => i.status === 'na').length,
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>COPA Field Inspection Report</Text>
            <Text style={{ fontSize: 12, marginTop: 4 }}>{well.name} | API: {well.apiNumber}</Text>
          </View>
          <View style={styles.logoPlaceholder} />
        </View>

        {/* Well Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Well Information</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Well Type</Text>
              <Text style={styles.value}>{well.wellType.toUpperCase()}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Pad / Field</Text>
              <Text style={styles.value}>{well.padName} / {well.field}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Inspector</Text>
              <Text style={styles.value}>{inspection.inspectorName}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Date / Time</Text>
              <Text style={styles.value}>{new Date(inspection.completedAt || inspection.startedAt).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Production Snapshot */}
        {scadaSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production Snapshot (Yesterday)</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Oil Rate</Text>
                <Text style={styles.value}>{scadaSummary.yesterday.oilRate.toFixed(1)} bbl/d</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Water Rate</Text>
                <Text style={styles.value}>{scadaSummary.yesterday.waterRate.toFixed(1)} bbl/d</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Gas Rate</Text>
                <Text style={styles.value}>{scadaSummary.yesterday.gasRate.toFixed(1)} Mcf/d</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Casing Pressure</Text>
                <Text style={styles.value}>{scadaSummary.yesterday.casingPressure.toFixed(0)} psi</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Tubing Pressure</Text>
                <Text style={styles.value}>{scadaSummary.yesterday.tubingPressure.toFixed(0)} psi</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Runtime</Text>
                <Text style={styles.value}>{scadaSummary.yesterday.runtimeHours.toFixed(1)} hrs</Text>
              </View>
            </View>
          </View>
        )}

        {/* Checklist Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist Results</Text>
          {categories.map(cat => (
            <View key={cat.id} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 5, color: '#475569' }}>{cat.name}</Text>
              {cat.items.map(tItem => {
                const item = items.find(i => i.templateItemId === tItem.id);
                if (!item) return null;
                const itemPhotos = photos.get(item.id!) || [];

                return (
                  <View key={tItem.id} style={styles.itemRow} wrap={false}>
                    <View style={styles.itemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', width: '70%' }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.status === 'pass' ? '#22c55e' : item.status === 'fail' ? '#ef4444' : '#94a3b8', marginRight: 6 }} />
                        <Text style={styles.itemLabel}>{tItem.label}</Text>
                        {recurringIssueIds.has(tItem.id) && <Text style={styles.recurringBadge}>⚠ RECURRING</Text>}
                      </View>
                      <View style={[styles.statusBadge, item.status === 'pass' ? styles.statusPass : item.status === 'fail' ? styles.statusFail : styles.statusNA]}>
                        <Text>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    {item.notes && <Text style={styles.notes}>Notes: {item.notes}</Text>}

                    {item.conditionalData && Object.keys(item.conditionalData).length > 0 && (
                      <View style={styles.diagnosticGrid}>
                        {Object.entries(item.conditionalData).map(([k, v]) => (
                          <View key={k} style={styles.diagnosticItem}>
                            <Text style={styles.label}>{k}</Text>
                            <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {itemPhotos.length > 0 && (
                      <View style={styles.photoRow}>
                        {itemPhotos.slice(0, 3).map((uri, idx) => (
                          <Image key={idx} src={uri} style={styles.photo} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Total Items</Text>
              <Text style={styles.value}>{stats.total}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Passed</Text>
              <Text style={styles.value}>{stats.pass}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Failed</Text>
              <Text style={styles.value}>{stats.fail}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>N/A</Text>
              <Text style={styles.value}>{stats.na}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by COPA Field Inspection</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
