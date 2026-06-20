'use client';
import React, { useState, useRef } from 'react';
import { useVendor } from '@/context/useVendorStore';
import posthog from 'posthog-js';

import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ShoppingBag, 
  Upload, 
  Camera, 
  Check, 
  RefreshCw, 
  PlusCircle,
  FileText
} from 'lucide-react';

interface EditableScanItem {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  checked: boolean;
}

const BUSINESS_TYPE_MOCK_ITEMS: Record<string, Array<{ name: string; price: number; category: string; emoji: string }>> = {
  'Fast Food': [
    { name: 'Classic Veg Burger', price: 80, category: 'Burgers', emoji: '🍔' },
    { name: 'Double Cheese Burger', price: 140, category: 'Burgers', emoji: '🍔' },
    { name: 'Crispy Fries (Large)', price: 70, category: 'Sides', emoji: '🍟' },
    { name: 'Masala Lemonade', price: 40, category: 'Drinks', emoji: '🥤' },
    { name: 'Cheese Sandwich', price: 90, category: 'Sides', emoji: '🥪' }
  ],
  'Beverages': [
    { name: 'Special Masala Chai', price: 20, category: 'Tea', emoji: '☕' },
    { name: 'Ginger Adrak Tea', price: 20, category: 'Tea', emoji: '☕' },
    { name: 'Filter Coffee', price: 30, category: 'Coffee', emoji: '☕' },
    { name: 'Crispy Samosa (2 pcs)', price: 30, category: 'Snacks', emoji: '🥟' },
    { name: 'Hot Bread Pakora', price: 25, category: 'Snacks', emoji: '🍞' }
  ],
  'Bakery': [
    { name: 'Chocolate Cupcake', price: 60, category: 'Pastries', emoji: '🧁' },
    { name: 'Red Velvet Pastry', price: 90, category: 'Pastries', emoji: '🍰' },
    { name: 'Butter Croissant', price: 70, category: 'Breads', emoji: '🥐' },
    { name: 'Veg Puff Patty', price: 40, category: 'Snacks', emoji: '🥟' },
    { name: 'Fruit Cake Slice', price: 80, category: 'Pastries', emoji: '🍰' }
  ],
  'Pizza & Pasta': [
    { name: 'Margherita Pizza', price: 190, category: 'Pizza', emoji: '🍕' },
    { name: 'Paneer Tikka Pizza', price: 260, category: 'Pizza', emoji: '🍕' },
    { name: 'Cheesy White Pasta', price: 150, category: 'Pasta', emoji: '🍝' },
    { name: 'Spicy Red Pasta', price: 140, category: 'Pasta', emoji: '🍝' },
    { name: 'Garlic Bread (4 pcs)', price: 90, category: 'Sides', emoji: '🥖' }
  ],
  'Cafe': [
    { name: 'Cappuccino Coffee', price: 90, category: 'Hot Coffee', emoji: '☕' },
    { name: 'Iced Latte Espresso', price: 110, category: 'Cold Coffee', emoji: '🥤' },
    { name: 'Veg Club Sandwich', price: 120, category: 'Bites', emoji: '🥪' },
    { name: 'Blueberry Muffin', price: 80, category: 'Bites', emoji: '🧁' },
    { name: 'Hot Espresso Shot', price: 50, category: 'Hot Coffee', emoji: '☕' }
  ],
  'Desserts': [
    { name: 'Special Kulfi Ice Cream', price: 40, category: 'Ice Cream', emoji: '🍦' },
    { name: 'Chocolate Waffle', price: 130, category: 'Waffles', emoji: '🧇' },
    { name: 'Warm Choco Lava Cake', price: 90, category: 'Cakes', emoji: '🍰' },
    { name: 'Butterscotch Cup', price: 50, category: 'Ice Cream', emoji: '🍦' },
    { name: 'Hot Gulab Jamun (2 pcs)', price: 40, category: 'Warm Desserts', emoji: '🍨' }
  ],
  'Other': [
    { name: 'Classic Burger', price: 80, category: 'Fast Food', emoji: '🍔' },
    { name: 'Masala Chai', price: 20, category: 'Tea', emoji: '☕' },
    { name: 'Crispy Samosa', price: 30, category: 'Snacks', emoji: '🥟' },
    { name: 'Club Sandwich', price: 90, category: 'Fast Food', emoji: '🥪' },
    { name: 'Chilled Soda', price: 40, category: 'Drinks', emoji: '🥤' }
  ]
};

