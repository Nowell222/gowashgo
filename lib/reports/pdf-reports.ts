import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatOrderStatus } from '@/lib/orders/status-machine';
import type { OrderStatus } from '@/lib/types';

/**
 * Format centavos to pure number string (2 decimal places) for PDF documents.
 * Avoids Unicode currency symbols (e.g. ₱) which standard jsPDF fonts render as ±.
 */
function formatPdfNumber(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/**
 * Format a date nicely for PDF headers & stamps
 */
function formatDateStamp(date = new Date()): string {
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSafeFileDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Brand Colors
const COLOR_PRIMARY = [14, 116, 144] as [number, number, number]; // Soap Teal #0E7490
const COLOR_DARK = [22, 78, 99] as [number, number, number]; // Deep Marine #164E63
const COLOR_TEXT = [15, 23, 42] as [number, number, number]; // Slate 900
const COLOR_MUTED = [100, 116, 139] as [number, number, number]; // Slate 500
const COLOR_BG_LIGHT = [250, 248, 245] as [number, number, number]; // Natural Linen #FAF8F5

/**
 * Common Header for GoWashGo PDF Reports
 */
function drawReportHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  badgeText: string,
  badgeColor = COLOR_PRIMARY
) {
  // Top brand accent bar
  doc.setFillColor(...COLOR_DARK);
  doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('gowashgo', 14, 15);

  // Badge Text
  doc.setFontSize(9);
  doc.setTextColor(103, 232, 249);
  const badgeWidth = doc.getTextWidth(badgeText);
  doc.text(badgeText, doc.internal.pageSize.width - 14 - badgeWidth, 15);

  // Report Title & Subtitle
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(subtitle, 14, 43);

  // Thin separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 48, doc.internal.pageSize.width - 14, 48);
}

/**
 * Common Footer for GoWashGo PDF Reports
 */
function drawReportFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('GoWashGo Smart Laundry Operations · Certified Digital Weight Manifest', 14, pageHeight - 8);

  const pageStr = `Page ${pageNum} of ${totalPages}`;
  doc.text(pageStr, pageWidth - 14 - doc.getTextWidth(pageStr), pageHeight - 8);
}

/**
 * ============================================================================
 * 1. PLATFORM ADMIN OPERATIONS & REVENUE LEDGER PDF REPORT
 * ============================================================================
 */
export async function downloadAdminPlatformReport(data: any) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const s = data?.summary || {};
  const branches = data?.branches || [];
  const orders = data?.recentOrders || [];

  const totalBranchRevenue = branches.reduce((sum: number, b: any) => sum + (b.revenueCentavos || 0), 0);
  const totalBranchVolume = branches.reduce((sum: number, b: any) => sum + (b.totalVolumeCentavos || b.revenueCentavos || 0), 0);
  const totalBranchOrders = branches.reduce((sum: number, b: any) => sum + (b.ordersCount || 0), 0);

  const completedLedgerOrders = orders.filter((o: any) => ['delivered', 'completed'].includes(o.status));
  const completedLedgerCentavos = completedLedgerOrders.reduce((sum: number, o: any) => sum + (o.totalCentavos || 0), 0);
  const totalLedgerCentavos = orders.reduce((sum: number, o: any) => sum + (o.totalCentavos || 0), 0);

  drawReportHeader(
    doc,
    'Platform Operations & Financial Ledger Report',
    `Generated on ${formatDateStamp()} · Enterprise Multi-Branch Overview`,
    'PLATFORM ADMIN LEDGER'
  );

  // Executive KPI summary box showing both Completed Revenue and Total Platform Pipeline GMV
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 52, doc.internal.pageSize.width - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('COMPLETED REVENUE (REALIZED)', 20, 58);
  doc.text('TOTAL PLATFORM VALUE (GMV)', 78, 58);
  doc.text('TOTAL ORDERS', 145, 58);
  doc.text('CLEAN WEIGHT', 195, 58);
  doc.text('ACTIVE BRANCH HUBS', 245, 58);

  doc.setFontSize(13);
  doc.setTextColor(...COLOR_DARK);
  doc.text(formatPdfNumber(s.totalRevenueCentavos || totalBranchRevenue), 20, 67);
  doc.text(formatPdfNumber(s.totalVolumeCentavos || totalLedgerCentavos || totalBranchVolume), 78, 67);
  doc.text(String(s.totalOrders || orders.length), 145, 67);
  doc.text(`${s.totalWeightKg || 0} kg`, 195, 67);
  doc.text(`${s.totalBranches || branches.length} locations`, 245, 67);

  // Section 1: Branch Hubs Comparison Table showing both Completed Revenue and Total Volume
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Branch Hubs Performance Summary', 14, 82);

  autoTable(doc, {
    startY: 86,
    head: [['Hub Name', 'Physical Address', 'Orders Volume', 'Active Load', 'Completed Revenue', 'Total Orders Value', 'Status']],
    body: branches.map((b: any) => [
      b.name,
      b.address,
      `${b.ordersCount || 0} orders`,
      `${b.activeOrdersCount || 0} active`,
      formatPdfNumber(b.revenueCentavos || 0),
      formatPdfNumber(b.totalVolumeCentavos || b.revenueCentavos || 0),
      b.isActive ? 'Active' : 'Inactive',
    ]),
    foot: [['TOTAL ALL HUBS', '', `${totalBranchOrders} orders`, '', formatPdfNumber(totalBranchRevenue), formatPdfNumber(totalBranchVolume), '']],
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: COLOR_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLOR_TEXT,
    },
    margin: { left: 14, right: 14 },
  });

  // Section 2: Detailed Orders Ledger with complete platform orders
  const nextY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Platform Orders Ledger', 14, nextY);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Order Number', 'Customer Name', 'Customer Email', 'Branch Hub', 'Status', 'Weight (kg)', 'Payment', 'Amount Processed', 'Date']],
    body: orders.map((o: any) => [
      o.orderNumber,
      o.customerName,
      o.customerEmail,
      o.branchName,
      formatOrderStatus(o.status as OrderStatus),
      o.weightKg ? `${o.weightKg} kg` : '—',
      o.paymentMethod.toUpperCase(),
      formatPdfNumber(o.totalCentavos || 0),
      new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    ]),
    foot: [
      ['TOTAL PLATFORM ORDERS VALUE', `${orders.length} orders`, '', '', '', '', '', formatPdfNumber(totalLedgerCentavos), ''],
      ['— of which COMPLETED / DELIVERED', `${completedLedgerOrders.length} orders`, '', '', '', '', '', formatPdfNumber(completedLedgerCentavos), ''],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: COLOR_TEXT,
    },
    margin: { left: 14, right: 14 },
  });

  // Add Page Numbers in Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawReportFooter(doc, i, pageCount);
  }

  doc.save(`GoWashGo_Platform_Operations_Report_${getSafeFileDate()}.pdf`);
}

