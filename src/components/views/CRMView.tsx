'use client';
import React, { useState } from 'react';
import { Users, Send, Gift, Search, Sparkles, Megaphone, Smartphone } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';

export const CRMView: React.FC = () => {
  const { customers, sendMockCampaign } = useVendor();
  const [filterSegment, setFilterSegment] = useState<'All' | 'VIP' | 'Frequent' | 'New'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Campaign state
  const [campaignText, setCampaignText] = useState('Weekend Special! Buy 2 burgers, get 1 small masala tea free. Present this code at cart: FREETA.');
  const [campaignSuccess, setCampaignSuccess] = useState(false);

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          customer.phone.includes(searchQuery);
    const matchesSeg = filterSegment === 'All' || customer.segment === filterSegment;
    return matchesSearch && matchesSeg;
  });

  const handleSendCampaign = () => {
    if (!campaignText) return;
    sendMockCampaign(campaignText, 'All');
    setCampaignSuccess(true);
    setTimeout(() => setCampaignSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#121212] p-3 border-b border-slate-100 dark:border-[#1c1c1c] space-y-2.5 shrink-0 select-none">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] py-2 pl-9 pr-3 rounded-xl focus:border-primary focus:outline-none"
          />
        </div>

        {/* Horizontal segments scrolling pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
          {['All', 'VIP', 'Frequent', 'New'].map(segment => (
            <button
              key={segment}
              onClick={() => setFilterSegment(segment as any)}
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase transition ${
                filterSegment === segment
                  ? 'bg-primary text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-50 dark:bg-[#181818] text-slate-500 border border-slate-200 dark:border-[#222]'
              }`}
            >
              {segment}
            </button>
          ))}
        </div>
      </div>

      {/* Main Customers List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-24 no-scrollbar">
        {filteredCustomers.length === 0 ? (
          <div className="text-center text-xs text-muted py-14">
            No customer profiles matched your query parameters.
          </div>
        ) : (
          filteredCustomers.map(customer => {
            const isVIP = customer.segment === 'VIP';
            const isFreq = customer.segment === 'Frequent';
            return (
              <div 
                key={customer.id}
                className={`bg-white dark:bg-[#121212] border rounded-3xl p-4 flex justify-between items-center transition select-none ${
                  isVIP 
                    ? 'border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent' 
                    : isFreq 
                    ? 'border-blue-500/10 bg-gradient-to-r from-blue-500/5 to-transparent' 
                    : 'border-slate-100 dark:border-[#1c1c1c]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{customer.name}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      isVIP 
                        ? 'bg-orange-500/15 text-orange-500' 
                        : isFreq 
                        ? 'bg-blue-500/15 text-blue-500' 
                        : 'bg-slate-100 dark:bg-[#202020] text-slate-500'
                    }`}>
                      {customer.segment}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex gap-3">
                    <span>Phone: {customer.phone}</span>
                    <span>Visits: {customer.visitCount}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">₹{customer.totalSpend.toLocaleString()}</span>
                  <span className="text-[9px] text-primary font-bold flex items-center gap-0.5">
                    <Gift size={10} />
                    <span>{customer.loyaltyPoints} pts</span>
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* WhatsApp Campaign Launcher panel */}
        <div className="bg-white dark:bg-[#121212] border border-slate-100 dark:border-[#1c1c1c] rounded-3xl p-4 mt-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#1c1c1c] pb-3 mb-3 select-none">
            <Megaphone size={16} className="text-primary animate-bounce-slow" />
            <span className="text-[10px] font-bold uppercase tracking-wider">SMS / WhatsApp Campaigns</span>
          </div>

          <div className="space-y-3.5">
            {/* Target List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider text-[10px]">Target Audience:</span>
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  All Visited Customers ({customers.length})
                </span>
              </div>
              
              {/* Displaying numbers retrieved from DB */}
              {customers.length > 0 ? (
                <div className="bg-slate-50 dark:bg-[#181818] p-2.5 rounded-2xl border border-slate-200/50 dark:border-[#222] space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block">Numbers Retrieved from Database:</span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto no-scrollbar">
                    {customers.map(customer => (
                      <span key={customer.id} className="text-[9px] bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#2b2b2b] px-2 py-0.5 rounded-lg text-slate-750 dark:text-slate-350 font-bold flex items-center gap-1">
                        <Smartphone size={9} className="text-slate-400 shrink-0" />
                        {customer.phone} ({customer.name})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold text-center py-2 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-[#222]">
                  No customers found in database.
                </div>
              )}
            </div>

            {/* Campaign text */}
            <textarea
              rows={3}
              value={campaignText}
              onChange={e => setCampaignText(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#222] p-2.5 rounded-2xl focus:border-primary focus:outline-none"
              placeholder="Type your campaign text offer..."
            />

            {campaignSuccess && (
              <div className="text-[10px] text-green-500 font-bold bg-green-500/10 p-2.5 rounded-xl text-center select-none animate-pulse-light">
                Campaign queued successfully! Simulated texts dispatched in WhatsApp Logs.
              </div>
            )}

            <button
              onClick={handleSendCampaign}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition focus:outline-none flex items-center justify-center gap-1.5"
            >
              <Send size={13} />
              <span>Broadcast Campaign</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