export const MenuWizardView: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { currentStore, products, createProductQuick, createProductsBulk, deleteProduct } = useVendor();
  
  // View/Tab State
  const [activeTab, setActiveTab] = useState<'scan' | 'presets' | 'manual'>('scan');

  // Scanner States
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<EditableScanItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Input State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [emoji, setEmoji] = useState('🍔');
  
  // Presets States
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const businessCategory = currentStore?.businessType || 'Other';

  // --- Photo Upload Handling ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const startMenuScan = async () => {
    if (!filePreview) return;
    setError(null);
    setScanning(true);
    setScanResults([]);

    if (typeof window !== 'undefined') {
      posthog.capture('menu_ocr_uploaded', {
        storeId: currentStore?.id
      });
    }

    try {
      // Simulate OCR scanning time with laser sweep animation
      await new Promise(resolve => setTimeout(resolve, 2500));

      const mockSource = BUSINESS_TYPE_MOCK_ITEMS[businessCategory] || BUSINESS_TYPE_MOCK_ITEMS['Other'];
      const parsedItems: EditableScanItem[] = mockSource.map((item, idx) => ({
        id: `scan_item_${Date.now()}_${idx}`,
        name: item.name,
        price: item.price,
        category: item.category,
        emoji: item.emoji,
        checked: true
      }));

      setScanResults(parsedItems);
      setSuccessMsg(`OCR Scanning complete! Found ${parsedItems.length} items.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('OCR parse error. Please retry or enter items manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddScanRow = () => {
    const newIdx = scanResults.length;
    const defaultItem = BUSINESS_TYPE_MOCK_ITEMS['Other'][0];
    const newRow: EditableScanItem = {
      id: `scan_item_manual_${Date.now()}_${newIdx}`,
      name: `New Item ${newIdx + 1}`,
      price: 50,
      category: defaultItem.category,
      emoji: defaultItem.emoji,
      checked: true
    };
    setScanResults([...scanResults, newRow]);
  };

  const handleScanItemChange = (id: string, field: keyof EditableScanItem, value: any) => {
    setScanResults(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleImportScanResults = async () => {
    setError(null);
    const checkedItems = scanResults.filter(item => item.checked && item.name.trim());
    if (checkedItems.length === 0) {
      setError('No valid items selected for import.');
      return;
    }

    if (typeof window !== 'undefined') {
      posthog.capture('menu_ocr_scanned', {
        storeId: currentStore?.id,
        itemCount: checkedItems.length
      });
    }

    try {
      setGenerating(true);
      await createProductsBulk(checkedItems.map(item => ({
        name: item.name.trim(),
        price: item.price,
        category: item.category.trim() || 'General',
        emoji: item.emoji
      })));
      setSuccessMsg(`Successfully imported ${checkedItems.length} products!`);
      // Clear scanner list
      setScanResults([]);
      setFile(null);
      setFilePreview(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setGenerating(false);
    }
  };

  // --- Manual Add Form Handling ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return;
    const rate = parseFloat(price);
    if (isNaN(rate) || rate < 0) {
      setError('Please enter a valid price/rate.');
      return;
    }

    try {
      const catVal = category.trim() || 'General';
      await createProductQuick(name.trim(), rate, catVal, emoji);
      
      setSuccessMsg(`"${name}" added successfully!`);
      setTimeout(() => setSuccessMsg(null), 2500);
      
      // Reset manual fields
      setName('');
      setPrice('');
      setCategory('');
    } catch (err: any) {
      setError(err.message || 'Failed to add item.');
    }
  };

  // --- 1-Click Presets Handling ---
  const handleAIGenerate = async () => {
    setError(null);
    setGenerating(true);

    try {
      const itemsToLoad = BUSINESS_TYPE_MOCK_ITEMS[businessCategory] || BUSINESS_TYPE_MOCK_ITEMS['Other'];
      
      if (typeof window !== 'undefined') {
        posthog.capture('menu_presets_generated', {
          storeId: currentStore?.id,
          businessCategory,
          itemCount: itemsToLoad.length
        });
      }
      
      // Load preset items with slight artificial delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      await createProductsBulk(itemsToLoad.map(item => ({
        name: item.name,
        price: item.price,
        category: item.category,
        emoji: item.emoji
      })));
      setSuccessMsg(`Generated menu presets for ${businessCategory}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Mock AI generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 bg-[#0a0a0a] text-white no-scrollbar select-none pb-24">
      
      {/* Custom Styles for Laser Scan and Pulsing Animations */}
      <style>{`
        @keyframes scan-animation {
          0% { top: 0%; opacity: 0.3; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.3; }
        }
        .laser-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #FF6B35, #FFB347, #FF6B35, transparent);
          box-shadow: 0 0 12px 3px rgba(255, 107, 53, 0.8);
          animation: scan-animation 2s infinite ease-in-out;
          pointer-events: none;
        }
        .scan-overlay {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(2px);
        }
      `}</style>

      <div className="w-full max-w-md mx-auto space-y-6">
        
        {/* Onboarding Header */}
        <div className="text-center space-y-2">
          <span className="text-[9px] font-black uppercase text-[#FF6B35] tracking-widest bg-[#FF6B35]/10 px-3 py-1 rounded-full border border-[#FF6B35]/20">
            Setup Wizard
          </span>
          <h2 className="text-xl font-black mt-2 tracking-tight">Configure Your Menu</h2>
          <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto">
            Add items to <span className="text-[#FF6B35] font-bold">&quot;{currentStore?.name}&quot;</span>. Scan a menu photo, load presets, or add them manually.
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[10px] font-bold transition-all">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-[10px] font-bold transition-all flex items-center gap-1.5">
            <Check size={12} />
            {successMsg}
          </div>
        )}

        {/* Premium Tab Selector */}
        <div className="flex p-1 bg-[#121212] border border-slate-800 rounded-2xl">
          {[
            { id: 'scan', label: 'AI Menu Scan 📸', icon: Camera },
            { id: 'presets', label: 'Quick Presets ⚡', icon: Sparkles },
            { id: 'manual', label: 'Manual Add ✍️', icon: Plus }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] font-black rounded-xl transition-all ${
                  active 
                    ? 'bg-[#1e1e1e] text-white border border-slate-700/60 shadow-lg shadow-black/40' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={12} className={active ? 'text-[#FF6B35]' : 'text-slate-500'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: AI Menu Scan */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {!filePreview ? (
              /* Drag & Drop Zone */
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  dragActive 
                    ? 'border-[#FF6B35] bg-[#FF6B35]/5 scale-[0.99]' 
                    : 'border-slate-800 bg-[#121212] hover:border-slate-700'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-2xl bg-[#1a1a1a] flex items-center justify-center border border-slate-850 text-slate-400 group-hover:text-white transition">
                    <Upload size={18} className="text-[#FF6B35]" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-slate-200">Drag & drop your Menu Photo</h5>
                    <p className="text-[10px] text-slate-500">Supports PNG, JPG, JPEG up to 10MB</p>
                  </div>
                  <span className="inline-block text-[9px] font-extrabold px-3 py-1.5 rounded-xl bg-[#1d1d1d] border border-slate-800 text-slate-300">
                    Browse Files
                  </span>
                </div>
              </div>
            ) : (
              /* Image Uploaded View & Scan Process */
              <div className="space-y-4">
                <div className="relative rounded-3xl overflow-hidden border border-slate-850 aspect-[4/3] bg-[#121212] flex items-center justify-center">
                  <img
                    src={filePreview}
                    alt="Menu Preview"
                    className="w-full h-full object-cover opacity-60"
                  />
                  
                  {/* Scanner overlay & laser line */}
                  {scanning && (
                    <div className="absolute inset-0 scan-overlay flex flex-col items-center justify-center gap-2">
                      <div className="laser-line" />
                      <div className="w-8 h-8 rounded-full border-2 border-[#FF6B35]/30 border-t-[#FF6B35] animate-spin" />
                      <span className="text-[10px] font-black text-[#FF6B35] uppercase tracking-wider animate-pulse">
                        Scanning Menu OCR...
                      </span>
                    </div>
                  )}

                  {/* Actions overlay when not scanning */}
                  {!scanning && scanResults.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                      <button
                        onClick={startMenuScan}
                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 transition"
                      >
                        <Sparkles size={13} />
                        Run AI Menu Scan ⚡
                      </button>
                    </div>
                  )}
                </div>

                {/* Reset Photo */}
                {!scanning && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setFile(null);
                        setFilePreview(null);
                        setScanResults([]);
                      }}
                      className="text-[9px] font-bold text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      <RefreshCw size={9} />
                      Choose Different Photo
                    </button>
                  </div>
                )}

                {/* Checklist of OCR Parsed Items */}
                {scanResults.length > 0 && (
                  <div className="bg-[#121212] border border-slate-800 rounded-3xl p-4.5 space-y-4 shadow-2xl relative">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                          <FileText size={13} className="text-[#FF6B35]" />
                          OCR Parsed Results
                        </h4>
                        <p className="text-[9px] text-slate-550">Review, edit, and select items to bulk import.</p>
                      </div>
                      <button
                        onClick={handleAddScanRow}
                        className="text-[9px] font-black text-[#FF6B35] hover:underline flex items-center gap-1"
                      >
                        <PlusCircle size={10} />
                        Add Row
                      </button>
                    </div>

                    {/* Spreadsheet List */}
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 no-scrollbar">
                      {scanResults.map((item, idx) => (
                        <div key={item.id} className="flex gap-2.5 items-center bg-[#171717] p-2.5 rounded-2xl border border-slate-800/80">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => handleScanItemChange(item.id, 'checked', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-[#FF6B35] focus:ring-[#FF6B35] accent-[#FF6B35]"
                          />

                          {/* Details Row */}
                          <div className="flex-1 grid grid-cols-12 gap-1.5 items-center">
                            
                            {/* Emoji */}
                            <input
                              type="text"
                              value={item.emoji}
                              onChange={(e) => handleScanItemChange(item.id, 'emoji', e.target.value)}
                              className="col-span-2 text-center bg-transparent border-b border-slate-800 focus:border-[#FF6B35] text-xs py-0.5 focus:outline-none"
                              title="Emoji"
                            />

                            {/* Name */}
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleScanItemChange(item.id, 'name', e.target.value)}
                              placeholder="Name"
                              className="col-span-5 bg-transparent border-b border-slate-800 focus:border-[#FF6B35] text-xs py-0.5 font-bold text-white focus:outline-none placeholder:text-slate-700"
                            />

                            {/* Price */}
                            <input
                              type="number"
                              value={item.price || ''}
                              onChange={(e) => handleScanItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="Rate"
                              className="col-span-2.5 bg-transparent border-b border-slate-800 focus:border-[#FF6B35] text-xs py-0.5 font-black text-[#FF6B35] focus:outline-none placeholder:text-slate-700 text-right"
                            />

                            {/* Category */}
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => handleScanItemChange(item.id, 'category', e.target.value)}
                              placeholder="Category"
                              className="col-span-2.5 bg-transparent border-b border-slate-800 focus:border-[#FF6B35] text-[9px] py-0.5 text-slate-400 focus:outline-none placeholder:text-slate-700"
                            />

                          </div>

                          {/* Delete Item from Scan Results */}
                          <button
                            onClick={() => setScanResults(prev => prev.filter(r => r.id !== item.id))}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Bulk Import Trigger */}
                    <button
                      onClick={handleImportScanResults}
                      disabled={generating}
                      className="w-full py-2.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-orange-500/10 disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                          Importing Items...
                        </>
                      ) : (
                        <>
                          <Check size={12} />
                          Bulk Import Selected ({scanResults.filter(i => i.checked).length}) Products 🚀
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AI Preset Generation */}
        {activeTab === 'presets' && (
          <div className="bg-[#121212] border border-slate-800 rounded-3xl p-4.5 space-y-3.5 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B35]/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div>
              <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#FF6B35]" />
                1-Click Menu Preset Load
              </h4>
              <p className="text-[10px] text-slate-450 mt-1 max-w-[280px] leading-relaxed">
                Automatically generate 5 category-appropriate presets optimized for your <span className="font-bold text-slate-300">{businessCategory}</span> business.
              </p>
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={generating}
              className="w-full py-2.5 rounded-2xl bg-[#1e1e1e] border border-slate-800 hover:bg-[#252525] text-white font-extrabold text-[11px] flex items-center justify-center gap-2 active:scale-95 transition focus:outline-none disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  Populating Presets...
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-[#FF6B35]" />
                  Generate Menu Presets ⚡
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: Manual Addition */}
        {activeTab === 'manual' && (
          <div className="bg-[#121212] border border-slate-800 rounded-3xl p-4.5 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus size={14} className="text-[#FF6B35]" />
              Add Menu Item Manually
            </h4>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              {/* Name Input */}
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-black text-slate-450 tracking-wider">Item Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Classic Burger"
                  className="w-full bg-[#161616] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B35] placeholder:text-slate-650"
                  required
                />
              </div>

              {/* Price & Category Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-450 tracking-wider">Price / Rate (₹) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="e.g. 80"
                    min="0"
                    step="0.01"
                    className="w-full bg-[#161616] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B35] placeholder:text-slate-650"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-450 tracking-wider">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Burgers, Tea"
                    className="w-full bg-[#161616] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B35] placeholder:text-slate-650"
                  />
                </div>
              </div>

              {/* Logo/Emoji picker */}
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-black text-slate-450 tracking-wider">Item Icon (Emoji)</label>
                <div className="flex bg-[#161616] p-1.5 rounded-xl border border-slate-800 justify-around">
                  {['🍔', '☕', '🥤', '🍟', '🍕', '🍰', '🥟', '🥪'].map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`text-base p-1 rounded-lg transition active:scale-[0.95] ${
                        emoji === em ? 'bg-[#FF6B35]/20 border border-[#FF6B35]/40' : 'bg-transparent border border-transparent'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-extrabold text-[11px] flex items-center justify-center gap-1 active:scale-[0.98] transition focus:outline-none mt-2 shadow-lg shadow-orange-500/5"
              >
                <Plus size={13} />
                Add Item to Menu
              </button>
            </form>
          </div>
        )}

        {/* Existing Products Checklist */}
        {products.length > 0 && (
          <div className="bg-[#121212] border border-slate-800 rounded-3xl p-4.5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-[#FF6B35]" />
                Added Items ({products.length})
              </h4>
              <span className="text-[8px] text-slate-500 font-bold">POS Preview</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {products.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-[#161616] p-2.5 rounded-xl border border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.image || '🍔'}</span>
                    <div>
                      <div className="font-extrabold text-slate-200">{item.name}</div>
                      <div className="text-[9px] text-slate-450 font-bold">{item.category}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-black text-[#FF6B35]">₹{item.price}</span>
                    <button
                      onClick={() => deleteProduct(item.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Launch CTA */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  posthog.capture('menu_setup_completed', {
                    storeId: currentStore?.id,
                    productCount: products.length
                  });
                }
                if (onComplete) {
                  onComplete();
                } else {
                  window.location.reload();
                }
              }}
              className="w-full py-3 rounded-2xl bg-white text-black font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition focus:outline-none hover:bg-slate-100 shadow-md shadow-white/5 mt-2"
            >
              <span>Finish Setup & Launch POS 🚀</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
