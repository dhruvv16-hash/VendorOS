'use client';
import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, Minus, Settings } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';

export const InventoryView: React.FC = () => {
  const { inventory, updateInventoryStock, updateInventoryThreshold, addInventoryItem } = useVendor();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [stockEditValue, setStockEditValue] = useState<string>('');
  
  // Create Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemThreshold, setNewItemThreshold] = useState('0');
  const [newItemCost, setNewItemCost] = useState('0');
  const [addError, setAddError] = useState<string | null>(null);

  const lowStockItems = inventory.filter(item => item.stock <= item.threshold);

  const handleAdjustStock = (itemId: string, current: number, delta: number) => {
    const nextVal = Math.max(0, current + delta);
    updateInventoryStock(itemId, nextVal);
  };

  const handleSaveThreshold = () => {
    if (!selectedItem || stockEditValue === '') return;
    const parsed = parseFloat(stockEditValue);
    if (!isNaN(parsed) && parsed >= 0) {
      updateInventoryThreshold(selectedItem.id, parsed);
      setSelectedItem(null);
      setStockEditValue('');
    }
  };

  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newItemName.trim()) {
      setAddError('Item name is required.');
      return;
    }

    const stockVal = parseFloat(newItemStock);
    const thresholdVal = parseFloat(newItemThreshold);
    const costVal = parseFloat(newItemCost);

    if (isNaN(stockVal) || stockVal < 0) {
      setAddError('Stock must be a non-negative number.');
      return;
    }
    if (isNaN(thresholdVal) || thresholdVal < 0) {
      setAddError('Threshold must be a non-negative number.');
      return;
    }
    if (isNaN(costVal) || costVal < 0) {
      setAddError('Cost must be a non-negative number.');
      return;
    }

    try {
      await addInventoryItem({
        name: newItemName.trim(),
        stock: stockVal,
        unit: newItemUnit,
        threshold: thresholdVal,
        cost: costVal
      });

      // Reset fields & close
      setNewItemName('');
      setNewItemStock('0');
      setNewItemUnit('pcs');
      setNewItemThreshold('0');
      setNewItemCost('0');
      setShowAddModal(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create inventory item.');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Metrics Banner */}
      <div className="bg-white dark:bg-[#121212] p-3.5 border-b border-slate-100 dark:border-[#1c1c1c] shrink-0 select-none flex justify-between items-center gap-3">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Status</span>
          <h3 className="font-extrabold text-base">Ingredient Inventory</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {lowStockItems.length > 0 ? (
            <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse-light">
              <AlertTriangle size={14} />
              <span className="hidden sm:inline">
                {lowStockItems.length === 1 
                  ? '1 item low' 
                  : `${lowStockItems.length} items low`}
              </span>
            </span>
          ) : (
            <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-xl text-xs font-bold hidden sm:inline">
              ✓ Healthy
            </span>
          )}
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-xl shadow-md flex items-center gap-1 font-bold text-xs active:scale-95 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Main Stock Scroll List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-24 no-scrollbar">
        {inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1c1c1c] flex items-center justify-center text-slate-400">
              <Package size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">No Stock Items</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-normal">Configure and add stock details to track ingredient depletion rates.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary/15 text-primary text-xs font-bold rounded-xl active:scale-95 transition"
            >
              Add Your First Ingredient
            </button>
          </div>
        ) : (
          inventory.map(item => {
            const isLow = item.stock <= item.threshold;
            return (
              <div 
                key={item.id}
                className={`bg-white dark:bg-[#121212] border rounded-3xl p-4 flex justify-between items-center transition select-none ${
                  isLow 
                    ? 'border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent' 
                    : 'border-slate-100 dark:border-[#1c1c1c]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{item.name}</span>
                    {isLow && (
                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 flex items-center gap-0.5">
                        <AlertTriangle size={10} />
                        <span>Low</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex gap-3">
                    <span>Threshold: {item.threshold} {item.unit}</span>
                    {!isLow && <span>Cost: ₹{item.cost}/{item.unit}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Adjust buttons */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#181818] p-1 rounded-xl border border-slate-200 dark:border-[#222]">
                    <button
                      onClick={() => handleAdjustStock(item.id, item.stock, -1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#202020] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-black text-xs text-center min-w-16">
                      {item.stock} {item.unit}
                    </span>
                    <button
                      onClick={() => handleAdjustStock(item.id, item.stock, 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#202020] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setStockEditValue(item.threshold.toString());
                    }}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] hover:bg-slate-100 transition"
                  >
                    <Settings size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Threshold Modal */}
      {selectedItem && (
        <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-6 select-none animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">Set Stock Threshold</h3>
              <p className="text-[10px] text-muted mt-0.5">{selectedItem.name}</p>
            </div>

            <div className="relative">
              <input
                type="number"
                value={stockEditValue}
                onChange={e => setStockEditValue(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-3 rounded-xl focus:border-primary focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                {selectedItem.unit}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThreshold}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-md shadow-orange-500/10 hover:bg-orange-600"
              >
                Update Threshold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Item Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-6 select-none animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">Add Stock Details</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Configure raw material or packaging stock.</p>
            </div>

            {addError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-bold">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStockItem} className="space-y-3 text-left">
              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Ingredient Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Burger Buns"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-3 rounded-xl focus:border-primary focus:outline-none font-bold"
                  required
                />
              </div>

              {/* Initial Stock & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Initial Qty *</label>
                  <input
                    type="number"
                    step="any"
                    value={newItemStock}
                    onChange={e => setNewItemStock(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-3 rounded-xl focus:border-primary focus:outline-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Unit *</label>
                  <select
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-3 rounded-xl focus:border-primary focus:outline-none font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="ltr">ltr (Liters)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="packet">packet (Packets)</option>
                  </select>
                </div>
              </div>

              {/* Threshold & Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Threshold Qty *</label>
                  <input
                    type="number"
                    step="any"
                    value={newItemThreshold}
                    onChange={e => setNewItemThreshold(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-3 rounded-xl focus:border-primary focus:outline-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Cost / Unit (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    value={newItemCost}
                    onChange={e => setNewItemCost(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 px-3 rounded-xl focus:border-primary focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-xs font-semibold hover:bg-slate-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-md shadow-orange-500/10 hover:bg-orange-600 text-center"
                >
                  Create Stock ⚡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
