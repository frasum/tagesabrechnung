import jsPDF from 'jspdf';

interface SofortmeldungPdfData {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  nationalitaet: string;
  strasse: string;
  plz: string;
  ort: string;
  sozialversicherungsnr: string;
  steuerId: string;
  krankenkasse: string;
  eintrittsdatum: string;
  arbeitsbeginn: string;
  beschaeftigungsart: string;
  taetigkeit: string;
  minijob: boolean;
  restaurant: string;
}

export function exportSofortmeldungPdf(data: SofortmeldungPdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Sofortmeldung', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('nach § 28a Abs. 4 SGB IV — Gastronomie', margin, y);
  y += 4;

  // Date line
  const now = new Date();
  doc.text(`Erstellt am: ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Section: Personal data
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Angaben zur Person', margin, y);
  y += 8;

  const personalFields = [
    ['Nachname', data.nachname],
    ['Vorname', data.vorname],
    ['Geburtsdatum', data.geburtsdatum],
    ['Staatsangehoerigkeit', data.nationalitaet],
  ];

  y = renderFieldTable(doc, personalFields, margin, y, pageWidth);
  y += 6;

  // Section: Address
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Anschrift', margin, y);
  y += 8;

  const addressFields = [
    ['Strasse', data.strasse],
    ['PLZ', data.plz],
    ['Ort', data.ort],
  ];

  y = renderFieldTable(doc, addressFields, margin, y, pageWidth);
  y += 6;

  // Section: Social security
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Sozialversicherung', margin, y);
  y += 8;

  const svFields = [
    ['SV-Nummer', data.sozialversicherungsnr || '— nicht vorhanden —'],
    ['Steuer-ID', data.steuerId || '— nicht vorhanden —'],
    ['Krankenkasse', data.krankenkasse],
  ];

  y = renderFieldTable(doc, svFields, margin, y, pageWidth);
  y += 6;

  // Section: Employment
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Beschaeftigung', margin, y);
  y += 8;

  const empFields = [
    ['Eintrittsdatum', data.eintrittsdatum],
    ['Arbeitsbeginn (Uhrzeit)', data.arbeitsbeginn],
    ['Beschaeftigungsart', data.beschaeftigungsart],
    ['Taetigkeit', data.taetigkeit || '—'],
    ['Minijob', data.minijob ? 'Ja' : 'Nein'],
    ['Einsatzort', data.restaurant],
  ];

  y = renderFieldTable(doc, empFields, margin, y, pageWidth);
  y += 10;

  // Legal note
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const legalText =
    'Diese Sofortmeldung wurde gemaess § 28a Abs. 4 SGB IV erstellt. ' +
    'Der Arbeitgeber ist verpflichtet, die Aufnahme einer Beschaeftigung in den in § 28a Abs. 4 SGB IV ' +
    'genannten Wirtschaftsbereichen (u. a. Gastronomie) spaetestens bei Beschaeftigungsbeginn an die ' +
    'Datenstelle der Rentenversicherung zu melden.';
  const lines = doc.splitTextToSize(legalText, pageWidth - 2 * margin);
  doc.text(lines, margin, y);
  y += lines.length * 4 + 10;

  // Signature area
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Ort, Datum: ___________________________', margin, y);
  y += 12;
  doc.text('Unterschrift Arbeitgeber: ___________________________', margin, y);

  // Download
  const fileName = `Sofortmeldung_${data.nachname}_${data.vorname}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

function renderFieldTable(doc: jsPDF, fields: string[][], margin: number, startY: number, pageWidth: number): number {
  let y = startY;
  const labelWidth = 55;
  const valueX = margin + labelWidth;

  doc.setFontSize(10);
  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(value || '—', valueX, y);
    y += 7;
  }

  return y;
}
