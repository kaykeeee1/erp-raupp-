import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Importação dos componentes gráficos da Recharts
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Importação de ícones modernos da Lucide
import { 
  LayoutDashboard, Users, Printer, FileText, Settings, 
  RefreshCw, Boxes, Wrench, LogOut, TrendingUp, DollarSign 
} from 'lucide-react';

// Importação da logo oficial dos assets
import logoOficial from '../assets/image_435e81.png';

// Importação de todos os módulos do sistema
import ClientList from './ClientList';
import EquipmentList from './EquipmentList';
import ExchangeList from './ExchangeList';
import InvoiceList from './InvoiceList';
import TicketList from './TicketList';
import MaintenanceList from './MaintenanceList';
import StockManagement from './StockManagement';
import FinanceList from './FinanceList';

type ViewMode = 'visao_geral' | 'clientes' | 'equipamentos' | 'suprimentos' | 'fiscal' | 'chamados' | 'oficina' | 'estoque' | 'financeiro';

const dadosVolumeImpressao = [
  { mes: 'Jan', paginas: 45000 }, { mes: 'Fev', paginas: 52000 }, { mes: 'Mar', paginas: 49000 },
  { mes: 'Abr', paginas: 63000 }, { mes: 'Mai', paginas: 58000 }, { mes: 'Jun', paginas: 71000 },
];

