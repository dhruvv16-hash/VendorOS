'use client';
import React from 'react';
import { Home, ClipboardList, Plus, Package, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  setActiveTab
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'pos', label: 'POS', icon: Plus, isCenter: true },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'profile', label: 'Admin', icon: User }
  ];

  return (
    <div className="absolute bottom-4 left-4 right-4 z-40 flex justify-around items-center h-16 rounded-3xl select-none nav-island">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative -top-5 flex flex-col items-center justify-center focus:outline-none z-50"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Highlight Circle Background with Spring Physics */}
              <motion.div 
                whileHover={{ y: -5, scale: 1.1 }}
                whileTap={{ y: 2, scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] flex items-center justify-center text-white shadow-lg shadow-orange-500/35 border-4 border-slate-50 dark:border-[#0c0e16] relative"
              >
                <Icon size={24} strokeWidth={3} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
                {/* Ambient pulse ring */}
                <div className="absolute -inset-1 rounded-full border-2 border-primary/20 animate-ping opacity-60 pointer-events-none" />
              </motion.div>
              <span className="text-[9px] font-black tracking-wider text-primary mt-1">POS</span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none relative"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <motion.div 
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.92 }}
              className={`relative p-1 rounded-xl transition ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                  style={{ boxShadow: '0 0 8px var(--primary)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.div>
            <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition ${isActive ? 'text-primary font-black' : 'text-slate-450 dark:text-slate-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