/**
 * ============================================================================
 * 2. BRANCH MANAGER SHIFT RECONCILIATION & COURIER COD REPORT
 * ============================================================================
 */
export async function downloadManagerShiftReport(props: {
  branchName: string;
  branchAddress: string;
  managerName: string;
  orders: any[];
  riderSettlements: any[];
}) {
  const { branchName, branchAddress, managerName, orders, riderSettlements } = props;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawReportHeader(
    doc,
    `${branchName} — Shift Handover Report`,
    `Shift Supervisor: ${managerName} · Generated ${formatDateStamp()}`,
    'MANAGER SHIFT RECONCILIATION'
  );

  const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
  const activeOrders = orders.filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));
  const totalRealizedRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalAmountAllOrders = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalWeight = completedOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);
  const allOrdersWeight = orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);
  const unremittedCash = riderSettlements
    .filter((r) => !r.isSettled)
    .reduce((sum, r) => sum + (r.cashCollected || 0), 0);

  // Shift KPIs Box showing both Completed Revenue and Total Shift Value
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 52, doc.internal.pageSize.width - 28, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('COMPLETED REVENUE', 20, 58);
  doc.text('TOTAL SHIFT VALUE', 68, 58);
  doc.text('ORDERS VOLUME', 115, 58);
  doc.text('UNREMITTED COD CASH', 152, 58);

  doc.setFontSize(12);
  doc.setTextColor(...COLOR_DARK);
  doc.text(formatPdfNumber(totalRealizedRevenue), 20, 66);
  doc.text(formatPdfNumber(totalAmountAllOrders), 68, 66);
  doc.text(`${completedOrders.length} done / ${orders.length} total`, 115, 66);

  doc.setTextColor(180, 83, 9); // Amber for unremitted cash
  doc.text(formatPdfNumber(unremittedCash), 152, 66);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Delivered & Fulfilled', 20, 72);
  doc.text(`All ${orders.length} Orders in Shift`, 68, 72);
  doc.text(`${totalWeight.toFixed(1)} kg completed weight`, 115, 72);
  doc.text('Courier drawer handover', 152, 72);

  // Section 1: Courier COD Cash Reconciliation Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Courier Fleet COD Cash Reconciliation', 14, 83);

  const totalCourierCash = riderSettlements.reduce((sum, r) => sum + (r.cashCollected || 0), 0);

  autoTable(doc, {
    startY: 87,
    head: [['Courier Driver', 'Contact Phone', 'Orders Delivered', 'COD Cash Collected', 'Remittance Status']],
    body: riderSettlements.map((r: any) => [
      r.riderName || 'Courier',
      r.phone || '—',
      String(r.completedCount || 0),
      formatPdfNumber(r.cashCollected || 0),
      r.isSettled ? 'Settled & Verified ✓' : 'Pending Drawer Handover ⚠️',
    ]),
    foot: [['TOTAL COURIER COLLECTIONS', '', '', formatPdfNumber(totalCourierCash), '']],
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: COLOR_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLOR_TEXT,
    },
    margin: { left: 14, right: 14 },
  });

  // Section 2: Shift Orders Manifest with breakdown footer
  const nextY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Shift Orders Manifest', 14, nextY);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Order #', 'Customer', 'Courier', 'Status', 'Weight (kg)', 'Payment', 'Amount Processed']],
    body: orders.map((o: any) => [
      o.order_number,
      o.customer?.full_name || 'Customer',
      o.rider?.full_name || '—',
      formatOrderStatus(o.status as OrderStatus),
      o.weight_kg ? `${o.weight_kg} kg` : '—',
      (o.payment_method || 'online').toUpperCase(),
      formatPdfNumber(o.total || 0),
    ]),
    foot: [
      [`TOTAL SHIFT VALUE (ALL ${orders.length} ORDERS)`, `${orders.length} orders`, '', '', `${allOrdersWeight.toFixed(1)} kg`, '', formatPdfNumber(totalAmountAllOrders)],
      [`— of which COMPLETED / DELIVERED`, `${completedOrders.length} orders`, '', '', `${totalWeight.toFixed(1)} kg`, '', formatPdfNumber(totalRealizedRevenue)],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: COLOR_TEXT,
    },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawReportFooter(doc, i, pageCount);
  }

  doc.save(`GoWashGo_${branchName.replace(/\s+/g, '_')}_Shift_Report_${getSafeFileDate()}.pdf`);
}

