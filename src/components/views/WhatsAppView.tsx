'use client';
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Send, HelpCircle, Check, CheckCheck, ArrowLeft, MessageSquare, Phone } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';
import { whatsappService } from '@/packages/whatsapp';

export const WhatsAppView: React.FC = () => {
  const { whatsappLogs, currentStore, storeSettings, updateSettings } = useVendor();
  const [activeChatLog, setActiveChatLog] = useState<any | null>(null);
  const [testPhone, setTestPhone] = useState('9303000832');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [placedTemplate, setPlacedTemplate] = useState('');
  const [readyTemplate, setReadyTemplate] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to end of chat when active chat changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatLog]);

  // Sync templates with settings
  useEffect(() => {
    if (storeSettings) {
      setPlacedTemplate(storeSettings.whatsappOrderPlacedTemplate || '');
      setReadyTemplate(storeSettings.whatsappOrderReadyTemplate || '');
    }
  }, [storeSettings]);

  const handleSaveTemplates = () => {
    updateSettings({
      whatsappOrderPlacedTemplate: placedTemplate,
      whatsappOrderReadyTemplate: readyTemplate
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRetry = async (logId: string) => {
    await whatsappService.retryNotification(logId);
  };

  const sendTestTemplate = async () => {
    if (!currentStore) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: currentStore.id,
          phone: testPhone,
          messageType: 'hello_world',
          content: 'Simulated Hello World Template Message'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, msg: 'Meta accepted the template successfully! Please check your phone.' });
      } else {
        setTestResult({ success: false, msg: data.error || 'Failed to send template.' });
      }
    } catch (e: any) {
      setTestResult({ success: false, msg: e.message || 'Network error.' });
    } finally {
      setTestSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check size={13} className="text-slate-400" />;
      case 'delivered':
        return <CheckCheck size={13} className="text-slate-400" />;
      case 'read':
        return <CheckCheck size={13} className="text-blue-500" />;
      case 'failed':
        return <HelpCircle size={13} className="text-red-500" />;
      default:
        return null;
    }
  };

  // If a chat log is selected, render the WhatsApp Chat Simulator view
  if (activeChatLog) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#E5DDD5] dark:bg-[#0b141a] select-none">
        {/* WhatsApp Header */}
        <div className="bg-[#075E54] dark:bg-[#202c33] text-white p-3 pt-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setActiveChatLog(null)}
              className="p-1 rounded-full hover:bg-white/10 text-white transition active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-[#4f5d64] flex items-center justify-center font-bold text-sm text-slate-800 dark:text-slate-200">
              {activeChatLog.customerName ? activeChatLog.customerName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <h4 className="font-bold text-xs leading-none">{activeChatLog.customerName || 'Customer'}</h4>
              <span className="text-[8px] opacity-75">{activeChatLog.phone}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <Phone size={14} className="opacity-80" />
            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full">
              {activeChatLog.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Chat Messages area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 flex flex-col no-scrollbar">
          <div className="text-[9px] bg-white/70 dark:bg-[#202c33]/80 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg self-center font-bold uppercase tracking-wider mb-2 shadow-sm border border-slate-200/20">
            Today
          </div>

          {/* Business Announcement Badge */}
          <div className="text-[8px] bg-amber-50 dark:bg-[#182229] text-amber-800 dark:text-amber-300/80 p-2.5 rounded-2xl self-center max-w-[90%] text-center shadow-sm border border-amber-200/10 leading-relaxed font-medium">
            🔒 Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
          </div>

          {/* Simulated WhatsApp Incoming message bubble (Sent to customer) */}
          <div className="bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 p-3 rounded-2xl rounded-tr-none self-end max-w-[85%] text-xs shadow-sm leading-relaxed whitespace-pre-line relative font-medium border border-slate-100 dark:border-[#2b3942]/10">
            {activeChatLog.content}
            
            <div className="flex items-center justify-end gap-1 mt-1.5 text-[8px] text-slate-400 dark:text-slate-500">
              <span>{new Date(activeChatLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {getStatusIcon(activeChatLog.status)}
            </div>
          </div>

          <div ref={chatEndRef}></div>
        </div>

        {/* Input field */}
        <div className="bg-[#f0f2f5] dark:bg-[#111b21] p-2 flex items-center gap-2 shrink-0 border-t border-slate-200/50 dark:border-[#222]">
          <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full py-2 px-4 text-xs text-slate-400 select-none">
            Type a reply...
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0 shadow active:scale-95 transition">
            <Send size={12} />
          </div>
        </div>
      </div>
    );
  }

  // Default view: list of outbound WhatsApp logs
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0c0c0c] overflow-hidden select-none">
      {/* Header */}
      <div className="bg-white dark:bg-[#121212] p-4 border-b border-slate-100 dark:border-[#1c1c1c] shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outbound Logs</span>
        <h3 className="font-extrabold text-base">WhatsApp Dispatch Queue</h3>
      </div>

      {/* Meta API Diagnostic Section */}
      <div className="bg-white dark:bg-[#121212] px-4 py-3 border-b border-slate-100 dark:border-[#1c1c1c] shrink-0 space-y-2 select-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta API Sandbox Diagnostic</span>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="Test Phone Number"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
            className="flex-1 text-[11px] bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] px-3 py-1.5 rounded-xl focus:border-primary focus:outline-none"
          />
          <button
            onClick={sendTestTemplate}
            disabled={testSending || !testPhone}
            className="bg-primary hover:bg-orange-600 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition shadow active:scale-95 disabled:opacity-50"
          >
            {testSending ? 'Sending...' : 'Send Hello World'}
          </button>
        </div>
        {testResult && (
          <div className={`p-2 rounded-xl text-[9px] font-bold mt-1.5 ${
            testResult.success 
              ? 'bg-green-500/10 text-green-500' 
              : 'bg-red-500/10 text-red-500'
          }`}>
            {testResult.success ? '✅ ' : '❌ '}
            {testResult.msg}
          </div>
        )}
      </div>

      {/* Customizable Templates Section */}
      <div className="bg-white dark:bg-[#121212] px-4 py-4 border-b border-slate-100 dark:border-[#1c1c1c] shrink-0 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Message Templates</span>
          <span className="text-[8px] bg-slate-100 dark:bg-[#1e1e1e] text-slate-400 font-bold px-1.5 py-0.5 rounded">Dynamic Placeholders Allowed</span>
        </div>

        <div className="space-y-3">
          {/* Order Placed Template */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">
              📩 Order Placed Template (SMS/WA)
            </label>
            <textarea
              rows={3}
              value={placedTemplate}
              onChange={e => setPlacedTemplate(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] p-2.5 rounded-2xl focus:border-primary focus:outline-none leading-relaxed font-semibold text-slate-800 dark:text-slate-100"
              placeholder="Hi {name}, order #{orderId} received. Bill: ₹{total}..."
            />
          </div>

          {/* Order Ready Template */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">
              🔔 Order Ready Template (SMS/WA)
            </label>
            <textarea
              rows={3}
              value={readyTemplate}
              onChange={e => setReadyTemplate(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] p-2.5 rounded-2xl focus:border-primary focus:outline-none leading-relaxed font-semibold text-slate-800 dark:text-slate-100"
              placeholder="Hi {name}, order #{orderId} is ready..."
            />
          </div>

          {/* Placeholders Legend */}
          <div className="bg-slate-50 dark:bg-[#181818] p-2.5 rounded-2xl border border-slate-200/50 dark:border-[#222] text-[8.5px] leading-relaxed text-slate-400 dark:text-slate-500 font-medium select-none">
            <span className="font-bold text-slate-700 dark:text-slate-350 block mb-1">Available placeholders:</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <div><code className="text-primary font-bold">{`{name}`}</code>: Customer Name</div>
              <div><code className="text-primary font-bold">{`{orderId}`}</code>: Order Number</div>
              <div><code className="text-primary font-bold">{`{items}`}</code>: List of Items ordered</div>
              <div><code className="text-primary font-bold">{`{total}`}</code>: Total Price amount</div>
              <div className="col-span-2"><code className="text-primary font-bold">{`{payment}`}</code>: Payment Status / Method / Link</div>
            </div>
          </div>

          {/* Save Status & Button */}
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSaveTemplates}
              className="flex-1 bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] hover:from-orange-600 hover:to-orange-500 text-white font-black text-xs py-2.5 px-4 rounded-2xl transition shadow-md shadow-orange-500/10 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Check size={13} />
              <span>Save Templates</span>
            </button>
            
            {/* Template preview triggers */}
            <button
              onClick={() => {
                const simulatedReceivedLog = {
                  id: 'sim_custom_placed',
                  customerName: 'Dhruv',
                  phone: '9876543210',
                  messageType: 'order_received',
                  status: 'read',
                  content: whatsappService.compileTemplate('order_received', {
                    name: 'Dhruv',
                    orderId: '101',
                    itemsSummary: 'Classic Burger x2\nMasala Lemonade x1',
                    total: 200,
                    paymentStatus: 'pending',
                    paymentMethod: 'cash'
                  }, placedTemplate),
                  createdAt: new Date()
                };
                setActiveChatLog(simulatedReceivedLog);
              }}
              className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1e1e1e] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-slate-200 font-extrabold text-[9px] transition uppercase tracking-wider active:scale-95"
            >
              Preview Placed
            </button>

            <button
              onClick={() => {
                const simulatedReadyLog = {
                  id: 'sim_custom_ready',
                  customerName: 'Dhruv',
                  phone: '9876543210',
                  messageType: 'order_ready',
                  status: 'read',
                  content: whatsappService.compileTemplate('order_ready', {
                    name: 'Dhruv',
                    orderId: '101',
                    itemsSummary: 'Classic Burger x2\nMasala Lemonade x1',
                    total: 200,
                    paymentStatus: 'paid',
                    paymentMethod: 'upi'
                  }, readyTemplate),
                  createdAt: new Date()
                };
                setActiveChatLog(simulatedReadyLog);
              }}
              className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1e1e1e] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-slate-200 font-extrabold text-[9px] transition uppercase tracking-wider active:scale-95"
            >
              Preview Ready
            </button>
          </div>
          {saveSuccess && (
            <div className="text-[10px] text-green-500 font-bold bg-green-500/10 p-2 rounded-xl text-center select-none animate-pulse-light">
              ✅ Custom Templates saved successfully to settings!
            </div>
          )}
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-24">
        {whatsappLogs.length === 0 ? (
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-20 flex flex-col items-center justify-center gap-2">
            <MessageSquare size={32} className="opacity-40" />
            <span>No WhatsApp messages logged yet.</span>
            <p className="text-[10px] max-w-[200px] leading-normal opacity-85 mt-0.5">
              Submit a new order from the POS tab to trigger a real-time message log.
            </p>
          </div>
        ) : (
          whatsappLogs.map(log => (
            <div
              key={log.id}
              onClick={() => setActiveChatLog(log)}
              className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-3.5 flex flex-col gap-2.5 cursor-pointer hover:border-slate-300 dark:hover:border-[#333] transition active:scale-[0.98]"
            >
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{log.customerName || 'Guest'}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                    {log.phone} • {log.messageType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    log.status === 'read' 
                      ? 'bg-blue-500/10 text-blue-500' 
                      : log.status === 'failed' 
                      ? 'bg-red-500/10 text-red-500' 
                      : 'bg-slate-100 dark:bg-[#1c1c1c] text-slate-400'
                  }`}>
                    {log.status}
                  </span>
                  {getStatusIcon(log.status)}
                </div>
              </div>

              {/* Message preview snippet */}
              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed whitespace-pre-line font-semibold bg-slate-50 dark:bg-[#181818] p-2 rounded-2xl border border-slate-50 dark:border-[#1c1c1c]/10">
                {log.content}
              </p>

              <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500">
                <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                {log.status === 'failed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(log.id);
                    }}
                    className="flex items-center gap-1 text-red-500 font-bold hover:underline uppercase tracking-wider"
                  >
                    <RefreshCw size={10} />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
