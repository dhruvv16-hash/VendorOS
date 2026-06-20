/**
 * VendorOS AI Services Module
 * Activated: Algorithmic forecasting, stockout predictions, and dynamic combo recommender.
 */

export interface AIInventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  threshold: number;
}

export interface AIProduct {
  id: string;
  name: string;
  price: number;
  ingredients?: Array<{ inventoryId: string; qty: number }>;
}

export interface AIOrder {
  createdAt: Date;
  items: Array<{ name: string; qty: number; total: number }>;
  total: number;
}

export const AIService = {
  isAvailable: true,
  version: '1.0.0-release',

  /**
   * Projects remaining stock days based on daily depletion velocity over a defined historical window.
   */
  predictStockShortage: (
    inventory: AIInventoryItem[],
    products: AIProduct[],
    orders: AIOrder[],
    daysWindow: number = 7
  ): Array<{ inventoryId: string; name: string; remainingDays: number; depletionRatePerDay: number; status: 'critical' | 'warning' | 'safe' }> => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);
    const windowOrders = orders.filter(o => new Date(o.createdAt) >= cutoffDate);

    // 1. Calculate ingredient depletion velocity (total depleted quantity in the window)
    const ingredientDepletedSums: Record<string, number> = {};
    windowOrders.forEach(order => {
      order.items.forEach(item => {
        const product = products.find(p => p.name === item.name);
        if (product && product.ingredients) {
          product.ingredients.forEach(recipe => {
            const totalQty = recipe.qty * item.qty;
            ingredientDepletedSums[recipe.inventoryId] = (ingredientDepletedSums[recipe.inventoryId] || 0) + totalQty;
          });
        }
      });
    });

    // 2. Project remaining days for each inventory item
    const daysDivider = windowOrders.length > 0 ? daysWindow : 1;
    return inventory.map(item => {
      const totalDepleted = ingredientDepletedSums[item.id] || 0;
      const depletionRatePerDay = Math.round((totalDepleted / daysDivider) * 100) / 100;
      
      let remainingDays = 999; // Assume safe if depletion is 0
      let status: 'critical' | 'warning' | 'safe' = 'safe';

      if (depletionRatePerDay > 0) {
        remainingDays = Math.round((item.stock / depletionRatePerDay) * 10) / 10;
        if (remainingDays <= 1.5) {
          status = 'critical';
        } else if (remainingDays <= 4.0) {
          status = 'warning';
        }
      }

      return {
        inventoryId: item.id,
        name: item.name,
        remainingDays,
        depletionRatePerDay,
        status
      };
    });
  },

  /**
   * Forecasts tomorrow's expected orders & revenue using moving averages.
   */
  forecastDemand: (
    orders: AIOrder[],
    windows: { short: number; long: number } = { short: 7, long: 30 }
  ): { 
    tomorrowOrders: number; 
    tomorrowSales: number; 
    shortTermAvgOrders: number; 
    longTermAvgOrders: number; 
    trendPercent: number 
  } => {
    const now = new Date();
    
    const getAvgForWindow = (days: number) => {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const windowOrders = orders.filter(o => new Date(o.createdAt) >= cutoff);
      const totalSales = windowOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        avgOrders: Math.round((windowOrders.length / days) * 10) / 10,
        avgSales: Math.round((totalSales / days) * 100) / 100
      };
    };

    const shortAvg = getAvgForWindow(windows.short);
    const longAvg = getAvgForWindow(windows.long);

    // Trend calculation
    const trendPercent = longAvg.avgOrders > 0 
      ? Math.round(((shortAvg.avgOrders - longAvg.avgOrders) / longAvg.avgOrders) * 100)
      : 0;

    // Tomorrow's projections based on short-term average
    const tomorrowOrders = Math.max(1, Math.round(shortAvg.avgOrders));
    const tomorrowSales = Math.max(100, Math.round(shortAvg.avgSales));

    return {
      tomorrowOrders,
      tomorrowSales,
      shortTermAvgOrders: shortAvg.avgOrders,
      longTermAvgOrders: longAvg.avgOrders,
      trendPercent
    };
  },

  /**
   * Scans order histories to find slow-moving items and suggests bundles with topbest sellers.
   */
  suggestSmartPromotions: (
    orders: AIOrder[],
    products: AIProduct[]
  ): Array<{ 
    name: string; 
    rationale: string; 
    originalPrice: number; 
    promoPrice: number; 
    discountPercent: number 
  }> => {
    if (products.length < 2 || orders.length < 2) return [];

    // Count product velocity
    const salesCounts: Record<string, number> = {};
    products.forEach(p => { salesCounts[p.name] = 0; });

    orders.forEach(order => {
      order.items.forEach(item => {
        if (salesCounts[item.name] !== undefined) {
          salesCounts[item.name] += item.qty;
        }
      });
    });

    const sortedProducts = [...products].sort((a, b) => (salesCounts[a.name] || 0) - (salesCounts[b.name] || 0));
    
    // Find a slow seller and a bestseller
    const slowSeller = sortedProducts[0];
    const bestSeller = sortedProducts[sortedProducts.length - 1];

    if (!slowSeller || !bestSeller || slowSeller.id === bestSeller.id) return [];

    const originalPrice = slowSeller.price + bestSeller.price;
    const discountPercent = 15; // 15% discount
    const promoPrice = Math.round(originalPrice * (1 - discountPercent / 100));

    return [
      {
        name: `${bestSeller.name} & ${slowSeller.name} Combo`,
        rationale: `Boost interest in "${slowSeller.name}" (${salesCounts[slowSeller.name] || 0} sold) by bundling it at 15% off with bestseller "${bestSeller.name}" (${salesCounts[bestSeller.name] || 0} sold).`,
        originalPrice,
        promoPrice,
        discountPercent
      }
    ];
  }
};

export default AIService;
