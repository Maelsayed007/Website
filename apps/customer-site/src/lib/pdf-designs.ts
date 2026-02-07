import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, isSameDay } from 'date-fns';
import { Booking, Boat, WebsiteSettings } from './types';

// Extend the jsPDF type to include the autoTable method
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

// --- CHECK-IN MANIFEST (LISTA DE TRIPULAÇÃO) ---
export const generateCheckinManifest = async (booking: Booking, boat: Boat | undefined, settings: WebsiteSettings, extrasTotal?: number) => {
  if (!boat) return;
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let y = 10;
  const mainFont = 'Helvetica';
  const margin = 10;

  // --- Logo (Left) - try to load from settings or fetch from URL ---
  // Use proper aspect ratio for portrait logo (taller than wide)
  let logoLoaded = false;
  const logoWidth = 25;  // Reduced width for portrait
  const logoHeight = 35; // Taller height

  if (settings.logoUrl) {
    try {
      if (settings.logoUrl.startsWith('data:image')) {
        doc.addImage(settings.logoUrl, 'PNG', margin, y, logoWidth, logoHeight);
        logoLoaded = true;
      } else {
        const response = await fetch(settings.logoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            try {
              doc.addImage(reader.result as string, 'PNG', margin, y, logoWidth, logoHeight);
              logoLoaded = true;
            } catch (e) { /* ignore */ }
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) { /* ignore */ }
  }

  if (!logoLoaded) {
    try {
      const response = await fetch('/amieira-logo.png');
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            try {
              doc.addImage(reader.result as string, 'PNG', margin, y, logoWidth, logoHeight);
            } catch (e) { /* ignore */ }
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) { /* ignore */ }
  }

  // --- Header Info (Right of Logo - beside it, not below) ---
  const infoLabelX = margin + logoWidth + 8;
  const infoValueX = infoLabelX + 35;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const drawHeaderLine = (label: string, value: string, lineY: number) => {
    doc.setFont(mainFont, 'bold');
    doc.text(label, infoLabelX, lineY);
    doc.text(value, infoValueX, lineY);
  };

  // Format: Model Name (Boat Name) - not duplicated
  let boatDisplay = boat.name || '';
  if (boat.modelName && boat.modelName !== boat.name) {
    boatDisplay = `${boat.modelName} (${boat.name})`;
  } else if (!boat.modelName) {
    // If modelName missing, try to infer or just show name. 
    // The user issue "PORTEL (PORTEL)" came from page.tsx logic.
    // Here we just use what we have.
    boatDisplay = boat.name;
  }

  drawHeaderLine('Nome:', booking.clientName || '', y + 5);
  drawHeaderLine('Agência:', booking.source || 'AM', y + 11);
  drawHeaderLine('Embarcação:', boatDisplay, y + 17);

  const formatDateWithTime = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${format(d, 'dd/MM/yyyy')}– ${format(d, 'HH:mm')}h`;
  };
  drawHeaderLine('IN:', formatDateWithTime(booking.startTime), y + 23);
  drawHeaderLine('OUT:', formatDateWithTime(booking.endTime), y + 29);

  y += 38;

  // --- CONTACTOS / FACTURAÇÃO / ESTADIA Tables ---
  const balanceDue = (booking.price || 0) - (booking.discount || 0) - (booking.initialPaymentAmount || 0);
  const tableLeft = margin;
  const col1W = 28;
  const col2W = 22;
  const col3W = pageWidth - margin * 2 - col1W - col2W;

  const hasExtras = extrasTotal && extrasTotal > 0;
  const estadiaRowSpan = hasExtras ? 4 : 3;
  const estadiaRows: any[] = [
    [{ content: 'ESTADIA', rowSpan: estadiaRowSpan, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }, { content: 'Total:', styles: { fontStyle: 'bold', cellWidth: col2W } }, { content: `${(booking.price || 0).toFixed(2)}€`, styles: { fontStyle: 'bold' } }],
  ];
  if (hasExtras) {
    estadiaRows.push([{ content: 'Extras:', styles: { fontStyle: 'bold' } }, { content: `${extrasTotal.toFixed(2)}€`, styles: { fontStyle: 'bold' } }]);
  }
  estadiaRows.push([{ content: 'Pago:', styles: { fontStyle: 'bold' } }, { content: `${(booking.initialPaymentAmount || 0).toFixed(2)}€`, styles: { fontStyle: 'bold' } }]);
  estadiaRows.push([{ content: 'A pagar:', styles: { fontStyle: 'bold' } }, { content: `${balanceDue.toFixed(2)}€`, styles: { fontStyle: 'bold' } }]);

  doc.autoTable({
    startY: y,
    tableWidth: pageWidth - margin * 2,
    margin: { left: tableLeft },
    body: [
      [{ content: 'CONTACTOS', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellWidth: col1W } }, { content: 'Telemóvel', styles: { fontStyle: 'bold', cellWidth: col2W } }, { content: booking.clientPhone || '', styles: { fontStyle: 'bold', cellWidth: col3W } }],
      [{ content: 'E-mail', styles: { fontStyle: 'bold' } }, { content: booking.clientEmail || '', styles: { fontStyle: 'bold' } }],
      [{ content: 'FACTURAÇÃO', rowSpan: 3, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }, { content: 'Nome', styles: { fontStyle: 'bold' } }, { content: booking.clientName || '', styles: { fontStyle: 'bold' } }],
      [{ content: 'Morada', styles: { fontStyle: 'bold' } }, { content: '', styles: { fontStyle: 'bold' } }],
      [{ content: 'NIF', styles: { fontStyle: 'bold' } }, { content: '', styles: { fontStyle: 'bold' } }],
      ...estadiaRows,
    ],
    theme: 'grid',
    styles: { font: mainFont, fontSize: 10, cellPadding: 2, lineWidth: 0.4, lineColor: [0, 0, 0], textColor: [0, 0, 0], fontStyle: 'bold', minCellHeight: 6 },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // --- LISTA DE TRIPULAÇÃO Header ---
  doc.setFillColor(210, 210, 210);
  doc.rect(margin, y, pageWidth - margin * 2, 12, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  doc.line(margin, y, margin, y + 12);
  doc.line(pageWidth - margin, y, pageWidth - margin, y + 12);
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('LISTA DE TRIPULAÇÃO', pageWidth / 2, y + 5, { align: 'center' });
  doc.setFontSize(8);
  doc.text('(Preencher com o máximo de dados possível, por favor)', pageWidth / 2, y + 10, { align: 'center' });
  y += 12;

  // --- Guest List Table ---
  doc.autoTable({
    startY: y,
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin },
    head: [['', 'NOME', 'PAÍS', 'IDADE', 'TELEFONE', 'E-MAIL']],
    body: Array.from({ length: 12 }, (_, i) => [String(i + 1), '', '', '', '', '']),
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.4, fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], minCellHeight: 5, cellPadding: 1.5 },
    styles: { font: mainFont, fontSize: 8, lineWidth: 0.4, cellPadding: 1.5, lineColor: [0, 0, 0], textColor: [0, 0, 0], fontStyle: 'bold', minCellHeight: 6 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 18 },
      3: { cellWidth: 14 },
      4: { cellWidth: 32 }
    }
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // --- Terms Box ---
  const termsBoxHeight = 24;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, pageWidth - margin * 2, termsBoxHeight);
  doc.setFontSize(7);
  doc.setFont(mainFont, 'bold');
  doc.setTextColor(0, 0, 0);
  const termsText = "Subscrevo e declaro que me foi transmitida toda a informação necessária para a correcta utilização do Barco Casa (no verso), bem como que conheço as condições gerais de aluguer e todas as informações específicas relativas ao meu cruzeiro, que as aceito e me comprometo a cumprir.";
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - margin * 2 - 10);
  doc.text(splitTerms, margin + 4, y + 5);

  // Signature line
  doc.setFontSize(8);
  doc.text('Data: ______ / ______ / ______', margin + 4, y + termsBoxHeight - 4);
  doc.text('Local:____________________', 70, y + termsBoxHeight - 4);
  doc.text('Assinatura: ________________________________', 115, y + termsBoxHeight - 4);

  // --- Footer ID ---
  doc.setFontSize(6);
  doc.text('3.1MOD.02REV.00', pageWidth - margin, pageHeight - 4, { align: 'right' });

  doc.save(`checkin-manifest-${booking.id}.pdf`);
};

// --- FUEL MANIFEST (FICHA DE ESTADIA) ---
export const generateFuelManifest = async (booking: Booking, boat: Boat | undefined, settings: WebsiteSettings) => {
  if (!boat) return;
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let y = 10;
  const mainFont = 'Helvetica';
  const margin = 12;

  // --- Title with underline bar ---
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('FICHA DE ESTADIA – AMIEIRA MARINA', pageWidth / 2, y + 5, { align: 'center' });
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y + 8, pageWidth - margin * 2, 2, 'F');

  // --- Logo (Top Right) ---
  let logoLoaded = false;
  if (settings.logoUrl) {
    try {
      if (settings.logoUrl.startsWith('data:image')) {
        doc.addImage(settings.logoUrl, 'PNG', pageWidth - margin - 25, y - 5, 25, 25);
        logoLoaded = true;
      } else {
        const response = await fetch(settings.logoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            try {
              doc.addImage(reader.result as string, 'PNG', pageWidth - margin - 25, y - 5, 25, 25);
              logoLoaded = true;
            } catch (e) { /* ignore */ }
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) { /* ignore */ }
  }
  if (!logoLoaded) {
    try {
      const response = await fetch('/amieira-logo.png');
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            try {
              doc.addImage(reader.result as string, 'PNG', pageWidth - margin - 25, y - 5, 25, 25);
            } catch (e) { /* ignore */ }
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) { /* ignore */ }
  }

  y += 16;

  // --- Header Details ---
  doc.setFontSize(9);
  doc.setFont(mainFont, 'bold');

  const labelX = margin;
  const valueX = 52;
  const label2X = 105;
  const value2X = 148;

  const formatDate = (dateStr: string | undefined) => dateStr ? format(new Date(dateStr), 'dd/MM/yyyy') : '';
  const formatTime = (dateStr: string | undefined) => dateStr ? format(new Date(dateStr), 'HH : mm') : '';

  doc.text('NOME DO CLIENTE :', labelX, y);
  doc.text(booking.clientName || '', valueX, y);
  y += 5;
  doc.text('EMBARCAÇÃO :', labelX, y);
  doc.text(`${boat.name || ''} ${boat.modelName || ''}`, valueX, y);
  y += 5;
  doc.text('DATA DE PARTIDA :', labelX, y);
  doc.text(formatDate(booking.startTime), valueX, y);
  doc.text('HORA DE PARTIDA :', label2X, y);
  doc.text(formatTime(booking.startTime), value2X, y);
  y += 5;
  doc.text('DATA DE CHEGADA :', labelX, y);
  doc.text(formatDate(booking.endTime), valueX, y);
  doc.text('HORA DE CHEGADA :', label2X, y);
  doc.text(formatTime(booking.endTime), value2X, y);
  y += 6;

  // --- Navigation Hours Table ---
  doc.autoTable({
    startY: y,
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin },
    head: [['HORAS DE\nNAVEGAÇÃO', 'Partida', 'Chegada', 'Saldo']],
    body: [['', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.3, fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0] },
    styles: { font: mainFont, fontSize: 8, halign: 'center', lineWidth: 0.3, cellPadding: 2, fontStyle: 'bold', lineColor: [0, 0, 0], minCellHeight: 6 },
    columnStyles: { 0: { halign: 'center', cellWidth: 42, fontStyle: 'bold' } }
  });
  y = (doc as any).lastAutoTable.finalY;

  // --- Cleaning Table ---
  doc.autoTable({
    startY: y,
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin },
    head: [['LIMPEZA', { content: 'Partida', colSpan: 2 }, 'Chegada']],
    body: [
      ['Limpeza exterior', '', '', ''],
      ['Limpeza interior', '', '', '']
    ],
    theme: 'grid',
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], lineWidth: 0.3, fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0] },
    styles: { font: mainFont, fontSize: 8, halign: 'center', lineWidth: 0.3, cellPadding: 2, fontStyle: 'bold', lineColor: [0, 0, 0], minCellHeight: 5 },
    columnStyles: { 0: { halign: 'left', cellWidth: 42, fontStyle: 'bold' } }
  });
  y = (doc as any).lastAutoTable.finalY;

  // --- Extras Table ---
  doc.autoTable({
    startY: y,
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin },
    head: [['EXTRAS', 'Pedido', 'Partida', 'Chegada']],
    body: [
      ['Bicicletas', '', '', ''],
      ['Canoas', '', '', ''],
      ['Estacionamento', '', '', ''],
      ['Catering', '', '', ''],
      ['Animais de estimação', '', '', ''],
      ['Outros', '', '', '']
    ],
    theme: 'grid',
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], lineWidth: 0.3, fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0] },
    styles: { font: mainFont, fontSize: 8, halign: 'center', lineWidth: 0.3, cellPadding: 2, fontStyle: 'bold', lineColor: [0, 0, 0], minCellHeight: 5 },
    columnStyles: { 0: { halign: 'left', cellWidth: 42, fontStyle: 'bold' } }
  });
  y = (doc as any).lastAutoTable.finalY + 1;

  // --- Signatures Table ---
  doc.autoTable({
    startY: y,
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin },
    body: [
      [
        { content: 'Partida', styles: { fontStyle: 'bold', valign: 'middle', halign: 'center', fontSize: 9 } },
        { content: 'Técnico de Manutenção\n\nNome                    Rubrica', styles: { fontSize: 7, halign: 'center', fontStyle: 'bold' } },
        { content: 'Cliente', styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }
      ],
      [
        { content: 'Chegada', styles: { fontStyle: 'bold', valign: 'middle', halign: 'center', fontSize: 9 } },
        { content: 'Técnico de Manutenção\n\nNome                    Rubrica', styles: { fontSize: 7, halign: 'center', fontStyle: 'bold' } },
        { content: 'Cliente', styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }
      ]
    ],
    theme: 'grid',
    styles: { font: mainFont, lineWidth: 0.3, minCellHeight: 14, lineColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 60 } }
  });
  y = (doc as any).lastAutoTable.finalY + 1;

  // --- Observations Box ---
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(8);
  doc.text('Observações:', margin + 2, y + 4);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - margin * 2, 18);
  y += 22;

  // --- Verifications and Supplies ---
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(10);
  doc.text('Verificações e Suprimentos', margin, y);
  y += 4;

  // Left Column Checklist
  doc.autoTable({
    startY: y,
    margin: { left: margin },
    tableWidth: 60,
    body: [
      ['Óleo motor', ''],
      ['Óleo caixa', ''],
      ['Água radiador', ''],
      ['Combustível', ''],
      [{ content: 'Gás', styles: { halign: 'center', fontStyle: 'bold' } }, ''],
      ['Cheio', ''],
      ['Em uso', ''],
      ['Águas negras', ''],
      ['Água potável', ''],
      ['Fósforos', ''],
      ['Papel WC', '']
    ],
    theme: 'grid',
    styles: { font: mainFont, fontSize: 7, cellPadding: 1.5, lineWidth: 0.3, fontStyle: 'bold', lineColor: [0, 0, 0] },
    columnStyles: { 0: { cellWidth: 48, halign: 'right' }, 1: { cellWidth: 12 } }
  });

  // Right Column Checklist
  doc.autoTable({
    startY: y,
    margin: { left: 95 },
    tableWidth: 100,
    body: [
      ['Kit de limpeza (Pá, vassoura, balde,\ndetergente de limpeza)', ''],
      ['Detergente loiça', ''],
      ['Sabonete líquido WC', ''],
      ['Lavagem exterior', ''],
      ['Cabos enrolados', ''],
      ['Ligar barco ao cais', ''],
      ['Ligar frigorífico', '']
    ],
    theme: 'grid',
    styles: { font: mainFont, fontSize: 7, cellPadding: 1.5, lineWidth: 0.3, fontStyle: 'bold', lineColor: [0, 0, 0] },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 12 } }
  });

  const checklistEndY = Math.max((doc as any).lastAutoTable.finalY, y + 50);

  // Nome do Técnico
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(9);
  doc.text('Nome do Técnico', 120, checklistEndY + 8);

  // Footer text
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(5);
  const footerText = "Toda a informação desta ficha será processada informaticamente. Ao seu titular é garantido o direito de acesso, rectificação ou eliminação, sempre que a entidade seja contactada nesse sentido.\nOs dados aqui presentes serão tratados informaticamente e destinam-se exclusivamente para a divulgação de actividades promovidas pela Amieira Marina e Gescruzeiros. Ao seu titular é garantido o direito de acesso, rectificação ou eliminação, sempre que a entidade seja contactada nesse sentido.";
  const lines = doc.splitTextToSize(footerText, pageWidth - margin * 2);
  doc.text(lines, margin, pageHeight - 8);

  doc.save(`fuel-stay-sheet-${booking.id}.pdf`);
};

// --- RESERVATION DETAILS SUMMARY ---
export const generateFinancialSummary = (booking: Booking, boat: Boat, settings: WebsiteSettings) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.width;
  let y = 15;
  const mainFont = 'Helvetica';

  if (settings.logoUrl && settings.logoUrl.startsWith('data:image')) {
    try { doc.addImage(settings.logoUrl, 'PNG', 15, y, 25, 25); } catch (e) { }
  }

  doc.setFontSize(9);
  doc.setTextColor(100);
  const companyX = pageWidth - 15;
  doc.text(settings.company_name.toUpperCase(), companyX, y + 2, { align: 'right' });
  doc.text(settings.address || '', companyX, y + 7, { align: 'right' });
  doc.text(settings.phone || '', companyX, y + 12, { align: 'right' });

  y += 40;
  doc.setFont(mainFont, 'bold');
  doc.setFontSize(22);
  doc.text('Reservation Details Summary', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.autoTable({
    startY: y,
    theme: 'plain',
    body: [
      [{ content: 'Client Information', styles: { fontStyle: 'bold' } }, { content: 'Reservation Details', styles: { fontStyle: 'bold' } }],
      [`${booking.clientName}\n${booking.clientEmail}`, `${boat.modelName} (${boat.name})\nCheck-in: ${format(new Date(booking.startTime), 'PPp')}`]
    ],
  });

  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Description', 'Total']],
    body: [
      ['Total', `€${(booking.price || 0).toFixed(2)}`],
      ['Paid', `€${(booking.initialPaymentAmount || 0).toFixed(2)}`],
      ['Balance', `€${((booking.price || 0) - (booking.initialPaymentAmount || 0)).toFixed(2)}`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [52, 58, 64] },
    columnStyles: { 1: { halign: 'right' } },
  });

  doc.save(`reservation-summary-${booking.id}.pdf`);
};

// --- DAILY/WEEKLY ACTIVITY REPORT ---
export const generateActivityReport = (startDate: Date, endDate: Date, bookings: Booking[]) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.width;
  let y = 15;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Activity Report', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(`${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.autoTable({
    startY: y,
    head: [['Date', 'Time', 'Client', 'Type', 'Notes']],
    body: bookings.map(b => [
      format(new Date(b.startTime), 'EEE, MMM d'),
      format(new Date(b.startTime), 'p'),
      b.clientName,
      b.houseboatId ? 'Houseboat' : b.restaurantTableId ? 'Restaurant' : 'Other',
      b.notes || ''
    ]),
    theme: 'striped',
    headStyles: { fillColor: [23, 107, 135] },
  });

  const range = isSameDay(startDate, endDate) ? format(startDate, 'yyyy-MM-dd') : `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`;
  doc.save(`activity-report-${range}.pdf`);
};
