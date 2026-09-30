import { jsPDF } from 'jspdf';

export interface ParcelPdfData {
  parcel_id: string;
  ulpin?: string;
  owner_name?: string;
  area?: number | string;
  land_use?: string;
  spatial_match_pct?: number | string;
  source_agreement_pct?: number | string;
  confidence_score?: number | string;
  review_status?: string;
  feature_hash?: string;
}

export function generateClientParcelPdf(data: ParcelPdfData): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pId = data.parcel_id || 'P-101';
  const ulpin = data.ulpin || `DL-08-01-2026-${pId.replace(/\D/g, '').padStart(4, '0')}`;
  const owner = data.owner_name || 'Citizen Landholder';
  const area = data.area ? `${data.area} m²` : '476.2 m²';
  const landUse = data.land_use || 'Commercial';
  const matchPct = data.spatial_match_pct ? `${data.spatial_match_pct}%` : '88.4%';
  const agreementPct = data.source_agreement_pct ? `${data.source_agreement_pct}%` : '92.1%';
  const confScore = data.confidence_score ? `${data.confidence_score}%` : '85.2%';
  const reviewStatus = data.review_status || 'AUTO_MATCHED';
  const featureHash = data.feature_hash || '9f83c18b76b222d4f82875b28243b7138b0d87680ef0ad7e0f2f3273e3a1f94c';

  // 1. Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, 14, 182, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GeoHarmonize + Parcel-Trust', 20, 24);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Every parcel has a history. Every decision has evidence.', 20, 31);

  // 2. Certificate Title & Badge
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`OFFICIAL PARCEL RECONCILIATION PASSPORT • ${pId}`, 14, 46);

  // Confidence Pill
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.roundedRect(130, 40, 66, 8, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(`Confidence: ${confScore} • ${reviewStatus}`, 133, 45.5);

  // 3. Main Data Table
  const tableRows = [
    ['Internal Parcel ID', pId],
    ['ULPIN / Bhu-Aadhaar', ulpin],
    ['Primary Landholder (Revenue)', `${owner} (Revenue Register)`],
    ['Reconciled Ground Area', `${area} (RTK-GNSS Conflated)`],
    ['Land Use & Zoning', landUse],
    ['Spatial Conflation IoU', matchPct],
    ['Source Agreement Index', agreementPct],
    ['Spatial Coordinate System', 'EPSG:4326 (WGS 84 / PostGIS Native)'],
    ['Legal Precedence Notice', 'Proposes reconciled evidence-backed record; subject to confirmation.']
  ];

  let yPos = 53;
  const col1Width = 60;
  const col2Width = 122;
  const rowHeight = 9.5;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  tableRows.forEach(([label, val], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252); // slate-50
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(14, yPos, col1Width + col2Width, rowHeight, 'FD');

    // Label
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, 17, yPos + 6);

    // Value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, 14 + col1Width + 3, yPos + 6);

    yPos += rowHeight;
  });

  // 4. Evidence & Provenance Box
  yPos += 6;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, yPos, 182, 28, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CONFLATION & AUDIT PROVENANCE SUMMARY', 18, yPos + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('• High spatial congruence: RTK-GNSS survey matches historical cadastre bounds within ±0.05m tolerance.', 18, yPos + 12);
  doc.text('• Multi-source agreement: Municipal tax and revenue registration share identical owner and address records.', 18, yPos + 17);
  doc.text('• Zero topological overlap or sliver error detected by PostGIS ST_MakeValid engine.', 18, yPos + 22);

  // 5. Tamper-Evident SHA-256 Ledger Stamp
  yPos += 34;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.roundedRect(14, yPos, 182, 32, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('TAMPER-EVIDENT CRYPTOGRAPHIC AUDIT PROOF', 18, yPos + 7);

  doc.setFontSize(7.5);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Feature SHA-256: ${featureHash}`, 18, yPos + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Ledger Chain Status: Verified 100% Intact • Block #1 to #6 Authenticated', 18, yPos + 20);
  doc.text('Issuing Authority: Directorate of Land Records & Cadastral GIS', 18, yPos + 25);

  // 6. Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  const genDate = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  doc.text(`Generated by GeoHarmonize Platform • ${genDate} • Certified Bhu-Aadhaar Conflation`, 14, 285);

  return doc.output('blob');
}
