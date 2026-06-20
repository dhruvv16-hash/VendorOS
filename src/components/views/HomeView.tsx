'use client';
import React from 'react';
import { TrendingUp, ShoppingBag, Clock, Users, ArrowRight, PackageOpen, AlertTriangle } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';
import { calculateSalesSummary } from '@/packages/analytics';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
  openQRModal: () => void;
  setAdminSubTab?: (subTab: 'settings' | 'crm' | 'whatsapp' | 'analytics' | 'security') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, openQRModal, setAdminSubTab }) => {
  const { orders, customers, inventory, notifications, auditLogs, currentStore } = useVendor();

  // Aggregate stats
  const stats = calculateSalesSummary(orders, customers);
  const pendingOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const lowStockCount = inventory.filter(item => item.stock <= item.threshold).length;

  const quickActions = [
    { label: 'POS Terminal', desc: 'New Order', icon: ShoppingBag, color: 'from-[#FF6B35] to-[#FF9E79]', action: () => setActiveTab('pos') },
    { label: 'Customer Menu', desc: 'Scan QR Menu', icon: PackageOpen, color: 'from-blue-500 to-indigo-500', action: openQRModal },
    { label: 'Restock Alert', desc: `${lowStockCount} items warning`, icon: AlertTriangle, color: 'from-amber-500 to-orange-500', action: () => setActiveTab('inventory') },
    { label: 'Audits Log', desc: 'Mutation timeline', icon: Clock, color: 'from-purple-500 to-pink-500', action: () => setActiveTab('profile') }
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar pb-24">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Today <span className="gradient-text">Dashboard</span>
          </h2>
          <p className="text-xs text-muted">Real-time store stats and actions</p>
        </div>
        <div className="text-2xl p-2.5 rounded-2xl bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] shadow-lg shadow-orange-500/5 animate-float-sm flex items-center justify-center select-none">
          {currentStore?.logoUrl || '🍔'}
        </div>
      </div>


      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-2xl flex items-center gap-2.5 text-xs animate-pulse-light">
          <AlertTriangle size={18} strokeWidth={2.5} className="shrink-0" />
          <div className="flex-1">
            <span className="font-bold">{lowStockCount} raw items are critically low!</span>
            <p className="text-[10px] opacity-80 mt-0.5">Please check inventory and restock to avoid POS checkout block.</p>
          </div>
          <button onClick={() => setActiveTab('inventory')} className="text-[10px] font-bold underline shrink-0 uppercase">View</button>
        </div>
      )}

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-3 select-none">
        {/* Sales Card */}
        <div 
          onClick={() => {
            setActiveTab('profile');
            if (setAdminSubTab) setAdminSubTab('analytics');
          }}
          className="metric-card card-3d select-none hover:border-primary/40"
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today Sales</span>
            <TrendingUp size={16} className="text-primary icon-3d" />
          </div>
          <div>
            <div className="text-xl font-black mt-1">₹{stats.totalSales.toLocaleString()}</div>
            <p className="text-[10px] text-green-500 font-medium mt-0.5">Live aggregated</p>
          </div>
        </div>

        {/* Orders Card */}
        <div 
          onClick={() => setActiveTab('orders')}
          className="metric-card card-3d select-none hover:border-blue-500/40"
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag size={16} className="text-blue-500 icon-3d" />
          </div>
          <div>
            <div className="text-xl font-black mt-1">{stats.totalOrders}</div>
            <p className="text-[10px] text-blue-400 font-medium mt-0.5">Avg: ₹{stats.averageBill}</p>
          </div>
        </div>

        {/* Pending Orders */}
        <div 
          onClick={() => setActiveTab('orders')}
          className="metric-card card-3d select-none hover:border-amber-500/40"
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Prep</span>
            <Clock size={16} className="text-amber-500 icon-3d" />
          </div>
          <div>
            <div className="text-xl font-black mt-1">{pendingOrdersCount}</div>
            <p className="text-[10px] text-amber-500 font-medium mt-0.5">In kitchen queue</p>
          </div>
        </div>

        {/* Repeat Rate */}
        <div 
          onClick={() => {
            setActiveTab('profile');
            if (setAdminSubTab) setAdminSubTab('crm');
          }}
          className="metric-card card-3d select-none hover:border-purple-500/40"
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Repeat Rate</span>
            <Users size={16} className="text-purple-500 icon-3d" />
          </div>
          <div>
            <div className="text-xl font-black mt-1">{stats.repeatCustomerRate}%</div>
            <p className="text-[10px] text-purple-400 font-medium mt-0.5">{customers.length} unique profiles</p>
          </div>
        </div>
      </div>


      {/* Quick Actions Scroll horizontal */}
      <div>
        <span className="text-[10px] font-bold uppercase text-muted tracking-wider select-none">Quick Actions</span>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pt-1.5 pb-0.5">
          {quickActions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="flex-shrink-0 w-28 action-btn-3d p-3 text-left flex flex-col justify-between h-24 focus:outline-none card-3d"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white icon-3d shadow-md`}>
                  <Icon size={16} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">{item.label}</h4>
                  <p className="text-[9px] text-muted truncate mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* Recent Activity Timeline */}
      <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-4 flex-1 flex flex-col min-h-64">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1c1c1c] pb-3 select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider">Live Audit Trail</span>
          <span className="text-[10px] font-semibold text-primary">Connected Real-time</span>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3.5 max-h-72">
          {auditLogs.length === 0 ? (
            <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-10 flex flex-col items-center justify-center gap-2">
              <Clock size={24} className="opacity-50" />
              <span>No transactions submitted yet. Logs will stream here.</span>
            </div>
          ) : (
            auditLogs.slice(0, 10).map((log, index) => (
              <div key={log.id} className="flex gap-3 text-xs leading-relaxed relative pb-3 last:pb-0">
                {/* Connecting Line */}
                {index < auditLogs.slice(0, 10).length - 1 && (
                  <div className="absolute left-[3px] top-[14px] bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800" />
                )}
                {/* Glowing dot */}
                <div className="relative flex items-center justify-center w-2 h-2 mt-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white dark:border-[#0c0e16] relative z-10" />
                  <div className="absolute inset-[-4px] rounded-full bg-primary/25 animate-ping opacity-60 pointer-events-none" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-0.5">
                    <span>{log.userName} ({log.role})</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{log.details}</p>
                </div>
              </div>
            ))

          )}
        </div>
      </div>
    </div>
  );
};
