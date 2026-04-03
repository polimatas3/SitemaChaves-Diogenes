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
  MapPin,
  ExternalLink,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  Trash2,
  Pencil,
  Check,
  SlidersHorizontal,
  Phone,
  Mail
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
  startOfYear,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from './lib/supabase';
import ContratosView from './ContratosView';

// Types
type UserRole = 'atendente' | 'gerente';

interface UserProfile {
  id: number;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
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
  has_key: boolean;
  occupation_type?: string;
  captador_name?: string;
  captador_email?: string;
  captador_phone?: string;
  sale_price?: number;
  selling_broker_id?: number;
  sold_at?: string;
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
  withdrawal_datetime?: string;
  return_datetime?: string;
  event_time?: string;
  di?: string;
  address?: string;
  client_name?: string;
  client_phone?: string;
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

const LocationBadge = ({ location }: { location: string }) => {
  const colors: Record<string, string> = {
    'Matriz':     'bg-violet-100 text-violet-700 border-violet-200',
    'Lago Norte': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'SCS':        'bg-orange-100 text-orange-700 border-orange-200',
  };
  const cls = colors[location] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {location}
    </span>
  );
};

export default function App({ currentUser }: { currentUser: UserProfile }) {
  const isGerente = currentUser.role === 'gerente';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<(Property & { movements: Movement[] }) | null>(null);
  const [view, setView] = useState<'search' | 'calendar' | 'admin' | 'vendas' | 'contratos'>('search');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [isAddBrokerModalOpen, setIsAddBrokerModalOpen] = useState(false);
  const [isEditingBroker, setIsEditingBroker] = useState(false);
  const [editingBrokerId, setEditingBrokerId] = useState<number | null>(null);
  const [activeWithdrawals, setActiveWithdrawals] = useState<any[]>([]);
  const [allMovements, setAllMovements] = useState<Movement[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [filters, setFilters] = useState({ status: '', location: '', brokerId: '', occupation: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({ sale_price: '', selling_broker_id: '' });
  const [soldProperties, setSoldProperties] = useState<any[]>([]);

  // Form states
  const [withdrawForm, setWithdrawForm] = useState({
    broker_id: '',
    client_name: '',
    client_phone: '',
    unit: 'Matriz',
    withdrawal_datetime: '',
    return_forecast: '',
    observations: '',
    proposal: '',
    feedback: ''
  });

  const [returnForm, setReturnForm] = useState({
    unit: 'Matriz',
    return_datetime: '',
    observations: ''
  });

  const [addPropertyForm, setAddPropertyForm] = useState({
    di: '',
    address: '',
    description: '',
    link: '',
    has_key: true,
    occupation_type: '',
    current_key_location: 'Matriz',
    captador_name: '',
    captador_email: '',
    captador_phone: '',
  });
  const [addBrokerForm, setAddBrokerForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [diError, setDiError] = useState('');
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [editPropertyForm, setEditPropertyForm] = useState({ di: '', address: '', description: '', link: '', current_key_location: '' });

  // --- Helpers ---

  // Converte datetime-local (sem fuso) para UTC compensando BRT (UTC-3)
  const addBRTOffset = (datetimeLocal: string): string | null => {
    if (!datetimeLocal) return null;
    return new Date(new Date(datetimeLocal + ':00Z').getTime() + 3 * 60 * 60 * 1000).toISOString();
  };

  // --- Fetch functions ---

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) setUsers(data);
  };

  const fetchProperties = async (query = '', f = filters) => {
    let q = supabase.from('properties').select('*');
    if (query) q = q.or(`di.ilike.%${query}%,address.ilike.%${query}%`);
    if (f.status)   q = q.eq('status', f.status);
    if (f.location) q = q.eq('current_key_location', f.location);
    if (f.brokerId) q = q.eq('responsible_broker_id', parseInt(f.brokerId));
    if (f.occupation === 'com_chave')    q = q.eq('has_key', true);
    else if (f.occupation === 'sem_chave')   q = q.eq('has_key', false);
    else if (f.occupation === 'inquilino')   q = q.eq('has_key', false).eq('occupation_type', 'Inquilino');
    else if (f.occupation === 'proprietario') q = q.eq('has_key', false).eq('occupation_type', 'Proprietário');
    const { data } = await q;
    if (data) setProperties(data);
  };

  const fetchPropertyDetails = async (id: number) => {
    const [{ data: property }, { data: movs }] = await Promise.all([
      supabase.from('properties').select('*').eq('id', id).single(),
      supabase
        .from('movements')
        .select('*, users!broker_id(name)')
        .eq('property_id', id)
        .order('id', { ascending: false }),
    ]);

    if (property) {
      const movements = (movs || []).map((m: any) => ({
        ...m,
        broker_name: m.users?.name,
      }));
      setSelectedProperty({ ...property, movements });
    }
  };

  const fetchActiveWithdrawals = async () => {
    const { data: activeProps } = await supabase
      .from('properties')
      .select('id, di, address')
      .eq('status', 'Retirada');

    if (activeProps && activeProps.length > 0) {
      const propIds = activeProps.map((p: any) => p.id);
      const { data: movements } = await supabase
        .from('movements')
        .select('*, users!broker_id(name)')
        .eq('type', 'Retirada')
        .in('property_id', propIds)
        .order('timestamp', { ascending: false });

      const formatted = (movements || []).map((m: any) => {
        const prop = activeProps.find((p: any) => p.id === m.property_id);
        return {
          ...m,
          di: prop?.di,
          address: prop?.address,
          broker_name: m.users?.name,
        };
      });
      setActiveWithdrawals(formatted);
    } else {
      setActiveWithdrawals([]);
    }
  };

  const fetchAllMovements = async () => {
    const { data } = await supabase
      .from('movements')
      .select('*, properties(di, address), users!broker_id(name)')
      .in('type', ['Retirada', 'Devolução'])
      .order('timestamp', { ascending: true });

    if (data) {
      const formatted = data
        .map((m: any) => {
          const event_time =
            (m.type === 'Retirada' ? m.withdrawal_datetime : m.return_datetime) ||
            m.timestamp;
          return {
            ...m,
            di: m.properties?.di,
            address: m.properties?.address,
            broker_name: m.users?.name,
            event_time,
          };
        })
        .sort((a: any, b: any) =>
          new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
        );

      // Gera entradas sintéticas de "Previsão" para retiradas sem devolução posterior
      const forecasts = formatted
        .filter((m: any) => {
          if (m.type !== 'Retirada' || !m.return_forecast) return false;
          const hasReturn = formatted.some((r: any) =>
            r.type === 'Devolução' &&
            r.property_id === m.property_id &&
            new Date(r.event_time) > new Date(m.event_time)
          );
          return !hasReturn;
        })
        .map((m: any) => ({
          ...m,
          id: `forecast-${m.id}`,
          type: 'Previsão',
          event_time: m.return_forecast,
        }));

      setAllMovements(
        [...formatted, ...forecasts].sort((a: any, b: any) =>
          new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
        )
      );
    }
  };

  const fetchSoldProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*, selling_broker:selling_broker_id(name)')
      .eq('status', 'Vendida')
      .order('sold_at', { ascending: false });
    if (data) setSoldProperties(data);
  };

  // --- Effects ---

  useEffect(() => {
    fetchUsers();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (view === 'calendar') {
      fetchActiveWithdrawals();
      fetchAllMovements();
    }
    if (view === 'vendas') {
      fetchSoldProperties();
    }
  }, [view]);

  // Supabase Realtime — live updates
  useEffect(() => {
    const channel = supabase
      .channel('live-changes')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'properties' },
        () => fetchProperties(searchQuery)
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'movements' },
        () => {
          fetchActiveWithdrawals();
          if (view === 'calendar') fetchAllMovements();
          if (selectedProperty) fetchPropertyDetails(selectedProperty.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [searchQuery, view, selectedProperty?.id, filters]);

  // --- Handlers ---

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties(searchQuery);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const broker_id = parseInt(withdrawForm.broker_id);

    const { error: propError } = await supabase
      .from('properties')
      .update({ status: 'Retirada', responsible_broker_id: broker_id })
      .eq('id', selectedProperty.id);

    if (propError) { alert(propError.message); return; }

    const { error: movError } = await supabase.from('movements').insert({
      property_id: selectedProperty.id,
      type: 'Retirada',
      broker_id,
      unit: withdrawForm.unit,
      withdrawal_datetime: addBRTOffset(withdrawForm.withdrawal_datetime),
      return_forecast: addBRTOffset(withdrawForm.return_forecast),
      observations: withdrawForm.observations || null,
      proposal: withdrawForm.proposal || null,
      feedback: withdrawForm.feedback || null,
      client_name: withdrawForm.client_name?.trim() || null,
      client_phone: withdrawForm.client_phone?.trim() || null,
    });

    if (movError) { alert(movError.message); return; }

    setIsWithdrawModalOpen(false);
    setWithdrawForm({ broker_id: '', client_name: '', client_phone: '', unit: 'Matriz', withdrawal_datetime: '', return_forecast: '', observations: '', proposal: '', feedback: '' });
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    await supabase
      .from('properties')
      .update({ status: 'Ativo', current_key_location: returnForm.unit, responsible_broker_id: null })
      .eq('id', selectedProperty.id);

    await supabase.from('movements').insert({
      property_id: selectedProperty.id,
      type: 'Devolução',
      unit: returnForm.unit,
      return_datetime: addBRTOffset(returnForm.return_datetime),
      observations: returnForm.observations || null,
    });

    setIsReturnModalOpen(false);
    setReturnForm({ unit: 'Matriz', return_datetime: '', observations: '' });
  };

  const handleStatusChange = async (newStatus: Property['status']) => {
    if (!selectedProperty || !currentUser) return;

    await supabase
      .from('properties')
      .update({ status: newStatus })
      .eq('id', selectedProperty.id);

    await supabase.from('movements').insert({
      property_id: selectedProperty.id,
      type: 'Status',
      broker_id: currentUser.id,
      observations: `Status alterado para ${newStatus}`,
    });
  };

  const handleSellProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    await supabase.from('properties').update({
      status: 'Vendida',
      sale_price: parseFloat(saleForm.sale_price),
      selling_broker_id: parseInt(saleForm.selling_broker_id),
      sold_at: new Date().toISOString(),
    }).eq('id', selectedProperty.id);

    await supabase.from('movements').insert({
      property_id: selectedProperty.id,
      type: 'Status',
      broker_id: currentUser.id,
      observations: `Vendida por R$ ${parseFloat(saleForm.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    });

    setIsSaleModalOpen(false);
    setSaleForm({ sale_price: '', selling_broker_id: '' });
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('properties').insert({
      di: addPropertyForm.di,
      address: addPropertyForm.address,
      description: addPropertyForm.description,
      link: addPropertyForm.link || null,
      has_key: addPropertyForm.has_key,
      occupation_type: addPropertyForm.has_key ? null : (addPropertyForm.occupation_type || null),
      current_key_location: addPropertyForm.has_key ? addPropertyForm.current_key_location : null,
      captador_name:  addPropertyForm.captador_name  || null,
      captador_email: addPropertyForm.captador_email || null,
      captador_phone: addPropertyForm.captador_phone || null,
      status: 'Ativo',
    });

    if (error) {
      if (error.code === '23505') {
        setDiError(`O código "${addPropertyForm.di}" já existe no sistema.`);
      } else {
        alert(error.message);
      }
      return;
    }

    setIsAddPropertyModalOpen(false);
    setDiError('');
    setAddPropertyForm({ di: '', address: '', description: '', link: '', has_key: true, occupation_type: '', current_key_location: 'Matriz', captador_name: '', captador_email: '', captador_phone: '' });
  };

  const handleSaveEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const { error } = await supabase
      .from('properties')
      .update({
        di: editPropertyForm.di,
        address: editPropertyForm.address,
        description: editPropertyForm.description,
        link: editPropertyForm.link,
        current_key_location: editPropertyForm.current_key_location,
      })
      .eq('id', selectedProperty.id);

    if (error) { alert(error.message); return; }
    setIsEditingProperty(false);
  };

  const handleDeleteProperty = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este imóvel? Esta ação não pode ser desfeita.')) return;
    await supabase.from('properties').delete().eq('id', id);
  };

  const handleAddBroker = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('users').insert({
      name: addBrokerForm.name,
      email: addBrokerForm.email || null,
      phone: addBrokerForm.phone || null,
      role: 'atendente',
    });

    if (error) { alert(error.message); return; }

    setIsAddBrokerModalOpen(false);
    setAddBrokerForm({ name: '', email: '', phone: '' });
    fetchUsers();
  };

  const handleEditBroker = (broker: UserProfile) => {
    setEditingBrokerId(broker.id);
    setAddBrokerForm({
      name: broker.name,
      email: broker.email || '',
      phone: broker.phone || '',
    });
    setIsEditingBroker(true);
    setIsAddBrokerModalOpen(true);
  };

  const handleSaveEditBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrokerId) return;

    const { error } = await supabase
      .from('users')
      .update({
        name: addBrokerForm.name,
        email: addBrokerForm.email || null,
        phone: addBrokerForm.phone || null,
      })
      .eq('id', editingBrokerId);

    if (error) {
      alert(error.message);
      return;
    }

    setIsAddBrokerModalOpen(false);
    setIsEditingBroker(false);
    setEditingBrokerId(null);
    setAddBrokerForm({ name: '', email: '', phone: '' });
    fetchUsers();
  };

  const handleDeleteBroker = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este corretor? Esta ação não pode ser desfeita.')) return;
    await supabase.from('users').delete().eq('id', id);
    fetchUsers();
  };

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
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Operacional
            </button>
            <button
              onClick={() => setView('admin')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Admin
            </button>
            {isGerente && (
              <button
                onClick={() => setView('vendas')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'vendas' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Vendas
              </button>
            )}
            <button
              onClick={() => setView('contratos')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'contratos' ? 'bg-slate-100 text-[#1A55FF]' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Contratos
            </button>
          </nav>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.role === 'gerente' ? 'Gerente' : 'Atendente'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-slate-500 hover:text-rose-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-rose-50"
              title="Sair da conta"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'search' && (
          <div className="space-y-6">
            {/* Search Bar + Filters */}
            <div className="max-w-2xl mx-auto space-y-2">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Pesquisar por DI ou Endereço..."
                  className="w-full pl-12 pr-28 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#1A55FF] focus:border-transparent outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value === '') fetchProperties('');
                  }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`relative p-2 rounded-xl transition-colors ${showFilters ? 'bg-[#1A55FF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    title="Filtros"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {Object.values(filters).some(v => v !== '') && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                    )}
                  </button>
                  <button type="submit" className="bg-[#1A55FF] text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                    Buscar
                  </button>
                </div>
              </form>

              {showFilters && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A55FF]"
                        value={filters.status}
                        onChange={(e) => { const f = {...filters, status: e.target.value}; setFilters(f); fetchProperties(searchQuery, f); }}
                      >
                        <option value="">Todos</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Retirada">Retirada</option>
                        <option value="Negociação">Negociação</option>
                        <option value="Vendida">Vendida</option>
                        <option value="Inativa">Inativa</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Localização</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A55FF]"
                        value={filters.location}
                        onChange={(e) => { const f = {...filters, location: e.target.value}; setFilters(f); fetchProperties(searchQuery, f); }}
                      >
                        <option value="">Todas</option>
                        <option value="Matriz">Matriz</option>
                        <option value="Lago Norte">Lago Norte</option>
                        <option value="SCS">SCS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Corretor</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A55FF]"
                        value={filters.brokerId}
                        onChange={(e) => { const f = {...filters, brokerId: e.target.value}; setFilters(f); fetchProperties(searchQuery, f); }}
                      >
                        <option value="">Todos</option>
                        {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ocupação</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A55FF]"
                        value={filters.occupation}
                        onChange={(e) => { const f = {...filters, occupation: e.target.value}; setFilters(f); fetchProperties(searchQuery, f); }}
                      >
                        <option value="">Todos</option>
                        <option value="com_chave">Com chave</option>
                        <option value="sem_chave">Sem chave</option>
                        <option value="inquilino">Sem chave · Inquilino</option>
                        <option value="proprietario">Sem chave · Proprietário</option>
                      </select>
                    </div>
                  </div>
                  {Object.values(filters).some(v => v !== '') && (
                    <button
                      type="button"
                      onClick={() => { const f = { status: '', location: '', brokerId: '', occupation: '' }; setFilters(f); fetchProperties(searchQuery, f); }}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => (
                <motion.div
                  layoutId={`prop-${prop.id}`}
                  key={prop.id}
                  onClick={() => fetchPropertyDetails(prop.id)}
                  className={`bg-white rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
                    prop.status === 'Retirada'  ? 'border-amber-400 shadow-amber-100' :
                    prop.status === 'Ativo'     ? 'border-emerald-400 shadow-emerald-100' :
                    prop.status === 'Inativa'   ? 'border-rose-400 shadow-rose-100' :
                    'border-slate-200'
                  }`}
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
                    {prop.has_key ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <LocationBadge location={prop.current_key_location} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{prop.status === 'Retirada' ? 'Retirada' : 'Disponível'}</span>
                        </div>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200">
                        Ocupado · {prop.occupation_type || 'Sem chave'}
                      </span>
                    )}
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
                        if (calendarView === 'week') setCalendarDate(subWeeks(calendarDate, 1));
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
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-violet-400 border border-dashed border-violet-500" />
                    <span className="text-slate-500">Prev. Devolução</span>
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
                          const dayMovements = allMovements.filter(m => isSameDay(parseISO(m.event_time || m.timestamp), cloneDay));

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
                                      m.type === 'Previsão' ? 'bg-violet-50 border-violet-200 text-violet-700 border-dashed' :
                                      'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    }`}
                                  >
                                    <span className="font-bold">{format(parseISO(m.event_time || m.timestamp), 'HH:mm')}</span> · <span className="font-bold">{m.di}</span> · {m.type}
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
                        const dayMovements = allMovements.filter(m => isSameDay(parseISO(m.event_time || m.timestamp), day));
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
                                    m.type === 'Previsão' ? 'bg-violet-50 border-violet-200 text-violet-700 border-dashed' :
                                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  <p className="text-[10px] font-black opacity-70">{format(parseISO(m.event_time || m.timestamp), 'HH:mm')}</p>
                                  <p className="text-[10px] font-black uppercase tracking-tighter mt-0.5">{m.di}</p>
                                  <p className="text-xs font-bold mt-1">{m.type}</p>
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
                        {allMovements.filter(m => isSameDay(parseISO(m.event_time || m.timestamp), calendarDate)).length === 0 ? (
                          <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CalendarIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-400 italic">Nenhuma movimentação registrada para este dia.</p>
                          </div>
                        ) : (
                          allMovements.filter(m => isSameDay(parseISO(m.event_time || m.timestamp), calendarDate)).map((m, idx) => (
                            <div
                              key={idx}
                              onClick={() => fetchPropertyDetails(m.property_id)}
                              className="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-[#1A55FF] hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer bg-white"
                            >
                              <div className="pt-1">
                                <div className={`w-3 h-3 rounded-full mt-1.5 ${
                                  m.type === 'Retirada' ? 'bg-amber-400' :
                                  m.type === 'Devolução' ? 'bg-emerald-400' :
                                  m.type === 'Previsão' ? 'bg-violet-400' : 'bg-blue-400'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[10px] font-black text-[#1A55FF] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{m.di}</span>
                                    <h4 className="font-bold text-lg mt-1 group-hover:text-[#1A55FF] transition-colors">{m.address}</h4>
                                  </div>
                                  <span className="text-sm font-black text-slate-400">{format(parseISO(m.event_time || m.timestamp), 'HH:mm')}</span>
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
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, di) => (
                              <div key={di} className="text-[8px] font-black text-slate-300 text-center">{d}</div>
                            ))}
                            {(() => {
                              const startDate = startOfWeek(startOfMonth(month));
                              const endDate = endOfWeek(endOfMonth(month));
                              const days = [];
                              let day = startDate;
                              while (day <= endDate) {
                                const isCurrentMonth = isSameMonth(day, month);
                                const hasMovements = allMovements.some(m => isSameDay(parseISO(m.event_time || m.timestamp), day));
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

        {view === 'vendas' && isGerente && (() => {
          const totalCount = soldProperties.length;
          const totalValue = soldProperties.reduce((sum, p) => sum + (p.sale_price || 0), 0);
          const avgTicket = totalCount > 0 ? totalValue / totalCount : 0;

          // Top broker
          const brokerCounts: Record<string, number> = {};
          soldProperties.forEach(p => {
            const name = p.selling_broker?.name || 'Desconhecido';
            brokerCounts[name] = (brokerCounts[name] || 0) + 1;
          });
          const topBroker = Object.entries(brokerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

          // Vendas por mês (últimos 6 meses)
          const monthlyMap: Record<string, number> = {};
          const monthlyValueMap: Record<string, number> = {};
          soldProperties.forEach(p => {
            if (!p.sold_at) return;
            const key = format(parseISO(p.sold_at), 'MMM/yy', { locale: ptBR });
            monthlyMap[key] = (monthlyMap[key] || 0) + 1;
            monthlyValueMap[key] = (monthlyValueMap[key] || 0) + (p.sale_price || 0);
          });
          const monthKeys = Object.keys(monthlyMap);
          const maxMonth = Math.max(...Object.values(monthlyMap), 1);

          // Vendas por corretor
          const brokerKeys = Object.keys(brokerCounts);
          const maxBroker = Math.max(...Object.values(brokerCounts), 1);

          // Valor acumulado por mês (SVG polyline)
          let accumulated = 0;
          const accPoints = monthKeys.map(k => {
            accumulated += monthlyValueMap[k];
            return accumulated;
          });
          const maxAcc = Math.max(...accPoints, 1);
          const svgW = 600;
          const svgH = 160;
          const polylinePoints = accPoints.map((v, i) => {
            const x = monthKeys.length > 1 ? (i / (monthKeys.length - 1)) * svgW : svgW / 2;
            const y = svgH - (v / maxAcc) * (svgH - 20) - 10;
            return `${x},${y}`;
          }).join(' ');

          return (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-[#1A55FF]">▲</span> Painel de Vendas
              </h2>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total de Vendas', value: String(totalCount), color: 'bg-violet-50 border-violet-200 text-violet-700' },
                  { label: 'Valor Total', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { label: 'Ticket Médio', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { label: 'Corretor Destaque', value: topBroker, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                ].map(card => (
                  <div key={card.label} className={`p-5 rounded-2xl border ${card.color} bg-white`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{card.label}</p>
                    <p className="text-xl font-black truncate">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vendas por mês */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Vendas por Mês</h3>
                  {monthKeys.length === 0 ? (
                    <p className="text-slate-400 text-sm italic text-center py-8">Sem dados</p>
                  ) : (
                    <div className="flex items-end gap-2 h-48">
                      {monthKeys.map(k => (
                        <div key={k} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-xs font-bold text-[#1A55FF]">{monthlyMap[k]}</span>
                          <div
                            className="w-full bg-[#1A55FF] rounded-t-lg transition-all"
                            style={{ height: `${(monthlyMap[k] / maxMonth) * 160}px`, minHeight: 4 }}
                          />
                          <span className="text-[9px] text-slate-400 font-medium capitalize">{k}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vendas por corretor */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Vendas por Corretor</h3>
                  {brokerKeys.length === 0 ? (
                    <p className="text-slate-400 text-sm italic text-center py-8">Sem dados</p>
                  ) : (
                    <div className="flex items-end gap-2 h-48">
                      {brokerKeys.map(k => (
                        <div key={k} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-xs font-bold text-emerald-600">{brokerCounts[k]}</span>
                          <div
                            className="w-full bg-emerald-500 rounded-t-lg transition-all"
                            style={{ height: `${(brokerCounts[k] / maxBroker) * 160}px`, minHeight: 4 }}
                          />
                          <span className="text-[9px] text-slate-400 font-medium text-center leading-tight">{k}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valor acumulado por mês — SVG */}
              {monthKeys.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Valor Acumulado por Mês</h3>
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 300, height: svgH }}>
                      <polyline
                        fill="none"
                        stroke="#1A55FF"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={polylinePoints}
                      />
                      {accPoints.map((v, i) => {
                        const x = monthKeys.length > 1 ? (i / (monthKeys.length - 1)) * svgW : svgW / 2;
                        const y = svgH - (v / maxAcc) * (svgH - 20) - 10;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="5" fill="#1A55FF" />
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#1A55FF" fontWeight="bold">
                              {`R$${(v / 1000).toFixed(0)}k`}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    <div className="flex justify-between mt-1">
                      {monthKeys.map(k => (
                        <span key={k} className="text-[9px] text-slate-400 capitalize flex-1 text-center">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela de vendas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">DI</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Corretor</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {soldProperties.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Nenhuma venda registrada.</td></tr>
                    ) : soldProperties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-[#1A55FF]">{p.di}</td>
                        <td className="px-6 py-4 text-sm font-medium">{p.address}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{p.selling_broker?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-emerald-700">
                          {p.sale_price != null ? `R$ ${Number(p.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {p.sold_at ? new Date(p.sold_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {view === 'contratos' && <ContratosView />}

        {view === 'admin' && (
          <div className="space-y-8">
            {/* Seção de Imóveis */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciamento de Imóveis</h2>
                <button
                  onClick={() => setIsAddPropertyModalOpen(true)}
                  className="bg-[#1A55FF] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-600 transition-colors"
                >
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
                        <td className="px-6 py-4"><LocationBadge location={p.current_key_location} /></td>
                        <td className="px-6 py-4 text-right">
                          {isGerente && (
                            <button
                              onClick={() => handleDeleteProperty(p.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                              title="Remover imóvel"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção de Corretores */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciamento de Corretores</h2>
                <button
                  onClick={() => {
                    setIsEditingBroker(false);
                    setEditingBrokerId(null);
                    setAddBrokerForm({ name: '', email: '', phone: '' });
                    setIsAddBrokerModalOpen(true);
                  }}
                  className="bg-[#1A55FF] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Novo Corretor
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Função</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.phone || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'gerente' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {u.role === 'gerente' ? 'Gerente' : 'Atendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isGerente && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditBroker(u)}
                                className="text-slate-400 hover:text-[#1A55FF] transition-colors p-1"
                                title="Editar corretor"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBroker(u.id)}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                title="Remover corretor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="absolute right-6 top-6 flex items-center gap-2 z-10">
                {!isEditingProperty && (
                  <button
                    onClick={() => {
                      setEditPropertyForm({
                        di: selectedProperty.di,
                        address: selectedProperty.address,
                        description: selectedProperty.description ?? '',
                        link: selectedProperty.link ?? '',
                        current_key_location: selectedProperty.current_key_location,
                      });
                      setIsEditingProperty(true);
                    }}
                    className="p-2 hover:bg-blue-50 text-[#1A55FF] rounded-full transition-colors"
                    title="Editar imóvel"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedProperty(null); setIsEditingProperty(false); }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left Column: Info */}
                  <div className="flex-1 space-y-6">
                    {isEditingProperty ? (
                      <form onSubmit={handleSaveEditProperty} className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">DI</label>
                          <input
                            required
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                            value={editPropertyForm.di}
                            onChange={(e) => setEditPropertyForm({...editPropertyForm, di: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Endereço</label>
                          <input
                            required
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                            value={editPropertyForm.address}
                            onChange={(e) => setEditPropertyForm({...editPropertyForm, address: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Descrição</label>
                          <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF] h-24 resize-none"
                            value={editPropertyForm.description}
                            onChange={(e) => setEditPropertyForm({...editPropertyForm, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Link do anúncio</label>
                          <input
                            type="url"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                            value={editPropertyForm.link}
                            onChange={(e) => setEditPropertyForm({...editPropertyForm, link: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Localização da Chave</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                            value={editPropertyForm.current_key_location}
                            onChange={(e) => setEditPropertyForm({...editPropertyForm, current_key_location: e.target.value})}
                          >
                            <option value="Lago Norte">Lago Norte</option>
                            <option value="Matriz">Matriz</option>
                            <option value="SCS">SCS</option>
                          </select>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingProperty(false)}
                            className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-[#1A55FF] text-white py-3 font-bold rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                          >
                            <Check className="w-4 h-4" />
                            Salvar
                          </button>
                        </div>
                      </form>
                    ) : (
                    <>
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

                    {selectedProperty.captador_name && (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Captador</h4>
                        <p className="font-semibold text-slate-800">{selectedProperty.captador_name}</p>
                        {selectedProperty.captador_email && (
                          <a href={`mailto:${selectedProperty.captador_email}`} className="flex items-center gap-1.5 text-sm text-[#1A55FF] hover:underline mt-1">
                            <Mail className="w-3.5 h-3.5" />{selectedProperty.captador_email}
                          </a>
                        )}
                        {selectedProperty.captador_phone && (
                          <a href={`tel:${selectedProperty.captador_phone}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mt-0.5">
                            <Phone className="w-3.5 h-3.5" />{selectedProperty.captador_phone}
                          </a>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Localização da Chave</p>
                        <p className="font-bold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#1A55FF]" />
                          <LocationBadge location={selectedProperty.current_key_location} />
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
                    </>
                    )}

                    {/* Actions */}
                    {!isEditingProperty && <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                      {selectedProperty.status !== 'Retirada' && selectedProperty.status !== 'Inativa' && selectedProperty.has_key && (
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
                      <div className="w-full">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Alterar Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { value: 'Ativo',      label: 'Ativo',         icon: CheckCircle2, solid: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200',  outline: 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400', gerenteOnly: false },
                              { value: 'Negociação', label: 'Em Negociação', icon: Clock,        solid: 'bg-blue-500 text-white border-blue-500 shadow-blue-200',           outline: 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400', gerenteOnly: false },
                              { value: 'Vendida',    label: 'Vendida',       icon: Check,        solid: 'bg-violet-500 text-white border-violet-500 shadow-violet-200',     outline: 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50 hover:border-violet-400', gerenteOnly: true },
                              { value: 'Inativa',    label: 'Inativar',      icon: AlertCircle,  solid: 'bg-rose-500 text-white border-rose-500 shadow-rose-200',           outline: 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50 hover:border-rose-400', gerenteOnly: false },
                            ] as const).filter(opt => !opt.gerenteOnly || isGerente).map(opt => {
                              const isCurrent = selectedProperty.status === opt.value;
                              const Icon = opt.icon;
                              const handleClick = () => {
                                if (isCurrent) return;
                                if (opt.value === 'Vendida') {
                                  setIsSaleModalOpen(true);
                                } else {
                                  handleStatusChange(opt.value);
                                }
                              };
                              return (
                                <button
                                  key={opt.value}
                                  onClick={handleClick}
                                  disabled={isCurrent}
                                  className={`py-3 px-3 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                                    isCurrent
                                      ? `${opt.solid} shadow-md cursor-default`
                                      : `${opt.outline} cursor-pointer`
                                  }`}
                                >
                                  <Icon className="w-4 h-4 shrink-0" />
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                    </div>}
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
                          <div className="bg-slate-50 rounded-xl p-4 text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-slate-800 text-base">{m.type}</span>
                              <span className="text-xs text-slate-400">{new Date(m.timestamp).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p className="text-slate-600 mb-1">
                              {m.broker_name && <span className="font-semibold">{m.broker_name}</span>}
                              {m.unit && <span> na unidade <span className="font-semibold">{m.unit}</span></span>}
                            </p>
                            {m.type === 'Retirada' && (m.client_name || m.client_phone) && (
                              <p className="text-slate-600 mb-1">
                                <span className="font-semibold text-slate-600">Cliente: </span>
                                {[m.client_name, m.client_phone].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {(m.withdrawal_datetime || m.return_forecast || m.return_datetime) && (
                              <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                                {m.withdrawal_datetime && (
                                  <p className="text-slate-500">
                                    <span className="font-semibold text-slate-600">Retirada: </span>
                                    {new Date(m.withdrawal_datetime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                  </p>
                                )}
                                {m.return_forecast && (
                                  <p className="text-slate-500">
                                    <span className="font-semibold text-slate-600">Prev. devolução: </span>
                                    {new Date(m.return_forecast).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                  </p>
                                )}
                                {m.return_datetime && (
                                  <p className="text-slate-500">
                                    <span className="font-semibold text-slate-600">Devolvida em: </span>
                                    {new Date(m.return_datetime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                  </p>
                                )}
                              </div>
                            )}
                            {m.observations && <p className="italic text-slate-500 mt-2 border-t border-slate-200 pt-2">"{m.observations}"</p>}
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
                    {users.filter(u => u.role === 'atendente').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.email ? ` - ${u.email}` : ''}{u.phone ? ` (${u.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Nome do cliente</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      placeholder="Nome do cliente na retirada"
                      value={withdrawForm.client_name}
                      onChange={(e) => setWithdrawForm({...withdrawForm, client_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Número do cliente</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      placeholder="Telefone ou celular"
                      value={withdrawForm.client_phone}
                      onChange={(e) => setWithdrawForm({...withdrawForm, client_phone: e.target.value})}
                    />
                  </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Horário de Retirada</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF] text-sm"
                      value={withdrawForm.withdrawal_datetime}
                      onChange={(e) => setWithdrawForm({...withdrawForm, withdrawal_datetime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Previsão de Devolução</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF] text-sm"
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Horário de Devolução</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#48E66F] text-sm"
                    value={returnForm.return_datetime}
                    onChange={(e) => setReturnForm({...returnForm, return_datetime: e.target.value})}
                  />
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

      {/* Add Property Modal */}
      <AnimatePresence>
        {isAddPropertyModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddPropertyModalOpen(false); setDiError(''); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleAddProperty}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
            >
              <h3 className="text-2xl font-black">Novo Imóvel</h3>

              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">DI</label>
                  <input
                    required
                    type="text"
                    placeholder="DI003"
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 ${
                      diError ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-[#1A55FF]'
                    }`}
                    value={addPropertyForm.di}
                    onChange={(e) => { setDiError(''); setAddPropertyForm({...addPropertyForm, di: e.target.value}); }}
                  />
                  {diError && <p className="text-rose-500 text-xs mt-1.5 font-medium">{diError}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Endereço</label>
                  <input
                    required
                    type="text"
                    placeholder="SHIS QL 8, Lago Sul"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={addPropertyForm.address}
                    onChange={(e) => setAddPropertyForm({...addPropertyForm, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Descrição</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF] h-20 resize-none"
                    placeholder="Descrição do imóvel..."
                    value={addPropertyForm.description}
                    onChange={(e) => setAddPropertyForm({...addPropertyForm, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Link do anúncio</label>
                  <input
                    type="url"
                    placeholder="https://diogenesimoveis.com/imovel/DI003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={addPropertyForm.link}
                    onChange={(e) => setAddPropertyForm({...addPropertyForm, link: e.target.value})}
                  />
                </div>

                {/* Chave disponível */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Chave disponível?</label>
                  <div className="flex gap-2">
                    {[{ val: true, label: 'Sim, temos a chave' }, { val: false, label: 'Não (imóvel ocupado)' }].map(opt => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => setAddPropertyForm({...addPropertyForm, has_key: opt.val, occupation_type: ''})}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                          addPropertyForm.has_key === opt.val
                            ? 'bg-[#1A55FF] text-white border-[#1A55FF]'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {addPropertyForm.has_key ? (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Localização da Chave</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={addPropertyForm.current_key_location}
                      onChange={(e) => setAddPropertyForm({...addPropertyForm, current_key_location: e.target.value})}
                    >
                      <option value="Lago Norte">Lago Norte</option>
                      <option value="Matriz">Matriz</option>
                      <option value="SCS">SCS</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Tipo de ocupação</label>
                    <select
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={addPropertyForm.occupation_type}
                      onChange={(e) => setAddPropertyForm({...addPropertyForm, occupation_type: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      <option value="Inquilino">Inquilino</option>
                      <option value="Proprietário">Proprietário</option>
                    </select>
                  </div>
                )}

                {/* Captador */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Captador</label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome do captador"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={addPropertyForm.captador_name}
                      onChange={(e) => setAddPropertyForm({...addPropertyForm, captador_name: e.target.value})}
                    />
                    <input
                      type="email"
                      placeholder="Email do captador"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={addPropertyForm.captador_email}
                      onChange={(e) => setAddPropertyForm({...addPropertyForm, captador_email: e.target.value})}
                    />
                    <input
                      type="tel"
                      placeholder="Telefone do captador"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                      value={addPropertyForm.captador_phone}
                      onChange={(e) => setAddPropertyForm({...addPropertyForm, captador_phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsAddPropertyModalOpen(false); setDiError(''); }}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#1A55FF] text-white py-3 font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                >
                  Adicionar Imóvel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Broker Modal */}
      <AnimatePresence>
        {isAddBrokerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddBrokerModalOpen(false);
                setIsEditingBroker(false);
                setEditingBrokerId(null);
                setAddBrokerForm({ name: '', email: '', phone: '' });
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={isEditingBroker ? handleSaveEditBroker : handleAddBroker}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
            >
              <h3 className="text-2xl font-black">{isEditingBroker ? 'Editar Corretor' : 'Novo Corretor'}</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Nome</label>
                  <input
                    required
                    type="text"
                    placeholder="Nome do corretor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={addBrokerForm.name}
                    onChange={(e) => setAddBrokerForm({...addBrokerForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={addBrokerForm.email}
                    onChange={(e) => setAddBrokerForm({...addBrokerForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Telefone</label>
                  <input
                    type="tel"
                    required
                    placeholder="(61) 99999-9999"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={addBrokerForm.phone}
                    onChange={(e) => setAddBrokerForm({...addBrokerForm, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBrokerModalOpen(false);
                    setIsEditingBroker(false);
                    setEditingBrokerId(null);
                    setAddBrokerForm({ name: '', email: '', phone: '' });
                  }}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#1A55FF] text-white py-3 font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                >
                  {isEditingBroker ? 'Salvar Alterações' : 'Adicionar Corretor'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Sale Modal */}
      <AnimatePresence>
        {isSaleModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaleModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleSellProperty}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
            >
              <h3 className="text-2xl font-black">Registrar Venda</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Preço de Venda (R$)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 850000.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-400"
                    value={saleForm.sale_price}
                    onChange={(e) => setSaleForm({...saleForm, sale_price: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Corretor Responsável pela Venda</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-400"
                    value={saleForm.selling_broker_id}
                    onChange={(e) => setSaleForm({...saleForm, selling_broker_id: e.target.value})}
                  >
                    <option value="">Selecione um atendente</option>
                    {users.filter(u => u.role === 'atendente').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.email ? ` - ${u.email}` : ''}{u.phone ? ` (${u.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 text-white py-3 font-bold rounded-2xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
                >
                  Confirmar Venda
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
