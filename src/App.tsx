/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Key, 
  History, 
  Calendar as CalendarIcon, 
  Plus, 
  LogOut, 
  MapPin, 
  ExternalLink, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval, 
  startOfYear, 
  endOfYear, 
  addWeeks, 
  subWeeks, 
  addYears, 
  subYears,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
type UserRole = 'broker' | 'manager' | 'admin';

interface UserProfile {
  id: number;
  name: string;
  role: UserRole;
}

interface Property {
  id: number;
  di: string;
  address: string;
  description: string;
  link: string;
  status: 'Ativo' | 'Retirada' | 'Negociação' | 'Vendida' | 'Inativa';
  current_key_location: string;
  responsible_broker_id?: number;
}

interface Movement {
  id: number;
  property_id: number;
  type: string;
  timestamp: string;
  broker_name?: string;
  unit?: string;
  observations?: string;
  proposal?: string;
  feedback?: string;
  return_forecast?: string;
  di?: string;
  address?: string;
}

// Components
const Badge = ({ status }: { status: Property['status'] }) => {
  const colors = {
    Ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Retirada: 'bg-amber-100 text-amber-700 border-amber-200',
    Negociação: 'bg-blue-100 text-blue-700 border-blue-200',
    Vendida: 'bg-slate-100 text-slate-700 border-slate-200',
    Inativa: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}>
      {status}
    </span>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<(Property & { movements: Movement[] }) | null>(null);
  const [view, setView] = useState<'search' | 'calendar' | 'admin'>('search');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [activeWithdrawals, setActiveWithdrawals] = useState<any[]>([]);
  const [allMovements, setAllMovements] = useState<Movement[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Form states
  const [withdrawForm, setWithdrawForm] = useState({
    broker_id: '',
    unit: 'Matriz',
    return_forecast: '',
    observations: '',
    proposal: '',
    feedback: ''
  });

  const [returnForm, setReturnForm] = useState({
    unit: 'Matriz',
    observations: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (view === 'calendar') {
      fetchActiveWithdrawals();
      fetchAllMovements();
    }
  }, [view]);

  const fetchAllMovements = async () => {
    const res = await fetch('/api/movements/all');
    const data = await res.json();
    setAllMovements(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
    // Auto-login as first user for demo
    if (data.length > 0 && !currentUser) setCurrentUser(data[0]);
  };

  const fetchProperties = async (query = '') => {
    const res = await fetch(`/api/properties${query ? `?search=${query}` : ''}`);
    const data = await res.json();
    setProperties(data);
  };

  const fetchPropertyDetails = async (id: number) => {
    const res = await fetch(`/api/properties/${id}`);
    const data = await res.json();
    setSelectedProperty(data);
  };

  const fetchActiveWithdrawals = async () => {
    const res = await fetch('/api/movements/active');
    const data = await res.json();
    setActiveWithdrawals(data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties(searchQuery);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const res = await fetch('/api/movements/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: selectedProperty.id,
        ...withdrawForm
      })
    });

    if (res.ok) {
      setIsWithdrawModalOpen(false);
      fetchPropertyDetails(selectedProperty.id);
      fetchProperties(searchQuery);
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const res = await fetch('/api/movements/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: selectedProperty.id,
        ...returnForm
      })
    });

    if (res.ok) {
      setIsReturnModalOpen(false);
      fetchPropertyDetails(selectedProperty.id);
      fetchProperties(searchQuery);
    }
  };

  const handleStatusChange = async (newStatus: Property['status']) => {
    if (!selectedProperty || !currentUser) return;
    const res = await fetch(`/api/properties/${selectedProperty.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, broker_id: currentUser.id })
    });
    if (res.ok) {
      fetchPropertyDetails(selectedProperty.id);
      fetchProperties(searchQuery);
    }
  };

  if (!currentUser) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#020817] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1A55FF] p-2 rounded-lg">
              <Key className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">Diógenes Gestão</h1>
          </div>

          <nav className="flex items-center gap-1 sm:gap-4">
            <button 
              onClick={() => setView('search')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'search' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Imóveis
            </button>
            {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
              <button 
                onClick={() => setView('calendar')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Operacional
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button 
                onClick={() => setView('admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'search' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Pesquisar por DI ou Endereço..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#1A55FF] focus:border-transparent outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#1A55FF] text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                Buscar
              </button>
            </form>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => (
                <motion.div 
                  layoutId={`prop-${prop.id}`}
                  key={prop.id}
                  onClick={() => fetchPropertyDetails(prop.id)}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-[#1A55FF] bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">
                      {prop.di}
                    </span>
                    <Badge status={prop.status} />
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-[#1A55FF] transition-colors">{prop.address}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4">{prop.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{prop.current_key_location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{prop.status === 'Retirada' ? 'Retirada' : 'Disponível'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-[#1A55FF]" />
                Calendário Operacional
              </h2>
              
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {(['day', 'week', 'month', 'year'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCalendarView(v)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                      calendarView === v ? 'bg-[#1A55FF] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              {/* Calendar Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold capitalize">
                    {format(calendarDate, calendarView === 'year' ? 'yyyy' : calendarView === 'month' ? 'MMMM yyyy' : 'dd MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        if (calendarView === 'day') setCalendarDate(addDays(calendarDate, -1));
                        if (calendarView === 'week') setCalendarDate(addWeeks(calendarDate, -1));
                        if (calendarView === 'month') setCalendarDate(subMonths(calendarDate, 1));
                        if (calendarView === 'year') setCalendarDate(subYears(calendarDate, 1));
                      }}
                      className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <button 
                      onClick={() => setCalendarDate(new Date())}
                      className="px-3 py-1 text-xs font-bold text-[#1A55FF] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => {
                        if (calendarView === 'day') setCalendarDate(addDays(calendarDate, 1));
                        if (calendarView === 'week') setCalendarDate(addWeeks(calendarDate, 1));
                        if (calendarView === 'month') setCalendarDate(addMonths(calendarDate, 1));
                        if (calendarView === 'year') setCalendarDate(addYears(calendarDate, 1));
                      }}
                      className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="text-slate-500">Retirada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-slate-500">Devolução</span>
                  </div>
                </div>
              </div>

              {/* Calendar Body */}
              <div className="flex-1 overflow-auto">
                {calendarView === 'month' && (
                  <div className="grid grid-cols-7 h-full min-w-[700px]">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                      <div key={day} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const monthStart = startOfMonth(calendarDate);
                      const monthEnd = endOfMonth(monthStart);
                      const startDate = startOfWeek(monthStart);
                      const endDate = endOfWeek(monthEnd);
                      const rows = [];
                      let days = [];
                      let day = startDate;

                      while (day <= endDate) {
                        for (let i = 0; i < 7; i++) {
                          const formattedDate = format(day, 'd');
                          const cloneDay = day;
                          const dayMovements = allMovements.filter(m => isSameDay(parseISO(m.timestamp), cloneDay));
                          
                          days.push(
                            <div
                              key={day.toString()}
                              className={`min-h-[100px] p-2 border-r border-b border-slate-100 transition-colors ${
                                !isSameMonth(day, monthStart) ? 'bg-slate-50/50' : 'bg-white'
                              } ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                  isToday(day) ? 'bg-[#1A55FF] text-white' : 'text-slate-700'
                                }`}>
                                  {formattedDate}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {dayMovements.map((m, idx) => (
                                  <div 
                                    key={idx}
                                    onClick={() => fetchPropertyDetails(m.property_id)}
                                    className={`text-[10px] p-1 rounded border cursor-pointer truncate transition-transform hover:scale-[1.02] ${
                                      m.type === 'Retirada' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                                      m.type === 'Devolução' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                                      'bg-blue-50 border-blue-200 text-blue-700'
                                    }`}
                                  >
                                    <span className="font-bold">{m.di}</span> - {m.type}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                          day = addDays(day, 1);
                        }
                        rows.push(<React.Fragment key={day.toString()}>{days}</React.Fragment>);
                        days = [];
                      }
                      return rows;
                    })()}
                  </div>
                )}

                {calendarView === 'week' && (
                  <div className="grid grid-cols-7 h-full min-w-[700px]">
                    {(() => {
                      const startDate = startOfWeek(calendarDate);
                      const days = [];
                      for (let i = 0; i < 7; i++) {
                        const day = addDays(startDate, i);
                        const dayMovements = allMovements.filter(m => isSameDay(parseISO(m.timestamp), day));
                        days.push(
                          <div key={i} className="flex flex-col h-full border-r border-slate-100">
                            <div className={`p-4 text-center border-b border-slate-100 ${isToday(day) ? 'bg-blue-50' : 'bg-slate-50/30'}`}>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(day, 'EEE', { locale: ptBR })}</p>
                              <p className={`text-xl font-black mt-1 ${isToday(day) ? 'text-[#1A55FF]' : 'text-slate-700'}`}>{format(day, 'd')}</p>
                            </div>
                            <div className="flex-1 p-2 space-y-2 bg-white">
                              {dayMovements.map((m, idx) => (
                                <div 
                                  key={idx}
                                  onClick={() => fetchPropertyDetails(m.property_id)}
                                  className={`p-3 rounded-xl border cursor-pointer shadow-sm transition-all hover:shadow-md ${
                                    m.type === 'Retirada' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                                    m.type === 'Devolução' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                                    'bg-blue-50 border-blue-200 text-blue-700'
                                  }`}
                                >
                                  <p className="text-[10px] font-black uppercase tracking-tighter">{m.di}</p>
                                  <p className="text-xs font-bold mt-1">{m.type}</p>
                                  <p className="text-[10px] opacity-70 mt-1">{format(parseISO(m.timestamp), 'HH:mm')}</p>
                                  {m.broker_name && <p className="text-[10px] font-medium mt-2 border-t border-current/10 pt-1">{m.broker_name}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return days;
                    })()}
                  </div>
                )}

                {calendarView === 'day' && (
                  <div className="h-full bg-white p-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                        <div className="w-16 h-16 rounded-2xl bg-[#1A55FF] text-white flex flex-col items-center justify-center shadow-lg shadow-blue-200">
                          <span className="text-xs font-bold uppercase">{format(calendarDate, 'MMM', { locale: ptBR })}</span>
                          <span className="text-2xl font-black">{format(calendarDate, 'd')}</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black capitalize">{format(calendarDate, 'EEEE', { locale: ptBR })}</h3>
                          <p className="text-slate-500 font-medium">{format(calendarDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {allMovements.filter(m => isSameDay(parseISO(m.timestamp), calendarDate)).length === 0 ? (
                          <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CalendarIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-400 italic">Nenhuma movimentação registrada para este dia.</p>
                          </div>
                        ) : (
                          allMovements.filter(m => isSameDay(parseISO(m.timestamp), calendarDate)).map((m, idx) => (
                            <div 
                              key={idx}
                              onClick={() => fetchPropertyDetails(m.property_id)}
                              className="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-[#1A55FF] hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer bg-white"
                            >
                              <div className="pt-1">
                                <div className={`w-3 h-3 rounded-full mt-1.5 ${
                                  m.type === 'Retirada' ? 'bg-amber-400' : 
                                  m.type === 'Devolução' ? 'bg-emerald-400' : 'bg-blue-400'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[10px] font-black text-[#1A55FF] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{m.di}</span>
                                    <h4 className="font-bold text-lg mt-1 group-hover:text-[#1A55FF] transition-colors">{m.address}</h4>
                                  </div>
                                  <span className="text-sm font-black text-slate-400">{format(parseISO(m.timestamp), 'HH:mm')}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-3">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="font-bold">{m.broker_name || 'Sistema'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{m.unit || 'N/A'}</span>
                                  </div>
                                </div>
                                {m.observations && (
                                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 italic">
                                    "{m.observations}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {calendarView === 'year' && (
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 bg-white">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const month = addMonths(startOfYear(calendarDate), i);
                      return (
                        <div key={i} className="space-y-4">
                          <h4 className="font-black text-sm uppercase tracking-widest text-[#1A55FF] border-b border-blue-100 pb-2">{format(month, 'MMMM', { locale: ptBR })}</h4>
                          <div className="grid grid-cols-7 gap-1">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                              <div key={d} className="text-[8px] font-black text-slate-300 text-center">{d}</div>
                            ))}
                            {(() => {
                              const startDate = startOfWeek(startOfMonth(month));
                              const endDate = endOfWeek(endOfMonth(month));
                              const days = [];
                              let day = startDate;
                              while (day <= endDate) {
                                const isCurrentMonth = isSameMonth(day, month);
                                const hasMovements = allMovements.some(m => isSameDay(parseISO(m.timestamp), day));
                                days.push(
                                  <div 
                                    key={day.toString()}
                                    onClick={() => {
                                      if (isCurrentMonth) {
                                        setCalendarDate(day);
                                        setCalendarView('day');
                                      }
                                    }}
                                    className={`aspect-square flex items-center justify-center text-[10px] rounded-full cursor-pointer transition-all ${
                                      !isCurrentMonth ? 'text-slate-200 pointer-events-none' : 
                                      isToday(day) ? 'bg-[#1A55FF] text-white font-bold' : 
                                      hasMovements ? 'bg-blue-50 text-[#1A55FF] font-bold hover:bg-blue-100' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {format(day, 'd')}
                                  </div>
                                );
                                day = addDays(day, 1);
                              }
                              return days;
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Painel Administrativo</h2>
              <button className="bg-[#1A55FF] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-600 transition-colors">
                <Plus className="w-5 h-5" />
                Novo Imóvel
              </button>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">DI</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Local Chave</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {properties.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-sm text-[#1A55FF]">{p.di}</td>
                      <td className="px-6 py-4 text-sm font-medium">{p.address}</td>
                      <td className="px-6 py-4"><Badge status={p.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-500">{p.current_key_location}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-[#1A55FF] transition-colors p-1">
                          <Filter className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Property Details Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProperty(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              layoutId={`prop-${selectedProperty.id}`}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col"
            >
              <button 
                onClick={() => setSelectedProperty(null)}
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left Column: Info */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-black text-[#1A55FF] bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">
                          {selectedProperty.di}
                        </span>
                        <Badge status={selectedProperty.status} />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight leading-tight">{selectedProperty.address}</h2>
                      <a 
                        href={selectedProperty.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#1A55FF] text-sm font-bold mt-2 hover:underline"
                      >
                        Ver anúncio no site
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Descrição</h4>
                      <p className="text-slate-700 leading-relaxed">{selectedProperty.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Localização da Chave</p>
                        <p className="font-bold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#1A55FF]" />
                          {selectedProperty.current_key_location}
                        </p>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Situação Atual</p>
                        <p className="font-bold flex items-center gap-2">
                          {selectedProperty.status === 'Retirada' ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              Chave Retirada
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Disponível
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                      {selectedProperty.status !== 'Retirada' && selectedProperty.status !== 'Inativa' && (
                        <button 
                          onClick={() => setIsWithdrawModalOpen(true)}
                          className="flex-1 bg-[#1A55FF] text-white py-3 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                        >
                          <Key className="w-5 h-5" />
                          Registrar Retirada
                        </button>
                      )}
                      {selectedProperty.status === 'Retirada' && (
                        <button 
                          onClick={() => setIsReturnModalOpen(true)}
                          className="flex-1 bg-[#48E66F] text-white py-3 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-200"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Registrar Devolução
                        </button>
                      )}
                      {currentUser.role === 'admin' && (
                        <div className="w-full flex gap-2">
                          <select 
                            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none"
                            value={selectedProperty.status}
                            onChange={(e) => handleStatusChange(e.target.value as any)}
                          >
                            <option value="Ativo">Marcar como Ativo</option>
                            <option value="Negociação">Em Negociação</option>
                            <option value="Vendida">Marcar como Vendida</option>
                            <option value="Inativa">Inativar Imóvel</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: History */}
                  <div className="w-full md:w-80 flex flex-col h-full">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <History className="w-5 h-5 text-slate-400" />
                      Histórico
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {selectedProperty.movements.map((m) => (
                        <div key={m.id} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-0">
                          <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                            m.type === 'Retirada' ? 'bg-amber-400' : 
                            m.type === 'Devolução' ? 'bg-emerald-400' : 'bg-blue-400'
                          }`} />
                          <div className="bg-slate-50 rounded-xl p-3 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-800">{m.type}</span>
                              <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p className="text-slate-600 mb-1">
                              {m.broker_name && <span className="font-semibold">{m.broker_name}</span>}
                              {m.unit && <span> na unidade <span className="font-semibold">{m.unit}</span></span>}
                            </p>
                            {m.observations && <p className="italic text-slate-500 mt-1 border-t border-slate-200 pt-1">"{m.observations}"</p>}
                          </div>
                        </div>
                      ))}
                      {selectedProperty.movements.length === 0 && (
                        <p className="text-center text-slate-400 text-sm italic py-8">Nenhuma movimentação registrada.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleWithdraw}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
            >
              <h3 className="text-2xl font-black">Registrar Retirada</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Corretor Responsável</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={withdrawForm.broker_id}
                    onChange={(e) => setWithdrawForm({...withdrawForm, broker_id: e.target.value})}
                  >
                    <option value="">Selecione um corretor</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Unidade</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={withdrawForm.unit}
                      onChange={(e) => setWithdrawForm({...withdrawForm, unit: e.target.value})}
                    >
                      <option value="Lago Norte">Lago Norte</option>
                      <option value="Matriz">Matriz</option>
                      <option value="SCS">SCS</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Previsão Devolução</label>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={withdrawForm.return_forecast}
                      onChange={(e) => setWithdrawForm({...withdrawForm, return_forecast: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Observações / Proposta</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF] h-24 resize-none"
                    placeholder="Notas adicionais..."
                    value={withdrawForm.observations}
                    onChange={(e) => setWithdrawForm({...withdrawForm, observations: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#1A55FF] text-white py-3 font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                >
                  Confirmar Retirada
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Return Modal */}
      <AnimatePresence>
        {isReturnModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReturnModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleReturn}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
            >
              <h3 className="text-2xl font-black">Registrar Devolução</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Unidade de Devolução</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#48E66F]"
                    value={returnForm.unit}
                    onChange={(e) => setReturnForm({...returnForm, unit: e.target.value})}
                  >
                    <option value="Lago Norte">Lago Norte</option>
                    <option value="Matriz">Matriz</option>
                    <option value="SCS">SCS</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Feedback / Observações</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#48E66F] h-32 resize-none"
                    placeholder="Como foi a visita? Algum feedback do cliente?"
                    value={returnForm.observations}
                    onChange={(e) => setReturnForm({...returnForm, observations: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#48E66F] text-white py-3 font-bold rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-200"
                >
                  Confirmar Devolução
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
