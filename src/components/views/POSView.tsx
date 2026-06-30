'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, UserPlus, Receipt, CreditCard, Wallet, Sparkles, CheckCircle2, ChevronUp, ChevronDown, Check, QrCode } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';
import { calculateGST, generateUPIDeepLink, TaxConfig, generateThermalReceipt } from '@/packages/billing';
import confetti from 'canvas-confetti';
import { SafeImage } from '@/components/SafeImage';

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  variantName?: string;
  addons?: Array<{ name: string; price: number }>;
}

export const POSView: React.FC = () => {
  const { 
    products, 
    categories, 
    customers, 
    createOrder, 
    storeSettings, 
    currentStore,
    isOffline,
    orders
  } = useVendor();

  const ordersCount = orders?.length || 0;

  // POS State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  
  // Checkout overlay states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [activePaymentModal, setActivePaymentModal] = useState<'none' | 'upi'>('none');
  
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
  
  // Loyalty redemption state
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [customerPointsAvailable, setCustomerPointsAvailable] = useState(0);

  // Auto customer lookup by phone
  useEffect(() => {
    if (customerPhone.length >= 10) {
      const match = customers.find(c => c.phone.includes(customerPhone) || customerPhone.includes(c.phone));
      if (match) {
        setCustomerName(match.name);
        setCustomerPointsAvailable(match.loyaltyPoints);
      }
    } else {
      setCustomerPointsAvailable(0);
    }
  }, [customerPhone, customers]);

  // Reset checkout loyalty points toggle if customer details are cleared
  useEffect(() => {
    if (!customerPhone) {
      setRedeemPoints(false);
    }
  }, [customerPhone]);

  // Product Filter
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCat && p.available;
    });
  }, [products, searchQuery, activeCategory]);

  // Add Item to Cart
  const handleAddToCart = (product: any, variant?: any, selectedAddons?: any[]) => {
    const productId = variant ? `${product.id}-${variant.name}` : product.id;
    const price = variant ? variant.price : product.price;
    const variantName = variant ? variant.name : undefined;
    
    // Calculate addons price
    const addonsPrice = selectedAddons ? selectedAddons.reduce((sum, a) => sum + a.price, 0) : 0;
    const finalPrice = price + addonsPrice;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === productId);
      if (existing) {
        return prevCart.map(item => 
          item.productId === productId 
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * finalPrice }
            : item
        );
      } else {
        return [...prevCart, {
          productId,
          name: product.name,
          qty: 1,
          price: finalPrice,
          total: finalPrice,
          variantName,
          addons: selectedAddons
        }];
      }
    });
    
    // Play quick tap buzz
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Modify quantity
  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          return { ...item, qty: nextQty, total: nextQty * item.price };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  // Calculate Loyalty deduction (1 point = ₹1, up to the cart total or points limit)
  const loyaltyDiscount = useMemo(() => {
    if (!redeemPoints || customerPointsAvailable <= 0) return 0;
    return Math.min(customerPointsAvailable, cartSubtotal);
  }, [redeemPoints, customerPointsAvailable, cartSubtotal]);

  const taxDetails = useMemo(() => {
    const netTotalForTax = cartSubtotal - loyaltyDiscount;
    const config: TaxConfig = {
      enabled: storeSettings.gstEnabled,
      rate: storeSettings.gstRate,
      type: storeSettings.gstType,
      cgstRate: storeSettings.gstRate / 2,
      sgstRate: storeSettings.gstRate / 2,
      igstRate: 0
    };
    return calculateGST(netTotalForTax, config);
  }, [cartSubtotal, loyaltyDiscount, storeSettings]);

  const cartGrandTotal = useMemo(() => {
    return taxDetails.netTotal;
  }, [taxDetails]);

  // Confirm Order Checkout
  const handleCheckout = async (forcedStatus?: 'paid' | 'pending') => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const order = await createOrder({
        customerName: customerName || 'Guest Customer',
        customerPhone: customerPhone || undefined,
        items: cart.map(item => ({
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          productId: item.productId,
          name: item.name,
          variantName: item.variantName,
          qty: item.qty,
          price: item.price,
          total: item.total
        })),
        paymentMethod,
        paymentStatus: forcedStatus || (paymentMethod === 'cash' ? 'paid' : 'pending'),
        subtotal: cartSubtotal,
        tax: taxDetails.taxAmount,
        discount: loyaltyDiscount,
        total: cartGrandTotal
      });

      setSuccessOrder(order);
      
      // Trigger canvas confetti animation on success
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      // Clear Cart
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setRedeemPoints(false);
      setCartExpanded(false);
      setActivePaymentModal('none');

    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Pre-Checkout Payment Selection router
  const handlePreCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'upi') {
      setActivePaymentModal('upi');
    } else {
      handleCheckout('paid'); // Cash completes immediately as paid
    }
  };

  // Generate Scannable UPI link for screen checkout
  const upiUrl = useMemo(() => {
    if (paymentMethod !== 'upi' || cartGrandTotal <= 0) return '';
    return generateUPIDeepLink('merchant@upi', currentStore?.name || 'VendorOS Store', cartGrandTotal, `Order #${ordersCount + 101}`);
  }, [paymentMethod, cartGrandTotal, currentStore, ordersCount]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Top Fields: Customer + Search */}
      <div className="bg-white dark:bg-[#121212] p-3 border-b border-slate-100 dark:border-[#1c1c1c] space-y-2 select-none">
        <div className="grid grid-cols-2 gap-2">
          {/* Phone Field */}
          <div className="relative">
            <input
              type="tel"
              placeholder="Phone (Auto lookup)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value.replace(/[^\d+]/g, '').substring(0, 15))}
              className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-2.5 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          {/* Name Field */}
          <div className="relative">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-2.5 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Product Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search burgers, tea, sides..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 pl-9 pr-3 rounded-xl focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Middle Scrollable Category pills */}
      <div className="bg-slate-50 dark:bg-[#0c0c0c] border-b border-slate-100 dark:border-[#1c1c1c] py-2.5 px-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0 select-none">
        <button
          onClick={() => setActiveCategory('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
            activeCategory === 'All'
              ? 'bg-primary text-white shadow-md shadow-orange-500/15'
              : 'bg-white dark:bg-[#121212] text-slate-500 border border-slate-200 dark:border-[#222]'
          }`}
        >
          All Items
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-primary text-white shadow-md shadow-orange-500/15'
                : 'bg-white dark:bg-[#121212] text-slate-500 border border-slate-200 dark:border-[#222]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Card Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 pb-32 no-scrollbar" style={{ alignContent: 'start' }}>
        {filteredProducts.length === 0 ? (
          <div className="col-span-2 text-center text-xs text-muted py-20">
            No items matched your filter query.
          </div>
        ) : (
          filteredProducts.map(product => (
            <div 
              key={product.id}
              className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl overflow-hidden flex flex-col h-44 select-none relative group transition active:scale-98"
            >
              {/* Product Image */}
              <div className="h-20 bg-slate-100 dark:bg-[#181818] relative overflow-hidden">
                <SafeImage 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-[#333] font-bold text-2xl uppercase">
                      {product.name.charAt(0)}
                    </div>
                  }
                />
                {/* Available Badge */}
                <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase">
                  ⚡ Ready
                </div>
              </div>

              {/* Product Title and Price */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs truncate leading-tight text-slate-800 dark:text-slate-100">{product.name}</h3>
                  <p className="text-[9px] text-muted truncate mt-0.5">{product.description || 'QuickServe item'}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-black text-xs text-primary">₹{product.price}</span>
                  
                  {/* Plus Trigger Button */}
                  <button
                    onClick={() => {
                      if (product.variants && product.variants.length > 0) {
                        // Default to small or first variant if present
                        handleAddToCart(product, product.variants[0]);
                      } else {
                        handleAddToCart(product);
                      }
                    }}
                    className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-90 transition focus:outline-none"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Bottom Cart Bar / Drawer */}
      <div 
        className={`absolute z-40 bg-white dark:bg-[#121212] border-t border-slate-100 dark:border-[#1c1c1c]/60 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 select-none flex flex-col left-0 right-0 bottom-0 rounded-t-[24px] rounded-b-none ${
          cartExpanded ? 'h-[70dvh]' : 'h-16'
        }`}
      >
        {/* Toggle Expansion Header */}
        <div 
          onClick={() => cart.length > 0 && setCartExpanded(!cartExpanded)}
          className="flex justify-between items-center h-16 px-4 cursor-pointer active:bg-slate-50 dark:active:bg-[#181818] border-b border-slate-100 dark:border-[#1c1c1c] shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </div>
            <div>
              <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                ₹{cartGrandTotal.toFixed(2)}
              </span>
              <p className="text-[10px] text-muted mt-0.5">
                {storeSettings.gstEnabled ? `Includes GST (${storeSettings.gstRate}%)` : 'Tax Exempt'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Checkout button: expands drawer when collapsed, otherwise executes checkout */}
            <button
              disabled={cart.length === 0 || isCheckingOut}
              onClick={(e) => {
                e.stopPropagation();
                if (!cartExpanded) {
                  setCartExpanded(true);
                } else {
                  handlePreCheckout();
                }
              }}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition focus:outline-none"
            >
              {isCheckingOut ? 'Loading' : 'Checkout'}
            </button>
          </div>
        </div>

        {/* Expanded Drawer Details */}
        {cartExpanded && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between items-center gap-4 border-b border-slate-50 dark:border-[#181818]/60 pb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs leading-snug truncate">{item.name}</h4>
                    {item.variantName && <span className="text-[9px] text-primary font-bold">({item.variantName})</span>}
                    <span className="text-[10px] text-muted block mt-0.5">₹{item.price} each</span>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#181818] p-1 rounded-xl border border-slate-200 dark:border-[#222]">
                    <button
                      onClick={() => handleUpdateQty(item.productId, -1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#202020] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-black min-w-4 text-center">{item.qty}</span>
                    <button
                      onClick={() => handleUpdateQty(item.productId, 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#202020] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <span className="font-black text-xs min-w-16 text-right">
                    ₹{item.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Loyalty & Payment Selection */}
            <div className="p-4 bg-slate-50 dark:bg-[#181818]/40 border-t border-slate-100 dark:border-[#1c1c1c] space-y-3.5 shrink-0">
              {/* Loyalty Reward Redemption row */}
              {customerPointsAvailable > 0 && (
                <div className="flex items-center justify-between bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10 text-xs">
                  <div className="flex-1">
                    <span className="font-bold text-primary flex items-center gap-1">
                      <Sparkles size={14} className="animate-spin-slow" />
                      <span>Loyalty Reward Available!</span>
                    </span>
                    <p className="text-[9px] text-muted mt-0.5">Deduct ₹{Math.min(customerPointsAvailable, cartSubtotal)} balance ({customerPointsAvailable} pts)</p>
                  </div>
                  <button
                    onClick={() => setRedeemPoints(!redeemPoints)}
                    className={`py-1.5 px-4 rounded-xl text-[10px] font-black uppercase transition ${
                      redeemPoints
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-[#121212] text-primary border border-primary/20'
                    }`}
                  >
                    {redeemPoints ? 'Applied' : 'Redeem'}
                  </button>
                </div>
              )}

              {/* Payment Mode Selector */}
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Payment Mode</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {[
                    { id: 'cash', label: 'Cash', icon: Wallet },
                    { id: 'upi', label: 'UPI / QR', icon: QrCode }
                  ].map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                          paymentMethod === method.id
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-[#222] hover:border-slate-300'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculations Block */}
              <div className="space-y-1.5 border-t border-slate-200/60 dark:border-[#222]/80 pt-3 text-xs text-muted font-medium">
                <div className="flex justify-between">
                  <span>Cart Subtotal:</span>
                  <span>₹{(storeSettings.gstEnabled && storeSettings.gstType === 'inclusive' ? cartSubtotal - taxDetails.taxAmount : cartSubtotal).toFixed(2)}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Loyalty Points Used:</span>
                    <span>-₹{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                {storeSettings.gstEnabled && (
                  <div className="flex justify-between">
                    <span>GST ({storeSettings.gstRate}% {storeSettings.gstType}):</span>
                    <span>₹{taxDetails.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-800 dark:text-slate-100 pt-1.5 border-t border-slate-200/40 dark:border-[#222]/40">
                  <span>Pay Total:</span>
                  <span className="text-primary">₹{cartGrandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPI Scanner QR overlay (if UPI selected and checkout modal active) */}
      {activePaymentModal === 'upi' && cartGrandTotal > 0 && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 select-none text-center">
          <div className="bg-white p-6 rounded-[32px] flex flex-col items-center justify-center shadow-2xl w-full max-w-[280px]">
            {/* Scannable Dummy QR */}
            <div className="w-44 h-44 border-4 border-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden bg-slate-50">
              <QrCode size={120} className="text-slate-900" />
              <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
            </div>
            <span className="text-[10px] font-black text-primary uppercase tracking-wider mt-3">Scan UPI QR to Pay</span>
            <span className="text-lg font-black text-slate-800 mt-1">₹{cartGrandTotal.toFixed(2)}</span>
            
            <p className="text-[10px] text-slate-400 leading-normal mt-2">
              Scan using GPay, PhonePe, Paytm, or any banking app to complete transfer.
            </p>
          </div>
          
          <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[280px]">
            <button
              onClick={() => handleCheckout('paid')}
              className="py-3 rounded-2xl bg-green-600 text-white font-black text-xs shadow-md shadow-green-500/10 active:scale-95 transition focus:outline-none"
            >
              Confirm Payment Received
            </button>
            <button
              onClick={() => setActivePaymentModal('none')}
              className="py-3 rounded-2xl bg-slate-800 text-slate-350 font-black text-xs active:scale-95 transition focus:outline-none"
            >
              Cancel / Back to Cart
            </button>
          </div>
        </div>
      )}



      {/* Success Modal Screen Overlay */}
      {successOrder && (() => {
        const receiptText = generateThermalReceipt(
          {
            name: currentStore?.name || 'VendorOS Store',
            phone: currentStore?.phone || '',
            address: storeSettings.receiptHeader?.split('\n').slice(1).join(', ') || 'Main Stall Location',
            gstNumber: storeSettings.gstEnabled ? '09AAAFV9876C1Z0' : undefined
          },
          {
            orderNumber: successOrder.orderNumber,
            items: successOrder.items,
            subtotal: successOrder.subtotal,
            tax: successOrder.tax,
            discount: successOrder.discount,
            total: successOrder.total,
            paymentMethod: successOrder.paymentMethod,
            createdAt: new Date(successOrder.createdAt)
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
        );

        return (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 select-none text-center overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-3">
              <CheckCircle2 size={32} strokeWidth={2} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">Order Placed successfully!</h2>
            <p className="text-[10px] text-slate-400 mt-1">Ticket Number: #{successOrder.orderNumber}</p>

            {/* Visual monospaced thermal receipt preview */}
            <div className="my-4 bg-[#FFFFF6] text-slate-900 border border-slate-300 w-full max-w-[280px] rounded-3xl p-4 shadow-xl text-left select-text relative border-t-8 border-b-8 border-dashed border-slate-400/30">
              <div className="font-mono text-[9px] leading-tight whitespace-pre overflow-x-auto no-scrollbar max-h-56 mt-1 font-bold">
                {receiptText}
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3 flex flex-col gap-2">
                <button
                  onClick={() => handleBluetoothPrint(receiptText)}
                  disabled={printStatus === 'scanning' || printStatus === 'connecting' || printStatus === 'finding_service' || printStatus === 'sending'}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-[9px] uppercase shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Receipt size={12} />
                  {printStatus === 'scanning' && 'Scanning...'}
                  {printStatus === 'connecting' && 'Connecting...'}
                  {printStatus === 'finding_service' && 'Configuring...'}
                  {printStatus === 'sending' && 'Printing...'}
                  {printStatus === 'success' && 'Print Success!'}
                  {printStatus === 'error' && 'Retry Print'}
                  {printStatus === 'idle' && 'Print Receipt'}
                </button>
                {printStatus !== 'idle' && (
                  <div className={`text-[8px] font-bold text-center ${
                    printStatus === 'success' ? 'text-green-600' : printStatus === 'error' ? 'text-red-500 animate-pulse' : 'text-primary animate-pulse'
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

            {successOrder.customerPhone && (
              <p className="text-[9px] text-green-500/90 mt-1 animate-pulse flex items-center gap-1 font-semibold">
                <span>📲 WhatsApp notification dispatched to {successOrder.customerPhone}</span>
              </p>
            )}

            <button
              onClick={() => {
                setSuccessOrder(null);
                setPrintStatus('idle');
                setPrintError(null);
              }}
              className="mt-6 w-full max-w-xs py-3 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-md shadow-orange-500/10 active:scale-95 transition focus:outline-none"
            >
              Got it, Next Order
            </button>
          </div>
        );
      })()}
    </div>
  );
};