const dadosSuprimentos = [
  { name: 'Toner Preto', value: 45, color: '#1e293b' }, // Dark slate
  { name: 'Cilindros', value: 15, color: '#38bdf8' }, // Light blue
  { name: 'Fusores', value: 5, color: '#ea580c' }, // Orange
  { name: 'Roletes', value: 20, color: '#94a3b8' }, // Gray
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewMode>('visao_geral');
  
  const [metrics, setMetrics] = useState({
    totalClientes: 0,
    totalEquipamentos: 0,
    equipamentosEmManutencao: 0,
    estoqueCritico: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const fetchDashboardMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const { count: clientesCount } = await supabase.from('tb_clientes').select('*', { count: 'exact', head: true });
      const { count: equipCount } = await supabase.from('tb_equipamentos').select('*', { count: 'exact', head: true });
      const { count: manutencaoCount } = await supabase.from('tb_equipamentos').select('*', { count: 'exact', head: true }).eq('status', 'Manutenção');

      // Busca inventário e computa quantos itens estão com estoque crítico
      const { data: stockData } = await supabase.from('tb_estoque').select('id, quantidade_atual, quantidade_minima');
      const criticalCount = stockData
        ? stockData.filter((item) => item.quantidade_atual <= item.quantidade_minima).length
        : 0;

      setMetrics({
        totalClientes: clientesCount || 0,
        totalEquipamentos: equipCount || 0,
        equipamentosEmManutencao: manutencaoCount || 0,
        estoqueCritico: criticalCount,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao carregar métricas:', errorMsg);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (currentView === 'visao_geral') {
      fetchDashboardMetrics();
    }
  }, [currentView]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-800 antialiased font-sans">
      
      {/* SIDEBAR COM DESIGN FLUTUANTE PREMIUM */}
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shadow-premium border-r border-slate-800/60 print:hidden z-30">
        <div>
          {/* CONTAINER DA LOGO INTEGRADA COMO CARD FLUTUANTE */}
          <div className="p-5 border-b border-slate-800/80">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center transition-all hover:scale-[1.02] duration-200">
              <img 
                src={logoOficial} 
                alt="Raupp Soluções em Impressão" 
                className="h-9 w-auto object-contain select-none"
              />
              <span className="text-[8px] text-brand-primary font-bold tracking-widest uppercase mt-2 bg-blue-50 px-2 py-0.5 rounded border border-blue-100/60">
                Outsourcing System
              </span>
            </div>
          </div>
          
          {/* LINKS DE NAVEGAÇÃO MODERNIZADOS COM LUCIDE ICONS */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'visao_geral', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'clientes', label: 'Clientes', icon: Users },
              { id: 'equipamentos', label: 'Equipamentos', icon: Printer },
              { id: 'chamados', label: 'Chamados / OS', icon: Wrench },
              { id: 'oficina', label: 'OS de Oficina', icon: Settings },
              { id: 'suprimentos', label: 'Suprimentos', icon: RefreshCw },
              { id: 'estoque', label: 'Estoque', icon: Boxes },
              { id: 'fiscal', label: 'Painel Fiscal', icon: FileText },
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewMode)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 font-semibold translate-x-1' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTÃO DE LOGOUT REESTILIZADO */}
        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all duration-200 text-xs font-semibold tracking-wide uppercase cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main aria-label="Painel principal do ERP" className="flex-1 overflow-y-auto flex flex-col">
        {/* HEADER LIMPO E ELEGANTE */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-8 py-5 flex justify-between items-center border-b border-slate-200/60 print:hidden">
          <div className="flex items-center space-x-2">
            <h1 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              ERP Raupp <span className="mx-2 text-slate-300">|</span> 
              <span className="text-slate-700 font-display text-sm lowercase capitalize">
                {currentView === 'visao_geral' ? 'Visão Geral' : currentView.replace('_', ' ')}
              </span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-medium border border-slate-200/40">
              Operação Ativa
            </span>
          </div>
        </header>

        <div className="p-8 flex-1">
          {currentView === 'visao_geral' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight font-display">Painel de Controle</h2>
                <p className="text-slate-500 text-sm mt-1">Análise em tempo real do parque de impressão e inventário.</p>
              </div>
              
              {loadingMetrics ? (
                <div className="text-slate-400 text-sm flex items-center space-x-2.5 bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium max-w-xs">
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Sincronizando dados...</span>
                </div>
              ) : (
                <>
                  {/* CARDS INDICADORES REDESENHADOS COM ANIMAÇÃO E LUCIDE ICONS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Clientes Ativos */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-brand-primary"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Clientes Ativos</p>
                          <h4 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{metrics.totalClientes}</h4>
                        </div>
                        <div className="p-3 bg-blue-50 text-brand-primary rounded-lg transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Impressoras Alocadas */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Impressoras Alocadas</p>
                          <h4 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{metrics.totalEquipamentos}</h4>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg transition-all duration-300 group-hover:bg-emerald-500 group-hover:text-white">
                          <Printer className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Equipamentos Retidos */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-brand-accent"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Equipamentos Retidos</p>
                          <h4 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{metrics.equipamentosEmManutencao}</h4>
                        </div>
                        <div className="p-3 bg-orange-50 text-brand-accent rounded-lg transition-all duration-300 group-hover:bg-brand-accent group-hover:text-white">
                          <Wrench className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Estoque Crítico */}
                    <button
                      onClick={() => setCurrentView('estoque')}
                      className={`bg-white p-6 rounded-xl border text-left shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                        metrics.estoqueCritico > 0 ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200/80'
                      }`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Estoque Crítico</p>
                          <h4 className={`text-3xl font-extrabold tracking-tight mt-2 ${
                            metrics.estoqueCritico > 0 ? 'text-amber-600 font-bold' : 'text-slate-800'
                          }`}>{metrics.estoqueCritico}</h4>
                        </div>
                        <div className={`p-3 rounded-lg transition-all duration-300 ${
                          metrics.estoqueCritico > 0 
                            ? 'bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white animate-pulse' 
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-500 group-hover:text-white'
                        }`}>
                          <Boxes className="w-5 h-5" />
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* SEÇÃO DE GRÁFICOS MELHORADA */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    {/* Gráfico de Linha / Área */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium lg:col-span-2 flex flex-col justify-between">
                      <div className="flex items-center space-x-2 mb-6">
                        <TrendingUp className="w-4 h-4 text-brand-primary" />
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Volume de Impressão (Páginas Giras)</h3>
                      </div>
                      
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dadosVolumeImpressao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} fontWeight={500} tickLine={false}/>
                            <YAxis stroke="#94a3b8" fontSize={11} fontWeight={500} tickLine={false}/>
                            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} pág.`, 'Volume']}/>
                            <Area type="monotone" dataKey="paginas" stroke="#1d4ed8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPages)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Gráfico de Pizza */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium flex flex-col justify-between">
                      <div className="flex items-center space-x-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-slate-400 animate-spin-slow" />
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mix de Trocas (Insumos)</h3>
                      </div>

                      <div className="w-full h-56 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={dadosSuprimentos} cx="50%" cy="50%" innerRadius={62} outerRadius={82} paddingAngle={4} dataKey="value">
                              {dadosSuprimentos.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Proporção']}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600 mt-2">
                        {dadosSuprimentos.map((item) => (
                          <div key={item.name} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="truncate text-slate-700">{item.name} ({item.value}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* RENDERIZAÇÃO DINÂMICA DOS OUTROS MÓDULOS */}
          {currentView !== 'visao_geral' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-premium">
              {currentView === 'clientes' && <ClientList />}
              {currentView === 'equipamentos' && <EquipmentList />}
              {currentView === 'suprimentos' && <ExchangeList />}
              {currentView === 'estoque' && <StockManagement />}
              {currentView === 'fiscal' && <InvoiceList />}
              {currentView === 'chamados' && <TicketList />}
              {currentView === 'oficina' && <MaintenanceList />}
              {currentView === 'financeiro' && <FinanceList />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;