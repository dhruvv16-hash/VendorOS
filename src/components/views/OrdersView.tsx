'use client';
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, Printer, AlertTriangle, Play, Check, Monitor, ArrowLeft } from 'lucide-react';
import { useVendor, Order } from '@/context/useVendorStore';
import { generateThermalReceipt } from '@/packages/billing';

export const OrdersView: React.FC = () => {
  const { orders, updateOrderStatus, storeSettings, currentStore, loadMoreOrders, hasMoreOrders } = useVendor();
  const [filter, setFilter] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [printPreviewOrder, setPrintPreviewOrder] = useState<Order | null>(null);
  
  // Bluetooth Printer states
  const [printStatus, setPrintStatus] = useState<'idle' | 'scanning' | 'connecting' | 'finding_service' | 'sending' | 'success' | 'error'>('idle');
  const [printError, setPrintError] = useState<string | null>(null);

  const handleBluetoothPrint = async (text: string) => {
    try {
      setPrintError(null);
      setPrintStatus('scanning');
      const { printReceiptBluetooth } = await import('@/packages/billing/bluetoothPrinter');
      await printReceiptBluetooth(text, (status) => {
        setPrintStatus(status.step);
      });
    } catch (err: any) {
      console.error(err);
      setPrintStatus('error');
      setPrintError(err.message || 'Bluetooth connection failed.');
    }
  };
  
  // KDS Screen Toggler
  const [isKdsMode, setIsKdsMode] = useState(false);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filter === 'active') {
      return order.status !== 'completed' && order.status !== 'cancelled';
    }
    return order.status === filter;
  });

  // Web Audio API synth chime for notifications
  const playStatusChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5 note
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio Context block:', e);
    }
  };

  const handleStatusUpdate = async (orderId: string, nextStatus: Order['status']) => {
    playStatusChime();
    await updateOrderStatus(orderId, nextStatus);
  };

  // Helper to calculate waiting time since creation
  const getWaitingTime = (createdAt: Date) => {
    const elapsedMs = new Date().getTime() - new Date(createdAt).getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    return `${minutes} min ago`;
  };

  // Format digital printable ESC/POS layout
  const thermalReceiptText = printPreviewOrder
    ? generateThermalReceipt(
        {
          name: currentStore?.name || 'VendorOS Store',
          phone: currentStore?.phone || '',
          address: 'Main Stall Location',
          gstNumber: storeSettings.gstEnabled ? '09AAAFV9876C1Z0' : undefined
        },
        {
          orderNumber: printPreviewOrder.orderNumber,
          items: printPreviewOrder.items,
          subtotal: printPreviewOrder.subtotal,
          tax: printPreviewOrder.tax,
          discount: printPreviewOrder.discount,
          total: printPreviewOrder.total,
          paymentMethod: printPreviewOrder.paymentMethod,
          createdAt: new Date(printPreviewOrder.createdAt)
        },
        {
          enabled: storeSettings.gstEnabled,
          rate: storeSettings.gstRate,
          type: storeSettings.gstType,
          cgstRate: storeSettings.gstRate / 2,
          sgstRate: storeSettings.gstRate / 2,
          igstRate: 0
        },
        storeSettings.printerType
      )
    : '';

  // Render Kitchen Display System (Fullscreen overlay)
  if (isKdsMode) {
    const kdsReceived = orders.filter(o => o.status === 'received');
    const kdsPreparing = orders.filter(o => o.status === 'preparing');
    const kdsReady = orders.filter(o => o.status === 'ready');

    return (
      <div className="absolute inset-0 bg-[#0A0A0A] text-white z-50 flex flex-col overflow-hidden select-none">
        {/* KDS Header */}
        <div className="bg-[#121212] p-4 safe-padding-top border-b border-[#1c1c1c] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsKdsMode(false)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="font-extrabold text-base leading-none">Kitchen Display System (KDS)</h1>
              <span className="text-[9px] text-[#FF6B35] uppercase font-bold tracking-wider mt-1 block">Live Screen Sync</span>
            </div>
          </div>
          <span className="text-xs bg-[#FF6B35]/15 border border-[#FF6B35]/25 text-[#FF6B35] px-3 py-1 rounded-full font-bold">
            {kdsReceived.length + kdsPreparing.length} active orders
          </span>
        </div>

        {/* KDS Main Columns Grid */}
        <div className="flex-1 grid grid-cols-3 gap-3 p-3 overflow-hidden">
          {/* Column A: Received */}
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-[24px] flex flex-col overflow-hidden">
            <div className="p-3 bg-blue-500/10 border-b border-[#1c1c1c] font-black text-xs text-blue-400 uppercase tracking-wider flex justify-between">
              <span>Received Queue</span>
              <span>({kdsReceived.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 no-scrollbar font-sans">
              {kdsReceived.map(order => (
                <div key={order.id} className="bg-[#181818] border border-[#222] p-3 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-slate-100">Order #{order.orderNumber}</h4>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{order.customerName}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{getWaitingTime(order.createdAt)}</span>
                  </div>
                  <div className="border-t border-[#222] pt-2 space-y-1 text-xs font-semibold text-slate-300">
                    {order.items.map((i, index) => (
                      <div key={index}>• {i.name} x{i.qty}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'preparing')}
                    className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-[10px] uppercase active:scale-95 transition"
                  >
                    Start Cook
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: Preparing */}
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-[24px] flex flex-col overflow-hidden">
            <div className="p-3 bg-amber-500/10 border-b border-[#1c1c1c] font-black text-xs text-amber-400 uppercase tracking-wider flex justify-between">
              <span>Preparing</span>
              <span>({kdsPreparing.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 no-scrollbar font-sans">
              {kdsPreparing.map(order => (
                <div key={order.id} className="bg-[#181818] border border-amber-500/20 p-3 rounded-2xl space-y-3.5 animate-pulse-light">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-slate-100">Order #{order.orderNumber}</h4>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{order.customerName}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{getWaitingTime(order.createdAt)}</span>
                  </div>
                  <div className="border-t border-[#222] pt-2 space-y-1 text-xs font-semibold text-slate-300">
                    {order.items.map((i, index) => (
                      <div key={index}>• {i.name} x{i.qty}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'ready')}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase active:scale-95 transition"
                  >
                    Mark Ready
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Column C: Ready */}
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-[24px] flex flex-col overflow-hidden">
            <div className="p-3 bg-green-500/10 border-b border-[#1c1c1c] font-black text-xs text-green-400 uppercase tracking-wider flex justify-between">
              <span>Ready for Pickup</span>
              <span>({kdsReady.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 no-scrollbar font-sans">
              {kdsReady.map(order => (
                <div key={order.id} className="bg-[#181818] border border-[#222] p-3 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-slate-100">Order #{order.orderNumber}</h4>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{order.customerName}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{getWaitingTime(order.createdAt)}</span>
                  </div>
                  <div className="border-t border-[#222] pt-2 space-y-1 text-xs font-semibold text-slate-300">
                    {order.items.map((i, index) => (
                      <div key={index}>• {i.name} x{i.qty}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'completed')}
                    className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-[10px] uppercase active:scale-95 transition"
                  >
                    Collected / Close
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Category Toggles for active vs complete */}
      <div className="bg-white dark:bg-[#121212] border-b border-slate-100 dark:border-[#1c1c1c] p-3 flex gap-2 shrink-0 select-none items-center">
        <div className="flex gap-2 flex-1">
          {[
            { id: 'active', label: 'Active Queue' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition ${
                filter === tab.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-slate-50 dark:bg-[#181818] text-slate-500 border border-slate-200 dark:border-[#222]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        

      </div>

      {/* Orders List Queue */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-24 no-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-xs text-muted py-20 flex flex-col items-center justify-center gap-2 select-none">
            <CheckCircle2 size={30} className="opacity-40 text-slate-400" />
            <span>No orders are present in this queue category.</span>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div 
              key={order.id}
              className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-4 flex flex-col gap-3.5 shadow-sm"
            >
              {/* Order Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">Order #{order.orderNumber}</span>
                    {order.isOfflinePending && (
                      <span className="bg-amber-500/10 text-amber-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Pending Sync
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted block mt-0.5">
                    {order.customerName} ({order.customerPhone || 'Walk-in'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary font-black">₹{order.total}</span>
                  <button 
                    onClick={() => setPrintPreviewOrder(order)}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] hover:bg-slate-100 transition"
                  >
                    <Printer size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-b border-slate-50 dark:border-[#181818]/60 py-2.5 space-y-1 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between font-medium">
                    <span className="text-slate-800 dark:text-slate-200">
                      {item.name} <span className="text-slate-400 text-[10px]">x{item.qty}</span>
                    </span>
                    {item.variantName && <span className="text-[10px] text-primary">{item.variantName}</span>}
                  </div>
                ))}
              </div>

              {/* Status Indicator / Actions */}
              <div className="flex justify-between items-center select-none">
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-500">{getWaitingTime(order.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Cancel path */}
                  {(order.status === 'received' || order.status === 'preparing') && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                      className="px-3 py-2 rounded-xl border border-red-500/10 text-red-500 text-[10px] font-bold uppercase transition active:scale-95"
                    >
                      Cancel
                    </button>
                  )}

                  {/* Actions mapping based on state */}
                  {order.status === 'received' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase transition active:scale-95"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'ready')}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase transition active:scale-95"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'completed')}
                      className="px-4 py-2 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase transition active:scale-95"
                    >
                      Mark Collected
                    </button>
                  )}

                  {/* Static status display for terminal orders */}
                  {order.status === 'completed' && (
                    <span className="text-green-500 text-[10px] font-black uppercase tracking-wider">✓ Completed</span>
                  )}
                  {order.status === 'cancelled' && (
                    <span className="text-red-500 text-[10px] font-black uppercase tracking-wider">✕ Cancelled</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {hasMoreOrders && (
          <button
            onClick={loadMoreOrders}
            className="w-full py-3 mt-4 rounded-2xl border border-dashed border-slate-200 dark:border-[#222] text-xs font-bold text-slate-500 hover:text-primary transition active:scale-95 flex items-center justify-center gap-1.5 focus:outline-none"
          >
            Load More Orders
          </button>
        )}
      </div>

      {/* Digital Thermal Print Preview Dialog Overlay */}
      {printPreviewOrder && (
        <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-[#FFFFFC] text-slate-900 border border-slate-300 w-full max-w-xs rounded-3xl p-5 shadow-2xl flex flex-col justify-between max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Print Preview ({storeSettings.printerType})</span>
              <button 
                onClick={() => {
                  setPrintPreviewOrder(null);
                  setPrintStatus('idle');
                  setPrintError(null);
                }} 
                className="text-xs font-bold text-red-500 hover:text-red-700"
              >
                Close
              </button>
            </div>

            {/* Virtual Bill Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-xs whitespace-pre bg-white p-3 border border-slate-200/60 rounded-2xl h-80 shadow-inner">
              {thermalReceiptText}
            </div>

            <button
              onClick={() => handleBluetoothPrint(thermalReceiptText)}
              disabled={printStatus === 'scanning' || printStatus === 'connecting' || printStatus === 'finding_service' || printStatus === 'sending'}
              className="mt-4 w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs shadow-lg active:scale-95 transition focus:outline-none flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Printer size={12} />
              {printStatus === 'scanning' && 'Scanning...'}
              {printStatus === 'connecting' && 'Connecting...'}
              {printStatus === 'finding_service' && 'Configuring...'}
              {printStatus === 'sending' && 'Printing...'}
              {printStatus === 'success' && 'Print Success!'}
              {printStatus === 'error' && 'Retry Print'}
              {printStatus === 'idle' && 'Print Ticket'}
            </button>
            
            {printStatus !== 'idle' && (
              <div className={`text-[8px] font-bold text-center mt-2 ${
                printStatus === 'success' ? 'text-green-650' : printStatus === 'error' ? 'text-red-500 animate-pulse' : 'text-indigo-650 animate-pulse'
              }`}>
                {printStatus === 'scanning' && 'Searching for Bluetooth printer...'}
                {printStatus === 'connecting' && 'Connecting to printer server...'}
                {printStatus === 'finding_service' && 'Locating thermal print services...'}
                {printStatus === 'sending' && 'Transmitting ESC/POS print streams...'}
                {printStatus === 'success' && '✓ Print Completed successfully!'}
                {printStatus === 'error' && `❌ ${printError || 'Printing failed.'}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
