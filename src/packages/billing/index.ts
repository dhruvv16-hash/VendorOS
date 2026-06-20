export interface TaxConfig {
  enabled: boolean;
  rate: number; // percentage, e.g. 5, 12, 18
  type: 'inclusive' | 'exclusive';
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}

export interface BillingOrderItem {
  name: string;
  variantName?: string;
  qty: number;
  price: number;
  total: number;
}

export interface BillingOrder {
  orderNumber: string;
  items: BillingOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  createdAt: Date;
}

export interface BillingStore {
  name: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
}

/**
 * Calculates GST based on config
 */
export function calculateGST(
  subtotal: number,
  config: TaxConfig
): { taxAmount: number; cgst: number; sgst: number; igst: number; netTotal: number } {
  if (!config.enabled || config.rate <= 0) {
    return { taxAmount: 0, cgst: 0, sgst: 0, igst: 0, netTotal: subtotal };
  }

  let taxAmount = 0;
  let netTotal = subtotal;

  if (config.type === 'inclusive') {
    // subtotal is the customer price containing tax
    taxAmount = subtotal - subtotal / (1 + config.rate / 100);
    // netTotal remains the customer price (subtotal)
  } else {
    // subtotal excludes tax
    taxAmount = subtotal * (config.rate / 100);
    netTotal = subtotal + taxAmount;
  }

  // Round values
  taxAmount = Math.round(taxAmount * 100) / 100;
  netTotal = Math.round(netTotal * 100) / 100;

  // Split CGST and SGST (usually 50% split in India for local SGST/CGST)
  const cgst = Math.round((taxAmount / 2) * 100) / 100;
  const sgst = Math.round((taxAmount / 2) * 100) / 100;
  const igst = 0; // default for local sales

  return { taxAmount, cgst, sgst, igst, netTotal };
}

/**
 * Generate UPI Deep Link for customer direct payment (scannable QR)
 */
export function generateUPIDeepLink(
  upiId: string,
  merchantName: string,
  amount: number,
  transactionNote: string
): string {
  const encodedName = encodeURIComponent(merchantName);
  const encodedNote = encodeURIComponent(transactionNote);
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount.toFixed(2)}&tn=${encodedNote}&cu=INR`;
}

/**
 * Generate ESC/POS receipt for thermal printer output
 */
export function generateThermalReceipt(
  store: BillingStore,
  order: BillingOrder,
  config: TaxConfig,
  printerType: 'thermal-58mm' | 'thermal-80mm' = 'thermal-58mm'
): string {
  const lineCharWidth = printerType === 'thermal-58mm' ? 32 : 48;
  const separator = '-'.repeat(lineCharWidth);
  const doubleSeparator = '='.repeat(lineCharWidth);

  const lines: string[] = [];

  // Helper to center text
  const centerText = (text: string) => {
    if (text.length >= lineCharWidth) return text.substring(0, lineCharWidth);
    const leftPad = Math.floor((lineCharWidth - text.length) / 2);
    return ' '.repeat(leftPad) + text;
  };

  // Helper to format item row: Burger x2               160.00
  const formatItemRow = (name: string, qty: number, total: number) => {
    const qtyText = ` x${qty}`;
    const nameWithQty = name.substring(0, lineCharWidth - 12) + qtyText;
    const priceText = total.toFixed(2);
    const spaces = lineCharWidth - nameWithQty.length - priceText.length;
    return nameWithQty + ' '.repeat(Math.max(1, spaces)) + priceText;
  };

  // Helper to format total row: Subtotal                 160.00
  const formatSummaryRow = (label: string, val: number) => {
    const priceText = val.toFixed(2);
    const spaces = lineCharWidth - label.length - priceText.length;
    return label + ' '.repeat(Math.max(1, spaces)) + priceText;
  };

  // Receipt Content
  lines.push(centerText('*** RECEIPT ***'));
  lines.push(centerText(store.name.toUpperCase()));
  if (store.address) lines.push(centerText(store.address));
  if (store.phone) lines.push(centerText(`Phone: ${store.phone}`));
  if (store.gstNumber) lines.push(centerText(`GSTIN: ${store.gstNumber}`));
  lines.push(separator);

  lines.push(`Order: #${order.orderNumber}`);
  lines.push(`Date: ${order.createdAt.toLocaleString()}`);
  lines.push(`Pay Mode: ${order.paymentMethod.toUpperCase()}`);
  lines.push(doubleSeparator);

  // Items
  order.items.forEach(item => {
    lines.push(formatItemRow(item.name, item.qty, item.total));
    if (item.variantName) {
      lines.push(`  (${item.variantName})`);
    }
  });
  lines.push(separator);

  // Summary
  const invoiceSubtotal = config.enabled && config.type === 'inclusive' 
    ? order.subtotal - order.tax 
    : order.subtotal;
  lines.push(formatSummaryRow('Subtotal:', invoiceSubtotal));
  if (order.discount > 0) {
    lines.push(formatSummaryRow('Discount:', -order.discount));
  }

  // Tax Breakdown
  if (config.enabled && order.tax > 0) {
    const { cgst, sgst } = calculateGST(order.subtotal - order.discount, config);
    lines.push(formatSummaryRow(`CGST (${config.rate / 2}%):`, cgst));
    lines.push(formatSummaryRow(`SGST (${config.rate / 2}%):`, sgst));
  }

  lines.push(doubleSeparator);
  lines.push(formatSummaryRow('GRAND TOTAL:', order.total));
  lines.push(doubleSeparator);

  lines.push(centerText('Thank You! Visit Again.'));
  lines.push(centerText('Powered by VendorOS'));
  lines.push('\n\n\n'); // Paper feed space

  return lines.join('\n');
}

/**
 * Mock Razorpay Payment Initialization
 */
export async function initializeRazorpayPayment(options: {
  amount: number;
  orderId: string;
  storeName: string;
  customerPhone?: string;
  customerEmail?: string;
}): Promise<{ success: boolean; transactionId: string }> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    success: true,
    transactionId: 'pay_' + Math.random().toString(36).substring(2, 11).toUpperCase()
  };
}
