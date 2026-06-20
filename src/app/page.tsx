'use client';
import React, { useState } from 'react';
import { DevicePreviewer } from '@/components/DevicePreviewer';
import { BottomNavigation } from '@/components/BottomNavigation';
import { HomeView } from '@/components/views/HomeView';
import { POSView } from '@/components/views/POSView';
import { OrdersView } from '@/components/views/OrdersView';
import { InventoryView } from '@/components/views/InventoryView';
import { SettingsView } from '@/components/views/SettingsView';
import { CRMView } from '@/components/views/CRMView';
import { WhatsAppView } from '@/components/views/WhatsAppView';
import { QROrderingView } from '@/components/views/QROrderingView';
import { SecurityView } from '@/components/views/SecurityView';
import { AuthView } from '@/components/views/AuthView';
import { ActivationView } from '@/components/views/ActivationView';
import { MenuWizardView } from '@/components/views/MenuWizardView';
import { useVendor } from '@/context/useVendorStore';
import { Users, FileText, Settings as IconSettings, ShieldAlert, Sparkles, BarChart2, MessageSquare, TrendingUp, ShoppingBag, ShoppingCart } from 'lucide-react';
import { calculateTopProducts, generatePlatformInsights, calculateSalesSummary } from '@/packages/analytics';
import { AIService } from '@/packages/ai';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [adminSubTab, setAdminSubTab] = useState<string>('settings');
  const [isQROpen, setIsQROpen] = useState(false);
  
  const { 
    currentStore, 
    orders, 
    inventory, 
    products, 
    createStore,
    sessionUser,
    userProfile,
    authInitialized,
    activeUser
  } = useVendor();
  const [wizardCompleted, setWizardCompleted] = useState(false);

  React.useEffect(() => {
    if (currentStore) {
      const isCompleted = localStorage.getItem(`db_wizard_completed_${currentStore.id}`) === 'true';
      if (isCompleted || products.length > 0) {
        setWizardCompleted(true);
      } else {
        setWizardCompleted(false);
      }
    }
  }, [currentStore, products]);

  const handleWizardComplete = () => {
    if (currentStore) {
      localStorage.setItem(`db_wizard_completed_${currentStore.id}`, 'true');
    }
    setWizardCompleted(true);
  };

  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreType, setNewStoreType] = useState('Fast Food');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreLogo, setNewStoreLogo] = useState('🍔');
  const [newStoreTrialDays, setNewStoreTrialDays] = useState<number | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStorePhone) {
      alert('Please fill out all fields.');
      return;
    }
    setIsInitializing(true);
    try {
      await createStore(
        newStoreName,
        newStoreType,
        newStorePhone,
        newStoreLogo,
        newStoreTrialDays
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'day' | 'week' | 'month'>('day');

  const handleQRModalToggle = () => {
    setIsQROpen(!isQROpen);
  };

  // Subscription gate check for Inventory Tab
  const renderInventoryTab = () => {
    return <InventoryView />;
  };

  // Render Admin child tabs
  const renderAdminSubTab = () => {
    switch (adminSubTab) {
      case 'crm':
        return <CRMView />;
      case 'whatsapp':
        return <WhatsAppView />;
      case 'analytics':
        // Calculate filtered statistics
        const getFilteredOrders = () => {
          const now = new Date();
          return orders.filter(o => {
            const oDate = new Date(o.createdAt);
            if (analyticsTimeframe === 'day') {
              const start = new Date(now);
              start.setHours(0, 0, 0, 0);
              return oDate >= start;
            } else if (analyticsTimeframe === 'week') {
              const start = new Date(now);
              start.setDate(now.getDate() - 7);
              return oDate >= start;
            } else {
              const start = new Date(now);
              start.setDate(now.getDate() - 30);
              return oDate >= start;
            }
          });
        };

        const filteredOrders = getFilteredOrders();
        const summary = calculateSalesSummary(filteredOrders, []);
        const topProducts = calculateTopProducts(filteredOrders);
        const insights = generatePlatformInsights(filteredOrders, inventory);
        
        // AI Predictive Analysis calculations
        const aiShortages = AIService.predictStockShortage(inventory, products, filteredOrders, 7);
        const aiDemand = AIService.forecastDemand(filteredOrders);
        const aiPromos = AIService.suggestSmartPromotions(filteredOrders, products);

        // Donut Chart calculations
        const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);
        let cumulativePercent = 0;
        const sliceColors = ['#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
        const slices = topProducts.map((prod, idx) => {
          const pct = totalRevenue > 0 ? (prod.revenue / totalRevenue) * 100 : 0;
          const start = cumulativePercent;
          cumulativePercent += pct;
          const end = cumulativePercent;
          return `${sliceColors[idx % sliceColors.length]} ${start}% ${end}%`;
        });
        const conicGradientStyle = {
          background: slices.length > 0 
            ? `conic-gradient(${slices.join(', ')})` 
            : 'conic-gradient(#334155 0% 100%)'
        };

        return (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-24 select-none">
            {/* Header with Timeframe Selector */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics</span>
                <h3 className="font-extrabold text-base">Store Analytics</h3>
              </div>
              
              {/* Selector Tabs */}
              <div className="bg-slate-100 dark:bg-[#181818] p-1 rounded-xl flex gap-1 border border-slate-200 dark:border-[#222]">
                {(['day', 'week', 'month'] as const).map(time => (
                  <button
                    key={time}
                    onClick={() => setAnalyticsTimeframe(time)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize text-[10px] transition ${
                      analyticsTimeframe === time
                        ? 'bg-white dark:bg-[#2a2a2a] text-primary shadow-sm'
                        : 'text-slate-400'
                    }`}
                  >
                    {time === 'day' ? 'Today' : time === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sales Total */}
              <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-3 rounded-2xl flex flex-col justify-between h-20">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Amount Collected</span>
                  <TrendingUp size={14} className="text-green-500" />
                </div>
                <div>
                  <div className="text-base font-black">₹{summary.totalSales.toLocaleString()}</div>
                  <p className="text-[8px] text-slate-400 font-medium">Cleared payments</p>
                </div>
              </div>

              {/* Order count */}
              <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-3 rounded-2xl flex flex-col justify-between h-20">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Total Orders</span>
                  <ShoppingBag size={14} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-base font-black">{summary.totalOrders}</div>
                  <p className="text-[8px] text-slate-400 font-medium">In selected period</p>
                </div>
              </div>

              {/* Average Bill */}
              <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-3 rounded-2xl flex flex-col justify-between h-20 col-span-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-bold uppercase tracking-wider">Average Ticket Size</span>
                  <ShoppingCart size={14} className="text-amber-500" />
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-base font-black">₹{summary.averageBill.toLocaleString()}</div>
                  <p className="text-[8px] text-slate-400 font-medium">Per order ticket</p>
                </div>
              </div>
            </div>

            {/* Sales Distribution Chart */}
            <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-4 rounded-3xl space-y-4">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Revenue Distribution</span>
              {topProducts.length === 0 ? (
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
                  No chart data available.
                </div>
              ) : (
                <div className="flex items-center justify-around gap-4 py-1">
                  {/* Conic Gradient Donut Circle */}
                  <div 
                    className="w-24 h-24 rounded-full relative flex items-center justify-center shadow-inner shrink-0"
                    style={conicGradientStyle}
                  >
                    {/* Inner cutout for Donut style */}
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-[#121212] absolute flex flex-col items-center justify-center text-center shadow-md">
                      <span className="text-[8px] font-bold uppercase text-slate-400">Total</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">₹{summary.totalSales}</span>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex-1 space-y-2 max-w-[60%]">
                    {topProducts.slice(0, 4).map((prod, idx) => {
                      const sharePct = totalRevenue > 0 ? Math.round((prod.revenue / totalRevenue) * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-[70%] truncate">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: sliceColors[idx % sliceColors.length] }}
                            ></span>
                            <span className="font-bold text-slate-600 dark:text-slate-300 truncate">{prod.name}</span>
                          </div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100">{sharePct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Most Selling Items (Data Analytics) */}
            <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-4 rounded-3xl space-y-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Most Selling Items</span>
              <div className="space-y-2">
                {topProducts.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-4">
                    No orders in this period.
                  </div>
                ) : (
                  topProducts.slice(0, 3).map((prod, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-[#181818] pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{prod.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-700 dark:text-slate-200">{prod.quantitySold} sold</span>
                        <p className="text-[8px] text-slate-400">Revenue: ₹{prod.revenue}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Predictive Forecasting Card */}
            <div className="bg-gradient-to-tr from-slate-900 to-slate-950 text-white border border-slate-800 p-4 rounded-3xl space-y-3.5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/10 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-primary animate-pulse" />
                  AI Predictive Analytics
                </span>
                <span className="bg-slate-800 text-[8px] font-bold px-2 py-0.5 rounded-full">v{AIService.version}</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-2xl">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Tomorrow Volume</span>
                  <div className="text-sm font-black text-white mt-1">~{aiDemand.tomorrowOrders} orders</div>
                  <p className="text-[8px] text-slate-400 mt-0.5">Based on 7-day average</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-2xl">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Tomorrow Revenue</span>
                  <div className="text-sm font-black text-primary mt-1">₹{aiDemand.tomorrowSales.toLocaleString()}</div>
                  <p className="text-[8px] text-slate-400 mt-0.5">Projected revenue</p>
                </div>
              </div>

              {/* Stockout Predictions */}
              <div className="border-t border-slate-800 pt-3.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Stockout Warnings & Depletion</span>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                  {aiShortages.filter(s => s.status !== 'safe').length === 0 ? (
                    <div className="text-[10px] text-slate-400 font-medium">✅ All raw ingredients stock levels projected safe for &gt;4 days.</div>
                  ) : (
                    aiShortages.filter(s => s.status !== 'safe').map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-900/30 p-2 rounded-xl border border-slate-800/40">
                        <span className="font-bold text-white">{s.name}</span>
                        <div className="text-right">
                          <span className={`font-black ${s.status === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                            {s.remainingDays <= 1 ? 'Out tomorrow!' : `Out in ${s.remainingDays} days`}
                          </span>
                          <p className="text-[8px] text-slate-400 mt-0.5">Rate: {s.depletionRatePerDay} {inventory.find(i => i.id === s.inventoryId)?.unit || 'pcs'}/day</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Smart Combo Promotion */}
              {aiPromos.length > 0 && (
                <div className="border-t border-slate-800 pt-3.5 space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">AI Combo Promotion Suggestion</span>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl text-left text-xs space-y-1.5">
                    <div className="font-bold text-white flex justify-between items-center">
                      <span>🏷️ {aiPromos[0].name}</span>
                      <span className="bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Save {aiPromos[0].discountPercent}%</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">{aiPromos[0].rationale}</p>
                    <div className="flex justify-between items-end pt-1">
                      <span className="text-[10px] font-black text-primary">Promo Price: ₹{aiPromos[0].promoPrice} <span className="text-slate-450 line-through text-[8px]">₹{aiPromos[0].originalPrice}</span></span>
                      <button 
                        onClick={() => alert(`Combo Promotion "${aiPromos[0].name}" successfully set active on customer QR menu!`)}
                        className="bg-primary text-white text-[8px] font-bold py-1.5 px-3 rounded-lg active:scale-95 transition"
                      >
                        Apply Promo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Demand Warnings / Insights */}
            <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-4 rounded-3xl space-y-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Demand Insights & Alerts</span>
              <div className="space-y-2 text-xs font-semibold">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl ${
                      insight.includes('Warning')
                        ? 'bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-primary/5 border border-primary/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {insight.includes('Warning') ? '⚠️ ' : '⚡ '}
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'security':
        return <SecurityView />;
      default:
        return <SettingsView />;
    }
  };

  const renderProfileTab = () => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Horizontal Sub-tabs for CRM, WhatsApp logs, Analytics, Settings */}
        <div className="bg-white dark:bg-[#121212] border-b border-slate-100 dark:border-[#1c1c1c] p-2 flex gap-1 justify-around shrink-0 select-none">
          {[
            { id: 'settings', label: 'Taxes', icon: IconSettings },
            { id: 'crm', label: 'CRM', icon: Users },
            { id: 'whatsapp', label: 'Alerts', icon: MessageSquare },
            { id: 'analytics', label: 'Charts', icon: BarChart2 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminSubTab(tab.id as any)}
                className={`flex-1 py-1.5 rounded-xl text-[10px] font-extrabold uppercase flex flex-col items-center justify-center gap-1 transition ${
                  adminSubTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/10'
                    : 'text-slate-400 dark:text-slate-500 border border-transparent'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View render */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderAdminSubTab()}
        </div>
      </div>
    );
  };

  const renderActiveTabContent = () => {
    if (currentStore && !wizardCompleted) {
      return <MenuWizardView onComplete={handleWizardComplete} />;
    }
    switch (activeTab) {
      case 'pos':
        return <POSView />;
      case 'orders':
        return <OrdersView />;
      case 'inventory':
        return renderInventoryTab();
      case 'profile':
        return renderProfileTab();
      default:
        return <HomeView setActiveTab={setActiveTab} openQRModal={handleQRModalToggle} setAdminSubTab={setAdminSubTab} />;
    }
  };

  const isLicenseExpired = currentStore?.licenseExpiresAt 
    ? new Date() > new Date(currentStore.licenseExpiresAt) 
    : false;
  const isDeactivated = (currentStore?.isActive === false || isLicenseExpired) && activeUser?.role !== 'SUPER_ADMIN';

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-bold">Initializing VendorOS Environment...</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <DevicePreviewer activeTab="auth" setActiveTab={() => {}} openQRModal={() => {}}>
        <AuthView />
      </DevicePreviewer>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-bold">Loading User Profile...</p>
        </div>
      </div>
    );
  }

  if (!currentStore) {
    return (
      <DevicePreviewer activeTab="onboarding" setActiveTab={() => {}} openQRModal={() => {}}>
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-center bg-[#121212] text-white no-scrollbar select-none">
          <div className="text-center space-y-2 mb-6">
            <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-3 py-1 rounded-full">System Provisioning</span>
            <h2 className="text-2xl font-black mt-2 tracking-tight">Configure StoreOS</h2>
            <p className="text-xs text-slate-400">Initialize a clean instance for your food stall or vendor.</p>
          </div>

          <form onSubmit={handleCreateStore} className="space-y-4">
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Stall / Store Name</label>
              <input 
                type="text" 
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
                placeholder="e.g. My Burger Cart"
                className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary placeholder:text-slate-650"
                required
              />
            </div>

            {/* Business Type */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Business Category</label>
              <select 
                value={newStoreType}
                onChange={e => setNewStoreType(e.target.value)}
                className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary"
              >
                <option value="Fast Food">Fast Food & Burgers</option>
                <option value="Beverages">Beverages & Chai</option>
                <option value="Bakery">Bakery & Pastries</option>
                <option value="Pizza & Pasta">Pizza & Pasta</option>
                <option value="Cafe">Cafe & Coffee</option>
                <option value="Desserts">Ice Cream & Desserts</option>
                <option value="Other">Other Food Stall</option>
              </select>
            </div>

            {/* Contact Number */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Vendor Contact Number (WhatsApp)</label>
              <input 
                type="tel" 
                value={newStorePhone}
                onChange={e => setNewStorePhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary placeholder:text-slate-650"
                required
              />
            </div>

            {/* Emoji Logo Picker */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Select Stall Logo/Emoji</label>
              <div className="grid grid-cols-8 gap-2 bg-[#181818] p-2.5 rounded-xl border border-slate-800">
                {['🍔', '☕', '🍕', '🍰', '🌮', '🌭', '🍦', '🥤'].map(emoji => (
                  <button 
                    key={emoji}
                    type="button"
                    onClick={() => setNewStoreLogo(emoji)}
                    className={`text-lg p-1.5 rounded-lg transition active:scale-95 ${
                      newStoreLogo === emoji ? 'bg-primary/20 border border-primary/40' : 'bg-transparent border border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Trial Duration / Expiration Setup */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Trial / License Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Unlimited', value: undefined },
                  { label: '7 Days Trial', value: 7 },
                  { label: '30 Days Trial', value: 30 }
                ].map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewStoreTrialDays(option.value)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition active:scale-95 ${
                      newStoreTrialDays === option.value 
                        ? 'bg-primary text-white' 
                        : 'bg-[#181818] border border-slate-800 text-slate-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="submit"
              disabled={isInitializing}
              className="w-full py-3 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-extrabold text-xs shadow-md shadow-orange-500/10 active:scale-[0.98] transition focus:outline-none mt-2 disabled:opacity-50"
            >
              {isInitializing ? 'Provisioning Environment...' : 'Initialize StallOS ⚡'}
            </button>
          </form>
        </div>
      </DevicePreviewer>
    );
  }

  if (isDeactivated) {
    return (
      <DevicePreviewer activeTab="suspended" setActiveTab={() => {}} openQRModal={() => {}}>
        <div className="flex-1 px-6 py-10 flex flex-col justify-center items-center text-center bg-[#121212] text-white space-y-6 select-none">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
            <ShieldAlert size={36} className="animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-400 px-3 py-1 rounded-full tracking-wider">Access Blocked</span>
            <h3 className="text-xl font-black mt-2 text-white">StallOS License Expired</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
              The operational license for **&quot;{currentStore.name}&quot;** has expired or has been suspended by the administrator.
            </p>
          </div>

          <div className="p-4 bg-[#181818] rounded-2xl border border-slate-800 text-left text-[11px] space-y-2 max-w-xs text-slate-400 font-medium">
            <div className="font-bold text-white mb-1">Details:</div>
            <div>• Store Status: <span className="text-red-400 font-bold">Suspended</span></div>
            {currentStore.licenseExpiresAt && (
              <div>• License Expiry: <span className="text-slate-300 font-mono font-bold">{new Date(currentStore.licenseExpiresAt).toLocaleDateString()}</span></div>
            )}
            <div>• Database Host: <span className="text-slate-300 font-mono font-bold">Supabase Secure Node</span></div>
          </div>

          <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
            To reactivate access, request the system administrator to toggle the store status or extend the license timestamp.
          </p>

          <button
            onClick={() => alert('Access status is managed remotely inside your Supabase stores table.')}
            className="w-full max-w-xs py-3 rounded-2xl bg-slate-800 text-white font-extrabold text-xs shadow-md active:scale-95 transition focus:outline-none"
          >
            Contact Administrator
          </button>
        </div>
      </DevicePreviewer>
    );
  }

  return (
    <DevicePreviewer 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      openQRModal={handleQRModalToggle}
    >
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Main Render View */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderActiveTabContent()}
        </div>

        {/* Sticky bottom nav */}
        {!(currentStore && !wizardCompleted) && (
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* Guest Scan QR Modal Menu Simulator overlay */}
        {isQROpen && (
          <QROrderingView onClose={handleQRModalToggle} />
        )}
      </div>
    </DevicePreviewer>
  );
}
