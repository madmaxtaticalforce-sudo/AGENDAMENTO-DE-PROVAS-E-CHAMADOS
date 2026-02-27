import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const FormLabel = ({ label }: { label: string }) => (
  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</label>
);

export const Checkbox = ({ label, name, checked, onChange }: { label: string, name: string, checked: boolean, onChange: (e: any) => void }) => (
  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all group">
    <div className="relative flex items-center">
      <input 
        type="checkbox" 
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600"
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
  </label>
);

export const DetailItem = ({ icon, label, value, className }: { icon: React.ReactNode, label: string, value: string, className?: string }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      {icon} {label}
    </p>
    <p className={`text-sm font-bold ${className || 'text-slate-700'}`}>{value}</p>
  </div>
);

export const StatusBadge = ({ label, isFit }: { label: string, isFit: boolean }) => (
  <div className={`flex items-center justify-between p-3 rounded-2xl border ${
    isFit ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
  }`}>
    <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    {isFit ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
  </div>
);

export const StatCard = ({ icon, label, value, color, isActive, onClick }: { 
  icon: React.ReactNode, 
  label: string, 
  value: number | string, 
  color: 'indigo' | 'emerald' | 'amber' | 'blue' | 'red',
  isActive?: boolean,
  onClick?: () => void
}) => {
  const colors = {
    indigo: isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: isActive ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-600 border-amber-100',
    blue: isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100',
    red: isActive ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-100'
  };

  const borderColors = {
    indigo: isActive ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300',
    emerald: isActive ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-300',
    amber: isActive ? 'border-amber-600 ring-2 ring-amber-100' : 'border-slate-200 hover:border-amber-300',
    blue: isActive ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300',
    red: isActive ? 'border-red-600 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-300'
  };

  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl border bg-white shadow-sm flex items-center gap-4 transition-all text-left w-full ${borderColors[color]} ${isActive ? 'scale-[1.02]' : 'hover:shadow-md'}`}
    >
      <div className={`p-3 rounded-xl ${colors[color]} border transition-colors`}>
        {icon}
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </button>
  );
};
