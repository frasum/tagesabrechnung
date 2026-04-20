import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CHECKLIST_CATEGORIES, EDGE_FUNCTIONS_CATEGORY } from '@/data/checklistFeatures';
import type { ChecklistPriorityRow, ChecklistEdgeFunction } from '@/hooks/useChecklist';

const PRIORITY_LABEL: Record<string, string> = {
  green: 'Kritisch',
  yellow: 'Wichtig',
  red: 'Unwichtig',
};

const PRIORITY_COLOR: Record<string, [number, number, number]> = {
  green: [34, 197, 94],
  yellow: [234, 179, 8],
  red: [239, 68, 68],
};

function findRow(
  rows: ChecklistPriorityRow[],
  category: string,
  key: string
): ChecklistPriorityRow | undefined {
  return rows.find((r) => r.category === category && r.feature_key === key);
}

export function exportChecklistPdf(
  priorities: ChecklistPriorityRow[],
  edgeFunctions: ChecklistEdgeFunction[],
  globalNotes: string
) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString('de-DE');

  doc.setFontSize(18);
  doc.text('Entwickler-Checkliste – Tagesabrechnung', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Stand: ${now}`, 14, 25);
  doc.setTextColor(0);

  let cursorY = 32;

  if (globalNotes?.trim()) {
    doc.setFontSize(12);
    doc.text('Allgemeine Notizen', 14, cursorY);
    cursorY += 5;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(globalNotes, 180);
    doc.text(lines, 14, cursorY);
    cursorY += lines.length * 5 + 4;
  }

  const renderTable = (
    title: string,
    rows: Array<{ label: string; row?: ChecklistPriorityRow }>
  ) => {
    if (cursorY > 260) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFontSize(13);
    doc.text(title, 14, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY + 2,
      head: [['Feature', 'Priorität', 'Bearbeitet', 'Notizen']],
      body: rows.map(({ label, row }) => [
        label,
        row?.priority ? PRIORITY_LABEL[row.priority] : '—',
        row?.is_worked_on ? 'Ja' : '',
        row?.notes ?? '',
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const r = rows[data.row.index].row;
          if (r?.priority && PRIORITY_COLOR[r.priority]) {
            data.cell.styles.fillColor = PRIORITY_COLOR[r.priority];
            data.cell.styles.textColor = 255;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // @ts-expect-error lastAutoTable injected by autoTable plugin
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8;
  };

  for (const cat of CHECKLIST_CATEGORIES) {
    renderTable(
      cat.label,
      cat.features.map((f) => ({
        label: f.label,
        row: findRow(priorities, cat.key, f.key),
      }))
    );
  }

  renderTable(
    'Edge Functions',
    edgeFunctions.map((ef) => ({
      label: `${ef.label} (${ef.function_name})`,
      row: findRow(priorities, EDGE_FUNCTIONS_CATEGORY, ef.function_name),
    }))
  );

  doc.save(`checkliste-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportChecklistJson(
  priorities: ChecklistPriorityRow[],
  edgeFunctions: ChecklistEdgeFunction[],
  globalNotes: string
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    globalNotes,
    categories: CHECKLIST_CATEGORIES.map((cat) => ({
      key: cat.key,
      label: cat.label,
      features: cat.features.map((f) => {
        const row = findRow(priorities, cat.key, f.key);
        return {
          key: f.key,
          label: f.label,
          priority: row?.priority ?? null,
          isWorkedOn: row?.is_worked_on ?? false,
          notes: row?.notes ?? '',
        };
      }),
    })),
    edgeFunctions: edgeFunctions.map((ef) => {
      const row = findRow(priorities, EDGE_FUNCTIONS_CATEGORY, ef.function_name);
      return {
        functionName: ef.function_name,
        label: ef.label,
        priority: row?.priority ?? null,
        isWorkedOn: row?.is_worked_on ?? false,
        notes: row?.notes ?? '',
      };
    }),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `checkliste-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
