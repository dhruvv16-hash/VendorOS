'use client';
import React from 'react';
import { Settings, Shield, Store, Percent, Printer, Sparkles, User, RefreshCw, Key, Sun, Moon } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';
import { UserRole, hasPermission } from '@/packages/auth';

export const SettingsView: React.FC = () => {
  const { 
    currentStore, 
    stores, 
    changeStore,
    storeSettings, 
    updateSettings,
    activeUser, 
    changeUserRole,
    subscriptionTier,
    clearDatabase,
    supabaseError,
    isDarkMode,
    toggleTheme
  } = useVendor();

  const handleRoleChange = (role: UserRole) => {
    changeUserRole(role);
  };

  const handleGstToggle = (enabled: boolean) => {
    updateSettings({ gstEnabled: enabled });
  };

  const handleGstTypeChange = (type: 'inclusive' | 'exclusive') => {
    updateSettings({ gstType: type });
  };

  const handleGstRateChange = (rate: number) => {
    updateSettings({ gstRate: rate });
  };

  const handlePrinterChange = (printerType: 'thermal-58mm' | 'thermal-80mm') => {
    updateSettings({ printerType });
  };

  // List of permissions for visual checker
  const permissionsList: Array<{ key: any; label: string }> = [
    { key: 'create_order', label: 'Place POS Order' },
    { key: 'edit_order', label: 'Modify Active Orders' },
    { key: 'cancel_order', label: 'Cancel Placed Orders' },
    { key: 'view_kitchen', label: 'View Kitchen Queue' },
    { key: 'update_kitchen_status', label: 'Advance Kitchen Statuses' },
    { key: 'view_inventory', label: 'Inspect Storage Inventory' },
    { key: 'edit_inventory', label: 'Adjust Stock Count' },
    { key: 'view_analytics', label: 'View Financial Analytics' },
    { key: 'manage_menu', label: 'Manage Menu Items' },
    { key: 'manage_staff', label: 'Add/Remove Staff Profiles' },
    { key: 'manage_settings', label: 'Modify GST & Store Parameters' },
    { key: 'send_campaigns', label: 'Send Outbound SMS Campaigns' }
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar pb-24 select-none">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">System Settings</h2>
        <p className="text-xs text-muted">Manage subscription, taxes, active role & database parameters</p>
      </div>

      {/* Supabase Connection Alert */}
      {supabaseError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-3xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <Key size={16} />
            <span>Supabase Sync Offline (Fallback Mode)</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            We couldn't connect or fetch tables from your Supabase database. The application is running using local storage fallback.
          </p>
          <div className="bg-black/5 dark:bg-black/20 p-2.5 rounded-xl font-mono text-[9px] break-all select-text">
            Error: {supabaseError}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            <strong>Action Required:</strong> Execute the database migrations in your Supabase SQL Editor:
            <br />
            <span className="text-primary font-mono text-[9px]">supabase/migrations/20260529_init.sql</span>
          </p>
        </div>
      )}

      {/* active User Role permissions engine */}
      <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1c1c1c] pb-3 select-none">
          <Shield size={16} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identity Access Control</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted font-medium">Logged-in Staff:</span>
            <select
              value={activeUser?.role || 'CASHIER'}
              onChange={e => handleRoleChange(e.target.value as UserRole)}
              className="bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-1.5 px-3 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none text-xs"
            >
              <option value="OWNER">Owner (All permissions)</option>
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier (Billing only)</option>
              <option value="KITCHEN">Kitchen Staff</option>
              <option value="DELIVERY">Delivery Driver</option>
            </select>
          </div>

          {/* Collapsed checklist of current active permissions */}
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Permissions Matrix</span>
            <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 dark:bg-[#181818] p-3 rounded-2xl border border-slate-100 dark:border-[#1c1c1c] max-h-36 overflow-y-auto no-scrollbar">
              {permissionsList.map(perm => {
                const allowed = activeUser ? hasPermission(activeUser.role, perm.key) : false;
                return (
                  <div key={perm.key} className="flex items-center gap-1.5 text-[10px]">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${
                      allowed 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {allowed ? '✓' : '✕'}
                    </span>
                    <span className={allowed ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500 line-through'}>
                      {perm.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Display settings */}
      <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1c1c1c] pb-3 select-none">
          {isDarkMode ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display Theme</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">Dark Mode Enabled</span>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full transition p-1 relative ${
              isDarkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-[#222]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              isDarkMode ? 'translate-x-6' : 'translate-x-0'
            }`}></div>
          </button>
        </div>
      </div>

      {/* Tax configuration Settings */}
      <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1c1c1c] pb-3 select-none">
          <Percent size={16} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST Settings</span>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Enabled Toggle */}
          <div className="flex justify-between items-center">
            <span className="font-medium text-slate-700 dark:text-slate-300">GST Taxation Enabled</span>
            <button
              onClick={() => handleGstToggle(!storeSettings.gstEnabled)}
              className={`w-12 h-6 rounded-full transition p-1 relative ${
                storeSettings.gstEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-[#222]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                storeSettings.gstEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}></div>
            </button>
          </div>

          {storeSettings.gstEnabled && (
            <>
              {/* Inclusive / Exclusive */}
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700 dark:text-slate-300">Tax Application Style</span>
                <div className="bg-slate-50 dark:bg-[#181818] p-1 rounded-xl border border-slate-200 dark:border-[#222] flex gap-1">
                  {(['inclusive', 'exclusive'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => handleGstTypeChange(type)}
                      className={`px-3 py-1 rounded-lg font-bold capitalize text-[10px] transition ${
                        storeSettings.gstType === type
                          ? 'bg-white dark:bg-[#2a2a2a] text-primary shadow-sm'
                          : 'text-slate-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate selector input */}
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700 dark:text-slate-300">Default Rate (%):</span>
                <select
                  value={storeSettings.gstRate}
                  onChange={e => handleGstRateChange(parseFloat(e.target.value))}
                  className="bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-1 px-3 rounded-lg font-bold focus:outline-none"
                >
                  <option value="0">0% (GST Exempt)</option>
                  <option value="5">5% (Cafe/Cart Standard)</option>
                  <option value="12">12%</option>
                  <option value="18">18% (AC Restaurants)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>


    </div>
  );
};