/**
 * ============================================================================
 * 3. FACILITY STAFF WASH QUEUE & INTAKE MANIFEST PDF REPORT
 * ============================================================================
 */
export async function downloadStaffFacilityReport(props: {
  branchName: string;
  orders: any[];
  staffName?: string;
}) {
  const { branchName, orders, staffName } = props;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawReportHeader(
    doc,
    `${branchName} — Wash Facility Queue & Intake Manifest`,
    `Generated by: ${staffName || 'Facility Operator'} · Date: ${formatDateStamp()}`,
    'FACILITY WORKFLOW MANIFEST'
  );

  const inSorting = orders.filter((o) => o.status === 'at_facility').length;
  const inWashing = orders.filter((o) => o.status === 'washing').length;
  const inDrying = orders.filter((o) => o.status === 'drying').length;
  const inFolding = orders.filter((o) => o.status === 'folding').length;
  const readyDispatch = orders.filter((o) => o.status === 'ready_for_delivery').length;

  const totalAmountCentavos = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalWeightKg = orders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);

  // Active Queue KPIs Box with Total Amount Processed
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 52, doc.internal.pageSize.width - 28, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TOTAL AMOUNT PROCESSED', 20, 58);
  doc.text('TOTAL WEIGHT IN QUEUE', 78, 58);
  doc.text('ACTIVE LOADS', 132, 58);
  doc.text('FACILITY CYCLE BREAKDOWN', 165, 58);

  doc.setFontSize(13);
  doc.setTextColor(...COLOR_DARK);
  doc.text(formatPdfNumber(totalAmountCentavos), 20, 67);
  doc.text(`${totalWeightKg.toFixed(1)} kg`, 78, 67);
  doc.text(`${orders.length} orders`, 132, 67);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Sort: ${inSorting}  |  Wash: ${inWashing}  |  Dry: ${inDrying}`, 165, 65);
  doc.text(`Fold: ${inFolding}  |  Dispatch: ${readyDispatch}`, 165, 71);

  // Active Queue Manifest Table with Amount Processed column & total footer
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Live Facility Wash Queue Manifest', 14, 86);

  autoTable(doc, {
    startY: 90,
    head: [['Order Number', 'Customer', 'Current Stage', 'Intake Weight', 'Amount Processed', 'Special Care / Remarks']],
    body: orders.map((o: any) => [
      o.order_number,
      o.customer?.full_name || 'Customer',
      formatOrderStatus(o.status as OrderStatus),
      o.weight_kg ? `${o.weight_kg} kg` : '—',
      formatPdfNumber(o.total || 0),
      o.intake_discrepancy_note || o.special_instructions || 'Standard fabric care',
    ]),
    foot: [['TOTAL FACILITY PROCESSED', `${orders.length} orders`, '', `${totalWeightKg.toFixed(1)} kg`, formatPdfNumber(totalAmountCentavos), '']],
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: COLOR_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLOR_TEXT,
    },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawReportFooter(doc, i, pageCount);
  }

  doc.save(`GoWashGo_Facility_Intake_Manifest_${getSafeFileDate()}.pdf`);
}
