import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Database,
  RefreshCw,
  Ticket as TicketIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { Appointment, Ticket } from '../types';

interface HomeViewProps {
  appointments: Appointment[];
  tickets: Ticket[];
  onNavigate: (view: 'appointments' | 'tickets') => void;
  onSync: () => void;
  isLoading: boolean;
  lastSyncTime: string | null;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export const HomeView: React.FC<HomeViewProps> = ({ appointments, tickets, onNavigate, onSync, isLoading, lastSyncTime }) => {
  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.isConfirmed).length;
    const pending = total - confirmed;
    const sgaCrt = tickets.length;
    const requestSent = appointments.filter(a => a.isRequestSent).length;
    
    const confirmedRate = total > 0 ? (confirmed / total) * 100 : 0;
    const requestSentRate = total > 0 ? (requestSent / total) * 100 : 0;
    
    return { total, confirmed, pending, sgaCrt, confirmedRate, requestSent, requestSentRate };
  }, [appointments, tickets]);

  const chartData = useMemo(() => {
    const last7Days: Record<string, { date: string, total: number, confirmed: number }> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      last7Days[dateStr] = { date: displayDate, total: 0, confirmed: 0 };
    }

    appointments.forEach(app => {
      if (last7Days[app.appointmentDate]) {
        last7Days[app.appointmentDate].total++;
        if (app.isConfirmed) last7Days[app.appointmentDate].confirmed++;
      }
    });

    return Object.values(last7Days);
  }, [appointments]);

  const pieData = useMemo(() => [
    { name: 'Confirmados', value: stats.confirmed },
    { name: 'Pendentes', value: stats.pending }
  ], [stats]);

  const examTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    appointments.forEach(app => {
      types[app.examType] = (types[app.examType] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  return (
    <div className="col-span-1 lg:col-span-12 space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Painel de Controle</h2>
          <p className="text-slate-500 font-medium">Bem-vindo ao sistema de gestão DETRAN-BA.</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm"
        >
          <button 
            onClick={onSync}
            disabled={isLoading}
            className={`p-2 rounded-xl transition-all ${isLoading ? 'bg-slate-50 text-slate-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95'}`}
            title="Sincronizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-100 flex flex-col items-center">
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            {lastSyncTime && <span className="text-[9px] text-indigo-500 mt-0.5">Sincronizado às {lastSyncTime}</span>}
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Agendamentos', value: stats.total, icon: Users, color: 'indigo', trend: '+12%', up: true },
          { label: 'Confirmados', value: stats.confirmed, icon: CheckCircle2, color: 'emerald', trend: `${stats.confirmedRate.toFixed(0)}%`, up: true },
          { label: 'Pedidos Enviados', value: stats.requestSent, icon: TrendingUp, color: 'amber', trend: `${stats.requestSentRate.toFixed(0)}%`, up: true },
          { label: 'Chamados SGA/CRT', value: stats.sgaCrt, icon: Database, color: 'rose', trend: '+2', up: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.trend} {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {stats.total === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[3rem] border border-dashed border-slate-200 text-center space-y-4"
        >
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Nenhum dado para exibir</h3>
          <p className="text-slate-500 max-w-xs mx-auto font-medium">Comece adicionando seu primeiro agendamento para ver as estatísticas aqui.</p>
          <button 
            onClick={() => onNavigate('appointments')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Ir para Agendamentos
          </button>
        </motion.div>
      ) : (
        <>
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Fluxo de Agendamentos</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Últimos 7 dias</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Confirmados</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="confirmed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConfirmed)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Distribution Chart */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col"
            >
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Status Geral</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Distribuição de Confirmações</p>
              
              <div className="flex-1 h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{stats.confirmedRate.toFixed(0)}%</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confirmado</span>
                </div>
              </div>

              <div className="space-y-3 mt-8">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-xs font-bold text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2">Acesso Rápido</h3>
                <p className="text-indigo-100 mb-8 font-medium">Gerencie seus agendamentos e chamados com um clique.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onNavigate('appointments')}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 transition-all flex flex-col gap-3 group/btn"
                  >
                    <Calendar className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Agendamentos</span>
                  </button>
                  <button 
                    onClick={() => onNavigate('tickets')}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 transition-all flex flex-col gap-3 group/btn"
                  >
                    <TicketIcon className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Chamados</span>
                  </button>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="absolute -left-12 -top-12 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Tipos de Exame</h3>
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              
              <div className="space-y-4">
                {examTypeData.map((item, i) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600">{item.name}</span>
                      <span className="text-slate-900">{item.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / stats.total) * 100}%` }}
                        transition={{ duration: 1, delay: 0.8 + (i * 0.1) }}
                        className="h-full bg-indigo-600 rounded-full"
                      />
                    </div>
                  </div>
                ))}
                {examTypeData.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic text-sm">
                    Nenhum dado disponível.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};
