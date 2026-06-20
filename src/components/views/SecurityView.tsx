'use client';
import React, { useState } from 'react';
import { useVendor } from '@/context/useVendorStore';
import { Shield, ShieldAlert, CheckCircle, Database, Clock, RefreshCw, Key, Bell, List } from 'lucide-react';

export const SecurityView: React.FC = () => {
  const { notifications, auditLogs, activeUser } = useVendor();
  const [filterType, setFilterType] = useState<'all' | 'alerts' | 'audit'>('all');

  // Filter security notifications
  const securityAlerts = notifications.filter(n => n.type === 'security_anomaly');

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-24 select-none bg-slate-50 dark:bg-[#0c0c0c] text-slate-800 dark:text-slate-100">
      
      {/* 1. Security Header & Integration Status */}
      <div className="bg-white dark:bg-[#121212] border border-slate-200/60 dark:border-[#1c1c1c] p-4 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Security & Audit Center</h3>
            <p className="text-[10px] text-slate-400 font-medium">Compliance-grade infrastructure diagnostics</p>
          </div>
        </div>

        {/* System Diagnostics status list */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-150 dark:border-[#222] flex items-center gap-2">
            <CheckCircle size={14} className="text-green-550 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] font-black leading-tight">Immutability Trigger</div>
              <span className="text-[7.5px] text-green-550 font-bold uppercase tracking-wider">Active (SOC2)</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-150 dark:border-[#222] flex items-center gap-2">
            <CheckCircle size={14} className="text-green-550 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] font-black leading-tight">Range Partitioning</div>
              <span className="text-[7.5px] text-green-550 font-bold uppercase tracking-wider">Active (Monthly)</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-150 dark:border-[#222] flex items-center gap-2">
            <CheckCircle size={14} className="text-green-550 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] font-black leading-tight">Watchdog Anomaly</div>
              <span className="text-[7.5px] text-green-550 font-bold uppercase tracking-wider">Active (Hourly)</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-150 dark:border-[#222] flex items-center gap-2">
            <CheckCircle size={14} className="text-green-550 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] font-black leading-tight">WORM Cold Archive</div>
              <span className="text-[7.5px] text-green-550 font-bold uppercase tracking-wider">Configured (S3)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Buttons */}
      <div className="flex gap-1.5 p-0.5 bg-slate-200/60 dark:bg-[#181818] rounded-2xl border border-slate-250 dark:border-[#222]">
        {[
          { id: 'all', label: 'All Logs', icon: List },
          { id: 'alerts', label: `Alerts (${securityAlerts.length})`, icon: ShieldAlert },
          { id: 'audit', label: `Actions (${auditLogs.length})`, icon: Database }
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id as any)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition ${
                filterType === item.id
                  ? 'bg-white dark:bg-[#2a2a2a] text-red-550 dark:text-red-400 shadow-sm'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon size={12} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Event List Render */}
      <div className="space-y-3">
        {/* Render Security Alerts */}
        {(filterType === 'all' || filterType === 'alerts') && (
          <>
            {securityAlerts.length > 0 && (
              <div className="space-y-2">
                <div className="text-[9px] font-bold uppercase tracking-wider text-red-550 dark:text-red-400 px-1">Security Alert Anomalies</div>
                {securityAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className="p-4 rounded-3xl bg-red-500/5 border border-red-500/15 dark:border-red-500/20 text-xs space-y-2 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ShieldAlert size={13} />
                        {alert.title}
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-semibold">{alert.message}</p>
                    <div className="flex gap-2 pt-1 text-[8px] text-slate-400 font-extrabold uppercase">
                      <span>Store Isolation: Verified</span>
                      <span>•</span>
                      <span>Action: Alert Logged</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filterType === 'alerts' && securityAlerts.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400 font-medium">
                🛡️ No security anomalies detected. System running normally.
              </div>
            )}
          </>
        )}

        {/* Render Audit Logs */}
        {(filterType === 'all' || filterType === 'audit') && (
          <div className="space-y-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">Immutable Action History</div>
            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                No immutable action logs found.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div 
                    key={log.id} 
                    className="p-3.5 bg-white dark:bg-[#121212] border border-slate-150 dark:border-[#1c1c1c] rounded-2xl text-xs space-y-1.5 shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-[#1e1e1e] px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal font-semibold">
                      {log.details ? log.details.replace(/"/g, '') : 'No details provided'}
                    </p>
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-extrabold uppercase pt-1 border-t border-slate-50 dark:border-[#181818]">
                      <span>Role: {log.role || 'CASHIER'}</span>
                      <span>Target: {log.entityType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
