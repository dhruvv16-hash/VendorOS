'use client';
import React, { useState, useMemo } from 'react';
import { QrCode, ArrowLeft, ShoppingCart, Plus, Minus, Check, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';
import { calculateGST } from '@/packages/billing';
import { SafeImage } from '@/components/SafeImage';

interface QROrderingViewProps {
  onClose: () => void;
}

export const QROrderingView: React.FC<QROrderingViewProps> = ({ onClose }) => {
  const { products, categories, createOrder, orders, storeSettings, currentStore } = useVendor();
  
  // States
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<Array<{ id: string; name: string; qty: number; price: number; total: number }>>([]);
  const [step, setStep] = useState<'menu' | 'cart' | 'checkout' | 'payment' | 'tracking'>('menu');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Track placed order status
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // Active tracking order data
  const trackingOrder = useMemo(() => {
    if (!placedOrderId) return null;
    return orders.find(o => o.id === placedOrderId) || null;
  }, [placedOrderId, orders]);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxDetails = useMemo(() => {
    const config = {
      enabled: storeSettings.gstEnabled,
      rate: storeSettings.gstRate,
      type: storeSettings.gstType,
      cgstRate: storeSettings.gstRate / 2,
      sgstRate: storeSettings.gstRate / 2,
      igstRate: 0
    };
    return calculateGST(subtotal, config);
  }, [subtotal, storeSettings]);

  const displayedSubtotal = storeSettings.gstEnabled && storeSettings.gstType === 'inclusive'
    ? subtotal - taxDetails.taxAmount
    : subtotal;

  const grandTotal = taxDetails.netTotal;
  const tax = taxDetails.taxAmount;

  const handleAddToCart = (product: any) => {
    setCart(prev => {
      const match = prev.find(item => item.id === product.id);
      if (match) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * product.price }
            : item
        );
      } else {
        return [...prev, { id: product.id, name: product.name, qty: 1, price: product.price, total: product.price }];
      }
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const next = item.qty + delta;
          if (next <= 0) return null;
          return { ...item, qty: next, total: next * item.price };
        }
        return item;
      }).filter(Boolean) as any[];
    });
  };

  const handlePayAndSubmit = async () => {
    if (!customerName || !customerPhone) return;
    setStep('payment');
    
    // Simulate Razorpay latency
    setTimeout(async () => {
      try {
        const order = await createOrder({
          customerName,
          customerPhone,
          items: cart.map(item => ({
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            productId: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price,
            total: item.total
          })),
          paymentMethod: 'upi',
          paymentStatus: 'paid',
          subtotal,
          tax,
          discount: 0,
          total: grandTotal
        });

        setPlacedOrderId(order.id);
        setCart([]);
        setStep('tracking');
      } catch (err) {
        console.error(err);
      }
    }, 2000);
  };

  return (
    <div className="absolute inset-0 bg-slate-50 dark:bg-[#0c0c0c] z-50 flex flex-col overflow-hidden select-none">
      {/* Top Navbar */}
      <div className="bg-[#FF6B35] text-white p-4 safe-padding-top flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          {step !== 'menu' && step !== 'tracking' && (
            <button 
              onClick={() => {
                if (step === 'cart') setStep('menu');
                if (step === 'checkout') setStep('cart');
              }}
              className="p-1 rounded-full hover:bg-black/10"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="font-extrabold text-sm">{currentStore?.name || 'Self-Service QR Menu'}</span>
        </div>
        <button 
          onClick={onClose}
          className="text-xs bg-black/10 px-3 py-1 rounded-full font-bold"
        >
          Exit Scan
        </button>
      </div>

      {/* Menu Listing Step */}
      {step === 'menu' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Categories Scroll bar */}
          <div className="py-2.5 px-3 bg-white dark:bg-[#121212] border-b border-slate-100 dark:border-[#1c1c1c] flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                activeCategory === 'All'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-[#181818] text-slate-500 border border-slate-200 dark:border-[#222]'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                  activeCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-[#181818] text-slate-500 border border-slate-200 dark:border-[#222]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-24 no-scrollbar">
            {products.filter(p => activeCategory === 'All' || p.category === activeCategory).map(p => (
              <div 
                key={p.id}
                className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-3 flex gap-3 shadow-sm select-none"
              >
                {/* Product image */}
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#181818] overflow-hidden shrink-0">
                  <SafeImage 
                    src={p.image} 
                    alt={p.name} 
                    className="w-full h-full object-cover" 
                    fallback={
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 select-none">{p.name.charAt(0)}</div>
                    }
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs truncate leading-snug">{p.name}</h4>
                    <p className="text-[9px] text-muted truncate mt-0.5">{p.description || 'Fresh ingredient food'}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-black text-xs text-primary">₹{p.price}</span>
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="py-1.5 px-3 rounded-lg bg-primary text-white font-bold text-[10px] hover:bg-orange-600 active:scale-95 transition focus:outline-none"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Checkout Bar */}
          {cart.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-slate-100 dark:border-[#1c1c1c] p-4 safe-padding-bottom flex justify-between items-center min-h-16 h-auto shrink-0 z-40">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-primary" size={18} />
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">{cart.reduce((s, i) => s + i.qty, 0)} Items</span>
              </div>
              <button
                onClick={() => setStep('cart')}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition focus:outline-none"
              >
                Go to Cart
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cart Review Step */}
      {step === 'cart' && (
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5 select-none">
            <h3 className="font-black text-base">Your Cart</h3>
            <span className="text-xs text-muted">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center gap-3 border-b border-slate-100 dark:border-[#1c1c1c] pb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-xs leading-none">{item.name}</h4>
                  <span className="text-[10px] text-muted block mt-1">₹{item.price}</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#181818] p-1 rounded-xl border border-slate-200 dark:border-[#222]">
                  <button onClick={() => handleUpdateQty(item.id, -1)} className="w-5 h-5 rounded-lg bg-white dark:bg-[#202020] flex items-center justify-center hover:bg-slate-100"><Minus size={10} /></button>
                  <span className="text-[10px] font-black min-w-4 text-center">{item.qty}</span>
                  <button onClick={() => handleUpdateQty(item.id, 1)} className="w-5 h-5 rounded-lg bg-white dark:bg-[#202020] flex items-center justify-center hover:bg-slate-100"><Plus size={10} /></button>
                </div>
                <span className="font-black text-xs min-w-14 text-right">₹{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Pricing block & checkout redirect */}
          <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-4 rounded-3xl space-y-2 text-xs">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{displayedSubtotal.toFixed(2)}</span></div>
            {storeSettings.gstEnabled && <div className="flex justify-between"><span>GST ({storeSettings.gstRate}% {storeSettings.gstType}):</span><span>₹{tax.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm font-black text-slate-800 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-[#1c1c1c]">
              <span>Grand Total:</span><span className="text-primary">₹{grandTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setStep('checkout')}
              className="w-full mt-3 py-2.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-md shadow-orange-500/10 active:scale-95 transition focus:outline-none"
            >
              Enter Customer Details
            </button>
          </div>
        </div>
      )}

      {/* Checkout Step */}
      {step === 'checkout' && (
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-200/50 pb-2 select-none">
              <h3 className="font-black text-base">Guest Contact</h3>
              <p className="text-[10px] text-muted">To receive live WhatsApp updates on your prep status</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Your Name</label>
                <input
                  type="text"
                  placeholder="Dhruv"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] py-2.5 px-3.5 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value.replace(/[^\d+]/g, '').substring(0, 15))}
                  className="w-full text-xs bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] py-2.5 px-3.5 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              disabled={!customerName || !customerPhone}
              onClick={handlePayAndSubmit}
              className="w-full py-3 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-md shadow-orange-500/10 active:scale-95 disabled:opacity-50 transition focus:outline-none flex items-center justify-center gap-1.5"
            >
              <span>Pay ₹{grandTotal.toFixed(2)} via UPI</span>
            </button>
          </div>
        </div>
      )}

      {/* Simulated Razorpay Checkout screen */}
      {step === 'payment' && (
        <div className="flex-1 bg-[#1a202c] text-white p-6 flex flex-col justify-between relative select-none">
          <div className="space-y-6 text-center pt-8">
            <div className="text-xs uppercase tracking-widest text-[#5e69e0] font-bold flex items-center justify-center gap-1.5">
              <Sparkles size={14} />
              <span>Razorpay Checkout</span>
            </div>
            
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-2xl animate-spin-slow">
              🔄
            </div>

            <div>
              <h3 className="font-extrabold text-base">Processing Sandbox Payment</h3>
              <p className="text-[10px] text-slate-400 mt-1">Connecting to UPI Payment Provider...</p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/40 text-xs inline-block mx-auto min-w-48">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Grand Amount</span>
              <span className="text-xl font-black text-primary block mt-0.5">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center leading-normal max-w-xs mx-auto">
            This is a mock payment sandbox. It will automatically authorize, generate the store invoice log, deduct inventory, and forward notifications.
          </div>
        </div>
      )}

      {/* Customer Tracking Step (Supabase Realtime Sync Simulator) */}
      {step === 'tracking' && trackingOrder && (
        <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            <div className="text-center bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] p-4 rounded-3xl shadow-sm">
              <span className="text-[9px] uppercase font-bold text-primary tracking-wider">Ticket Number</span>
              <h3 className="text-2xl font-black mt-1">#{trackingOrder.orderNumber}</h3>
              
              {/* Status color-coded badge */}
              <span className={`inline-block text-[10px] px-3 py-0.5 rounded-full font-bold uppercase mt-2 ${
                trackingOrder.status === 'ready' 
                  ? 'bg-amber-500/10 text-amber-500' 
                  : trackingOrder.status === 'completed' 
                  ? 'bg-green-500/10 text-green-500'
                  : trackingOrder.status === 'cancelled'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-blue-500/10 text-blue-500 animate-pulse'
              }`}>
                {trackingOrder.status.toUpperCase()}
              </span>
            </div>

            {/* Preparation Steps timeline */}
            <div className="space-y-4 px-3.5 select-none relative">
              {/* Vertical line connector */}
              <div className="absolute top-4 left-6 w-0.5 bg-slate-200 dark:bg-[#222] bottom-4 z-0"></div>

              {[
                { key: 'received', label: 'Order Received', desc: 'Vendor confirmed ticket' },
                { key: 'preparing', label: 'Preparing Food', desc: 'Cook is preparing ingredients' },
                { key: 'ready', label: 'Ready for Pickup', desc: 'Collect items at counter' },
                { key: 'completed', label: 'Completed', desc: 'Thank you for visiting!' }
              ].map((timelineStep, idx) => {
                const orderStates = ['received', 'preparing', 'ready', 'completed'];
                const currentIdx = orderStates.indexOf(trackingOrder.status);
                const stepIdx = orderStates.indexOf(timelineStep.key);
                
                const isPassed = stepIdx <= currentIdx && trackingOrder.status !== 'cancelled';
                const isActive = stepIdx === currentIdx && trackingOrder.status !== 'cancelled';

                return (
                  <div key={timelineStep.key} className="flex gap-4 relative z-10 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${
                      isPassed 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-[#222] text-slate-400'
                    }`}>
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <div>
                      <h4 className={`font-bold ${isActive ? 'text-primary' : isPassed ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                        {timelineStep.label}
                      </h4>
                      <p className="text-[9px] text-muted mt-0.5">{timelineStep.desc}</p>
                    </div>
                  </div>
                );
              })}

              {trackingOrder.status === 'cancelled' && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-2xl flex items-center gap-2 text-xs">
                  <AlertCircle size={16} />
                  <span>Your order has been cancelled by vendor. Refund is processing.</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center space-y-3">
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              Keep this screen open. It syncs with the kitchen queue in real-time. You will receive a WhatsApp message when ready.
            </p>
            <button
              onClick={() => {
                setPlacedOrderId(null);
                setStep('menu');
              }}
              className="py-2.5 px-6 rounded-xl border border-slate-200 dark:border-[#222] text-xs font-semibold hover:bg-slate-50 transition"
            >
              Order Something Else
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
