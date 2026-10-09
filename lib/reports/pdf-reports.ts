import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus } from '@/lib/orders/status-machine';
import type { OrderStatus } from '@/lib/types';

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

  drawReportHeader(
    doc,
    'Platform Operations & Financial Ledger Report',
    `Generated on ${formatDateStamp()} · Enterprise Multi-Branch Overview`,
    'PLATFORM ADMIN LEDGER'
  );

  // Executive KPI summary box
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 52, doc.internal.pageSize.width - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('LIFETIME GROSS REVENUE', 20, 58);
  doc.text('TOTAL ORDERS', 80, 58);
  doc.text('CLEAN WEIGHT PROCESSED', 135, 58);
  doc.text('ACTIVE BRANCH HUBS', 195, 58);
  doc.text('REGISTERED USERS', 245, 58);

  doc.setFontSize(13);
  doc.setTextColor(...COLOR_DARK);
  doc.text(formatPeso(s.totalRevenueCentavos || 0), 20, 67);
  doc.text(String(s.totalOrders || 0), 80, 67);
  doc.text(`${s.totalWeightKg || 0} kg`, 135, 67);
  doc.text(`${s.totalBranches || 0} locations`, 195, 67);
  doc.text(`${s.totalUsers || 0} users`, 245, 67);

  // Section 1: Branch Hubs Comparison Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Branch Hubs Performance Summary', 14, 82);

  autoTable(doc, {
    startY: 86,
    head: [['Hub Name', 'Physical Address', 'Orders Volume', 'Active Load', 'Assigned Team', 'Gross Revenue (PHP)', 'Status']],
    body: branches.map((b: any) => [
      b.name,
      b.address,
      `${b.ordersCount || 0} orders`,
      `${b.activeOrdersCount || 0} active`,
      `${b.staffCount || 0} staff & riders`,
      (b.revenueCentavos / 100).toFixed(2),
      b.isActive ? 'Active' : 'Inactive',
    ]),
    theme: 'grid',
    headStyles: {
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

  // Section 2: Detailed Orders Ledger
  const nextY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Platform Orders Ledger', 14, nextY);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Order Number', 'Customer Name', 'Customer Email', 'Branch Hub', 'Status', 'Weight (kg)', 'Payment', 'Amount (PHP)', 'Date']],
    body: orders.map((o: any) => [
      o.orderNumber,
      o.customerName,
      o.customerEmail,
      o.branchName,
      formatOrderStatus(o.status as OrderStatus),
      o.weightKg ? `${o.weightKg} kg` : '—',
      o.paymentMethod.toUpperCase(),
      (o.totalCentavos / 100).toFixed(2),
      new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    ]),
    theme: 'striped',
    headStyles: {
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
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalWeight = completedOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);
  const unremittedCash = riderSettlements
    .filter((r) => !r.isSettled)
    .reduce((sum, r) => sum + (r.cashCollected || 0), 0);

  // Shift KPIs Box
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 52, doc.internal.pageSize.width - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('SHIFT REVENUE', 20, 58);
  doc.text('COMPLETED ORDERS', 70, 58);
  doc.text('TOTAL WEIGHT', 115, 58);
  doc.text('UNREMITTED COD CASH', 150, 58);

  doc.setFontSize(13);
  doc.setTextColor(...COLOR_DARK);
  doc.text(formatPeso(totalRevenue), 20, 67);
  doc.text(String(completedOrders.length), 70, 67);
  doc.text(`${totalWeight.toFixed(1)} kg`, 115, 67);

  doc.setTextColor(180, 83, 9); // Amber for unremitted cash
  doc.text(formatPeso(unremittedCash), 150, 67);

  // Section 1: Courier COD Cash Reconciliation Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Courier Fleet COD Cash Reconciliation', 14, 83);

  autoTable(doc, {
    startY: 87,
    head: [['Courier Driver', 'Contact Phone', 'Orders Delivered', 'COD Cash Collected', 'Remittance Status']],
    body: riderSettlements.map((r: any) => [
      r.riderName || 'Courier',
      r.phone || '—',
      String(r.completedCount || 0),
      formatPeso(r.cashCollected || 0),
      r.isSettled ? 'Settled & Verified ✓' : 'Pending Drawer Handover ⚠️',
    ]),
    theme: 'grid',
    headStyles: {
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

  // Section 2: Shift Orders Manifest
  const nextY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Shift Orders Manifest', 14, nextY);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Order #', 'Customer', 'Courier', 'Status', 'Weight (kg)', 'Payment', 'Total (PHP)']],
    body: orders.slice(0, 35).map((o: any) => [
      o.order_number,
      o.customer?.full_name || 'Customer',
      o.rider?.full_name || '—',
      formatOrderStatus(o.status as OrderStatus),
      o.weight_kg ? `${o.weight_kg} kg` : '—',
      (o.payment_method || 'online').toUpperCase(),
      (o.total / 100).toFixed(2),
    ]),
    theme: 'striped',
    headStyles: {
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

  // Active Queue KPIs Box
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 52, doc.internal.pageSize.width - 28, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('INTAKE SORTING', 20, 58);
  doc.text('WASHING', 60, 58);
  doc.text('TUMBLE DRYING', 95, 58);
  doc.text('FOLDING & QC', 135, 58);
  doc.text('READY DISPATCH', 170, 58);

  doc.setFontSize(12);
  doc.setTextColor(...COLOR_DARK);
  doc.text(`${inSorting} loads`, 20, 66);
  doc.text(`${inWashing} loads`, 60, 66);
  doc.text(`${inDrying} loads`, 95, 66);
  doc.text(`${inFolding} loads`, 135, 66);
  doc.text(`${readyDispatch} loads`, 170, 66);

  // Active Queue Manifest Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Live Facility Wash Queue Manifest', 14, 82);

  autoTable(doc, {
    startY: 86,
    head: [['Order Number', 'Customer', 'Current Stage', 'Intake Weight', 'Special Care / Stain Remarks', 'Pickup Address']],
    body: orders.map((o: any) => [
      o.order_number,
      o.customer?.full_name || 'Customer',
      formatOrderStatus(o.status as OrderStatus),
      o.weight_kg ? `${o.weight_kg} kg` : 'Standard Load',
      o.intake_discrepancy_note || o.special_instructions || 'Fabric-safe regular cycle',
      o.pickup_address || '—',
    ]),
    theme: 'grid',
    headStyles: {
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
