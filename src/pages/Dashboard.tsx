import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Importação dos componentes gráficos da Recharts
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Importação da logo oficial dos assets
import logoOficial from '../assets/image_435e81.png';

// Importação de todos os módulos do sistema
import ClientList from './ClientList';
import EquipmentList from './EquipmentList';
import ExchangeList from './ExchangeList';
import InvoiceList from './InvoiceList';
import TicketList from './TicketList';
import MaintenanceList from './MaintenanceList';

type ViewMode = 'visao_geral' | 'clientes' | 'equipamentos' | 'suprimentos' | 'fiscal' | 'chamados' | 'oficina';

const dadosVolumeImpressao = [
  { mes: 'Jan', paginas: 45000 }, { mes: 'Fev', paginas: 52000 }, { mes: 'Mar', paginas: 49000 },
  { mes: 'Abr', paginas: 63000 }, { mes: 'Mai', paginas: 58000 }, { mes: 'Jun', paginas: 71000 },
];

const dadosSuprimentos = [
  { name: 'Toner Preto', value: 45, color: '#3b82f6' }, { name: 'Cilindros', value: 15, color: '#10b981' },
  { name: 'Fusores', value: 5, color: '#f59e0b' }, { name: 'Roletes', value: 20, color: '#6366f1' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewMode>('visao_geral');
  
  const [metrics, setMetrics] = useState({
    totalClientes: 0,
    totalEquipamentos: 0,
    equipamentosEmManutencao: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    if (currentView === 'visao_geral') {
      fetchDashboardMetrics();
    }
  }, [currentView]);

  const fetchDashboardMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const { count: clientesCount } = await supabase.from('tb_clientes').select('*', { count: 'exact', head: true });
      const { count: equipCount } = await supabase.from('tb_equipamentos').select('*', { count: 'exact', head: true });
      const { count: manutencaoCount } = await supabase.from('tb_equipamentos').select('*', { count: 'exact', head: true }).eq('status', 'Manutenção');

      setMetrics({
        totalClientes: clientesCount || 0,
        totalEquipamentos: equipCount || 0,
        equipamentosEmManutencao: manutencaoCount || 0,
      });
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error.message);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-800 antialiased">
      
      {/* SIDEBAR COM A COR ESCURA ORIGINAL RECUPERADA */}
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shadow-2xl border-r border-slate-800 print:hidden">
        <div>
          {/* BLOCO DA LOGO INTEGRADO NATURALMENTE COMO UMA FAIXA DO LAYOUT */}
          <div className="bg-white px-6 py-5 border-b border-slate-200 flex flex-col items-center justify-center">
            <img 
              src={logoOficial} 
              alt="Raupp Soluções em Impressão" 
              className="h-10 w-auto object-contain select-none"
            />
            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1.5 bg-slate-100 px-2 py-0.5 rounded">
              Outsourcing System
            </span>
          </div>
          
          {/* LINKS DE NAVEGAÇÃO ORIGINAIS */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'visao_geral', label: 'Visão Geral', icon: '📊' },
              { id: 'clientes', label: 'Clientes', icon: '👥' },
              { id: 'equipamentos', label: 'Equipamentos', icon: '🖨️' },
              { id: 'chamados', label: 'Chamados / OS', icon: '🛠️' },
              { id: 'oficina', label: 'OS de Oficina', icon: '🔬' },
              { id: 'suprimentos', label: 'Suprimentos', icon: '🔄' },
              { id: 'fiscal', label: 'Painel Fiscal', icon: '⚖️' },
            ].map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewMode)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTÃO DE LOGOUT ORIGINAL */}
        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all duration-200 text-xs font-semibold tracking-wide uppercase"
          >
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 py-4 flex justify-between items-center border-b border-slate-200/80 print:hidden">
          <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            📌 {currentView.replace('_', ' ')}
          </h1>
          
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium border border-slate-200/60">
              Operação Ativa
            </span>
          </div>
        </header>

        <div className="p-8 flex-1">
          {currentView === 'visao_geral' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Controle</h2>
                <p className="text-slate-500 text-sm mt-1">Análise visual de volume e manutenção do parque.</p>
              </div>
              
              {loadingMetrics ? (
                <div className="text-slate-400 text-sm flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Sincronizando com o Supabase...</span>
                </div>
              ) : (
                <>
                  {/* CARDS INDICADORES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Clientes Ativos</h3>
                      <div className="flex items-baseline justify-between mt-3">
                        <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{metrics.totalClientes}</span>
                        <span className="text-2xl opacity-40">👥</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Impressoras Alocadas</h3>
                      <div className="flex items-baseline justify-between mt-3">
                        <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{metrics.totalEquipamentos}</span>
                        <span className="text-2xl opacity-40">🖨️</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Equipamentos Retidos</h3>
                      <div className="flex items-baseline justify-between mt-3">
                        <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{metrics.equipamentosEmManutencao}</span>
                        <span className="text-2xl opacity-40">🛠️</span>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO DE GRÁFICOS */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col">
                      <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">📈 Volume de Impressão (Páginas Giras)</h3>
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dadosVolumeImpressao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false}/>
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false}/>
                            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} pág.`, 'Volume']}/>
                            <Area type="monotone" dataKey="paginas" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPages)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">🔄 Mix de Trocas (Insumos)</h3>
                      <div className="w-full h-56 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={dadosSuprimentos} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {dadosSuprimentos.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Proporção']}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 mt-2">
                        {dadosSuprimentos.map((item) => (
                          <div key={item.name} className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="truncate">{item.name} ({item.value}%)</span>
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
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm">
              {currentView === 'clientes' && <ClientList />}
              {currentView === 'equipamentos' && <EquipmentList />}
              {currentView === 'suprimentos' && <ExchangeList />}
              {currentView === 'fiscal' && <InvoiceList />}
              {currentView === 'chamados' && <TicketList />}
              {currentView === 'oficina' && <MaintenanceList />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;