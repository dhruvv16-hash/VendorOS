export interface AnalyticOrder {
  id: string;
  total: number;
  createdAt: Date;
  customerId?: string | null;
  items: Array<{ name: string; qty: number; total: number }>;
}

export interface AnalyticCustomer {
  id: string;
  visitCount: number;
}

export interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  averageBill: number;
  repeatCustomerRate: number;
}

export interface PeakHourMetric {
  hour: number;
  formattedHour: string;
  orderCount: number;
  sales: number;
}

export interface TopProductMetric {
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesTrendPoint {
  label: string; // e.g. "Mon", "10:00"
  sales: number;
  orders: number;
}

/**
 * Computes general billing and customer aggregates
 */
export function calculateSalesSummary(
  orders: AnalyticOrder[],
  customers: AnalyticCustomer[]
): SalesSummary {
  const totalOrders = orders.length;
  if (totalOrders === 0) {
    return { totalSales: 0, totalOrders: 0, averageBill: 0, repeatCustomerRate: 0 };
  }

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const averageBill = Math.round((totalSales / totalOrders) * 100) / 100;

  // Repeat rate: customer with visitCount > 1
  const repeatCount = customers.filter(c => c.visitCount > 1).length;
  const totalCustomers = customers.length;
  const repeatCustomerRate = totalCustomers > 0 
    ? Math.round((repeatCount / totalCustomers) * 100) 
    : 0;

  return { totalSales, totalOrders, averageBill, repeatCustomerRate };
}

/**
 * Groups orders by hours to identify peak activity
 */
export function calculatePeakHours(orders: AnalyticOrder[]): PeakHourMetric[] {
  const hoursMap: Record<number, { count: number; sales: number }> = {};
  
  // Initialize map
  for (let i = 0; i < 24; i++) {
    hoursMap[i] = { count: 0, sales: 0 };
  }

  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hoursMap[hour].count += 1;
    hoursMap[hour].sales += order.total;
  });

  return Object.keys(hoursMap).map(h => {
    const hr = parseInt(h);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 === 0 ? 12 : hr % 12;
    return {
      hour: hr,
      formattedHour: `${displayHr} ${ampm}`,
      orderCount: hoursMap[hr].count,
      sales: hoursMap[hr].sales
    };
  });
}

/**
 * Aggregates order item arrays to list best sellers
 */
export function calculateTopProducts(orders: AnalyticOrder[]): TopProductMetric[] {
  const productsMap: Record<string, { qty: number; rev: number }> = {};

  orders.forEach(order => {
    order.items.forEach(item => {
      if (!productsMap[item.name]) {
        productsMap[item.name] = { qty: 0, rev: 0 };
      }
      productsMap[item.name].qty += item.qty;
      productsMap[item.name].rev += item.total;
    });
  });

  return Object.keys(productsMap)
    .map(name => ({
      name,
      quantitySold: productsMap[name].qty,
      revenue: productsMap[name].rev
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);
}

/**
 * Returns timeline statistics for a dashboard graph
 */
export function calculateSalesTrend(
  orders: AnalyticOrder[],
  timeframe: 'today' | 'week' | 'month'
): SalesTrendPoint[] {
  const now = new Date();
  
  if (timeframe === 'today') {
    // Return last 6 hours
    const points: SalesTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = d.getHours();
      const formatted = `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? 'PM' : 'AM'}`;
      
      const hourlyOrders = orders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate.getFullYear() === d.getFullYear() &&
               oDate.getMonth() === d.getMonth() &&
               oDate.getDate() === d.getDate() &&
               oDate.getHours() === hour;
      });

      points.push({
        label: formatted,
        sales: hourlyOrders.reduce((sum, o) => sum + o.total, 0),
        orders: hourlyOrders.length
      });
    }
    return points;
  }

  if (timeframe === 'week') {
    // Last 7 days
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const points: SalesTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayIndex = d.getDay();
      
      const dailyOrders = orders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate.getFullYear() === d.getFullYear() &&
               oDate.getMonth() === d.getMonth() &&
               oDate.getDate() === d.getDate();
      });

      points.push({
        label: weekdays[dayIndex],
        sales: dailyOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dailyOrders.length
      });
    }
    return points;
  }

  // default: 'month' (last 4 weeks)
  const points: SalesTrendPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const startOffset = (i + 1) * 7 * 24 * 60 * 60 * 1000;
    const endOffset = i * 7 * 24 * 60 * 60 * 1000;
    const startRange = new Date(now.getTime() - startOffset);
    const endRange = new Date(now.getTime() - endOffset);

    const weeklyOrders = orders.filter(o => {
      const oDate = new Date(o.createdAt);
      return oDate >= startRange && oDate < endRange;
    });

    points.push({
      label: `Wk -${i}`,
      sales: weeklyOrders.reduce((sum, o) => sum + o.total, 0),
      orders: weeklyOrders.length
    });
  }
  return points;
}

/**
 * Computes AI-style predictive analytics suggestions based on patterns
 */
export function generatePlatformInsights(
  orders: AnalyticOrder[],
  inventory: Array<{ name: string; stock: number; threshold: number }>
): string[] {
  const insights: string[] = [];

  // Insight 1: Inventory Alerts
  const lowItems = inventory.filter(item => item.stock <= item.threshold);
  if (lowItems.length > 0) {
    insights.push(`Stock Warning: ${lowItems.map(i => i.name).join(', ')} is below minimum. Replenish to avoid POS service block.`);
  }

  // Insight 2: Peak Hours Note
  const hourlyStats = calculatePeakHours(orders);
  const busiest = [...hourlyStats].sort((a, b) => b.orderCount - a.orderCount)[0];
  if (busiest && busiest.orderCount > 0) {
    insights.push(`Peak Demand: Busiest hours are around ${busiest.formattedHour} (${busiest.orderCount} orders). Prepare prep-stations early.`);
  }

  // Insight 3: Slow Items / Combo Opportunities
  const products = calculateTopProducts(orders);
  if (products.length >= 3) {
    const bottom = products[products.length - 1];
    const top = products[0];
    insights.push(`Combo Strategy: Sales for "${bottom.name}" are low. Try pairing it in a combo with your bestseller "${top.name}".`);
  }

  if (insights.length === 0) {
    insights.push('Analytics: Taking orders will unlock demand forecasting and stock alerts.');
  }

  return insights;
}
