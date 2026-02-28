import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  Search,
  Key,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface PublicProperty {
  id: number;
  di: string;
  address: string;
  description: string;
  link: string;
  status: string;
  current_key_location: string;
  broker_name?: string;
  return_forecast?: string;
}

const LocationBadge = ({ location }: { location: string }) => {
  const colors: Record<string, string> = {
    'Matriz':     'bg-violet-100 text-violet-700 border-violet-200',
    'Lago Norte': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'SCS':        'bg-orange-100 text-orange-700 border-orange-200',
  };
  const cls = colors[location] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold border ${cls}`}>
      {location}
    </span>
  );
};

export default function PublicView() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filters, setFilters] = useState({ status: '', location: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchProperties = async () => {
    // Fetch active/withdrawn/negotiation properties with responsible broker name
    const { data: props } = await supabase
      .from('properties')
      .select('*, users!responsible_broker_id(name)')
      .in('status', ['Ativo', 'Retirada', 'Negociação'])
      .order('di');

    if (!props) return;

    // For withdrawn properties, fetch the latest movement's return_forecast
    const withdrawnIds = props
      .filter((p: any) => p.status === 'Retirada')
      .map((p: any) => p.id);

    let forecastMap: Record<number, string | null> = {};
    if (withdrawnIds.length > 0) {
      const { data: movs } = await supabase
        .from('movements')
        .select('property_id, return_forecast')
        .eq('type', 'Retirada')
        .in('property_id', withdrawnIds)
        .order('id', { ascending: false });

      if (movs) {
        // Keep only the most recent movement per property
        for (const m of movs) {
          if (!(m.property_id in forecastMap)) {
            forecastMap[m.property_id] = m.return_forecast;
          }
        }
      }
    }

    setProperties(
      props.map((p: any) => ({
        ...p,
        broker_name: p.users?.name ?? null,
        return_forecast: forecastMap[p.id] ?? null,
      }))
    );
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchProperties();

    const channel = supabase
      .channel('public-view')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'properties' }, fetchProperties)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'movements' }, fetchProperties)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = properties.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.di.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false;
    }
    if (filters.status) {
      if (filters.status === 'Disponível' && p.status === 'Retirada') return false;
      if (filters.status === 'Retirada' && p.status !== 'Retirada') return false;
    }
    if (filters.location && p.current_key_location !== filters.location) return false;
    return true;
  });

  const withdrawn  = filtered.filter(p => p.status === 'Retirada');
  const available  = filtered.filter(p => p.status !== 'Retirada');

  return (
    <div className="min-h-screen bg-[#F3F3F3] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1A55FF] p-2 rounded-lg">
              <Key className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">Diógenes Gestão</h1>
              <p className="text-xs text-slate-400 mt-0.5">Consulta de Disponibilidade de Chaves</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Search + Filters */}
        <div className="max-w-xl mx-auto space-y-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar por DI ou endereço..."
              className="w-full pl-12 pr-14 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#1A55FF] focus:border-transparent outline-none text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 relative p-2 rounded-xl transition-colors ${showFilters ? 'bg-[#1A55FF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title="Filtros"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {Object.values(filters).some(v => v !== '') && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="">Todos</option>
                    <option value="Disponível">Disponível</option>
                    <option value="Retirada">Retirada</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Localização</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                  >
                    <option value="">Todas</option>
                    <option value="Matriz">Matriz</option>
                    <option value="Lago Norte">Lago Norte</option>
                    <option value="SCS">SCS</option>
                  </select>
                </div>
              </div>
              {Object.values(filters).some(v => v !== '') && (
                <button
                  type="button"
                  onClick={() => setFilters({ status: '', location: '' })}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <p className="text-4xl font-black text-emerald-600">{available.length}</p>
            <p className="text-sm font-bold text-emerald-700 mt-1">Disponíveis</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-4xl font-black text-amber-600">{withdrawn.length}</p>
            <p className="text-sm font-bold text-amber-700 mt-1">Retiradas</p>
          </div>
        </div>

        {/* Withdrawn */}
        {withdrawn.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Chaves Retiradas — {withdrawn.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {withdrawn.map(prop => <PropertyCard key={prop.id} prop={prop} />)}
            </div>
          </section>
        )}

        {/* Available */}
        {available.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Chaves Disponíveis — {available.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {available.map(prop => <PropertyCard key={prop.id} prop={prop} />)}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-lg">Nenhum imóvel encontrado.</p>
            <p className="text-sm mt-1">Tente pesquisar por outro DI ou endereço.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-300">
        Diógenes Imóveis · Apenas leitura
      </footer>
    </div>
  );
}

function PropertyCard({ prop }: { prop: PublicProperty; key?: React.Key }) {
  const isWithdrawn = prop.status === 'Retirada';

  return (
    <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm transition-shadow hover:shadow-md ${
      isWithdrawn ? 'border-amber-200' : 'border-slate-100'
    }`}>
      {/* Top row: DI + status pill */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-black text-[#1A55FF] bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest">
          {prop.di}
        </span>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
          isWithdrawn
            ? 'bg-amber-100 text-amber-700'
            : 'bg-emerald-100 text-emerald-700'
        }`}>
          {isWithdrawn
            ? <AlertCircle className="w-4 h-4" />
            : <CheckCircle2 className="w-4 h-4" />}
          {isWithdrawn ? 'Chave Retirada' : 'Disponível'}
        </span>
      </div>

      {/* Address */}
      <p className="font-bold text-slate-800 text-base leading-snug mb-4">{prop.address}</p>

      {/* Location */}
      <div className="flex items-center gap-2 text-slate-500">
        <MapPin className="w-4 h-4 shrink-0" />
        <LocationBadge location={prop.current_key_location} />
      </div>

      {/* Withdrawn details */}
      {isWithdrawn && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          {prop.broker_name && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-400 text-xs uppercase tracking-wide block mb-0.5">Com o corretor</span>
              {prop.broker_name}
            </p>
          )}
          {prop.return_forecast && (
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <span className="font-semibold">Previsão: </span>
                {new Date(prop.return_forecast).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
