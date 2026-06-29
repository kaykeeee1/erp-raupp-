import React, { useEffect, useState } from 'react';
import { estoqueService } from '../services/estoqueService';
import type { EstoqueItem } from '../services/estoqueService';

const StockManagement: React.FC = () => {
  const [stock, setStock] = useState<EstoqueItem[]>([]);
  const [filteredStock, setFilteredStock] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | 'Toner' | 'Peça' | 'Cilindro'>('Todos');

  // Controle de Bipagem USB
  const [barcodeInput, setBarcodeInput] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal de cadastro/edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [formData, setFormData] = useState({
    item_nome: '',
    categoria: 'Toner' as 'Toner' | 'Peça' | 'Cilindro',
    quantidade_atual: 0,
    quantidade_minima: 0,
    modelo_compativel: '',
    codigo_barras: '',
  });

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await estoqueService.getEstoque();
      setStock(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar dados do estoque.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Filtrar estoque
  useEffect(() => {
    let result = [...stock];

    if (categoryFilter !== 'Todos') {
      result = result.filter(item => item.categoria === categoryFilter);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.item_nome.toLowerCase().includes(term) ||
        (item.modelo_compativel && item.modelo_compativel.toLowerCase().includes(term)) ||
        (item.codigo_barras && item.codigo_barras.toLowerCase().includes(term))
      );
    }

    setFilteredStock(result);
  }, [stock, searchTerm, categoryFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantidade_atual' || name === 'quantidade_minima' ? Number(value) : value
    }));
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      item_nome: '',
      categoria: 'Toner',
      quantidade_atual: 0,
      quantidade_minima: 0,
      modelo_compativel: '',
      codigo_barras: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: EstoqueItem) => {
    setEditingItem(item);
    setFormData({
      item_nome: item.item_nome,
      categoria: item.categoria,
      quantidade_atual: item.quantidade_atual,
      quantidade_minima: item.quantidade_minima,
      modelo_compativel: item.modelo_compativel || '',
      codigo_barras: item.codigo_barras || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);

      if (editingItem) {
        // Editar item existente
        await estoqueService.updateItem(editingItem.id, formData);
      } else {
        // Adicionar novo item
        await estoqueService.adicionarItem(formData);
      }

      setIsModalOpen(false);
      fetchStock();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar item no estoque.';
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Manipulador da Bipagem USB
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    try {
      setError(null);
      setSuccessToast(null);

      const item = await estoqueService.getItemByBarcode(code);
      if (item) {
        // Se o item existe, incrementa +1 no estoque
        await estoqueService.incrementarQuantidade(item.id, 1);
        setSuccessToast(`+1 unidade de "${item.item_nome}" adicionada ao estoque!`);
        setBarcodeInput('');
        fetchStock();

        // Remove o alerta de sucesso após 4 segundos
        setTimeout(() => {
          setSuccessToast(null);
        }, 4000);
      } else {
        // Se o item não existe, abre o modal de cadastro pré-preenchido
        setEditingItem(null);
        setFormData({
          item_nome: '',
          categoria: 'Toner',
          quantidade_atual: 1,
          quantidade_minima: 2,
          modelo_compativel: '',
          codigo_barras: code,
        });
        setBarcodeInput('');
        setIsModalOpen(true);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar código de barras.';
      setError(errorMsg);
    }
  };

  const handleDeleteItem = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o item "${nome}" do estoque?`)) {
      return;
    }

    try {
      setError(null);
      await estoqueService.deletarItem(id);
      fetchStock();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao deletar item do estoque.';
      setError(errorMsg);
    }
  };

  // Ajuste rápido de quantidade
  const handleQuickAdjust = async (id: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 0) return;

    try {
      // Atualização otimista na interface para micro-interações fluidas
      setStock(prev => prev.map(item =>
        item.id === id ? { ...item, quantidade_atual: newQty } : item
      ));

      await estoqueService.updateQuantidade(id, newQty);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao ajustar estoque.';
      setError(errorMsg);
      // Reverte o valor em caso de erro no banco
      fetchStock();
    }
  };

  // Métricas do estoque
  const totalToners = stock.filter(item => item.categoria === 'Toner').reduce((acc, curr) => acc + curr.quantidade_atual, 0);
  const totalPecas = stock.filter(item => item.categoria === 'Peça').reduce((acc, curr) => acc + curr.quantidade_atual, 0);
  const totalCilindros = stock  .filter(item => item.categoria === 'Cilindro').reduce((acc, curr) => acc + curr.quantidade_atual, 0);
  const itensCriticos = stock.filter(item => item.quantidade_atual <= item.quantidade_minima).length;

  return (
    <div className="p-6">
      {/* HEADER METRICS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Toners Disponíveis</h4>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">{totalToners} un.</div>
          </div>
          <span className="text-3xl opacity-30 select-none">🔄</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cilindros em Estoque</h4>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">{totalCilindros} un.</div>
          </div>
          <span className="text-3xl opacity-30 select-none"></span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Peças de Reposição</h4>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">{totalPecas} un.</div>
          </div>
          <span className="text-3xl opacity-30 select-none">🔧</span>
        </div>

        <div className={`bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between relative overflow-hidden group transition-all duration-200 ${itensCriticos > 0 ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200/80'}`}>
          <div className={`absolute top-0 left-0 w-1.5 h-full ${itensCriticos > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Estoque Crítico</h4>
            <div className={`text-3xl font-extrabold tracking-tight mt-1 ${itensCriticos > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{itensCriticos} itens</div>
          </div>
          <span className="text-3xl opacity-30 select-none">{itensCriticos > 0 ? '⚠️' : '✅'}</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-1 gap-3">
          <input
            id="stock-search-input"
            type="text"
            placeholder="Buscar por nome, compatibilidade ou EAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
          <select
            id="stock-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'Todos' | 'Toner' | 'Peça' | 'Cilindro')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 transition-all"
          >
            <option value="Todos">Todas Categorias</option>
            <option value="Toner">Toners</option>
            <option value="Cilindro">Cilindros</option>
            <option value="Peça">Peças</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Form de Bipagem USB */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <label htmlFor="stock-barcode-input" className="sr-only">Bipar Código de Barras</label>
            <input
              id="stock-barcode-input"
              type="text"
              placeholder="Bipar EAN..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-center tracking-widest"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
            >
              Bipar
            </button>
          </form>

          <button
            id="add-stock-btn"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            + Adicionar Item
          </button>
        </div>
      </div>

      {/* SUCCESS ALERTS (BARCODE) */}
      {successToast && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-semibold rounded-lg flex items-center justify-between shadow-sm animate-fade-in-down">
          <div className="flex items-center space-x-2">
            <span>🚀</span>
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-800 font-bold">&times;</button>
        </div>
      )}

      {/* ERROR ALERT BLOCK */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-lg flex items-center justify-between">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-extrabold text-lg">&times;</button>
        </div>
      )}

      {/* DATA TABLE */}
      {loading ? (
        <p className="p-8 text-slate-400 text-sm text-center">Buscando inventário de suprimentos...</p>
      ) : filteredStock.length === 0 ? (
        <p className="p-12 text-slate-400 text-sm text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30">
          Nenhum insumo encontrado no estoque com os filtros aplicados.
        </p>
      ) : (
        <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Insumo</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Compatibilidade</th>
                <th className="px-6 py-3 text-center">Quantidade Física</th>
                <th className="px-6 py-3 text-center">Ações Rápidas</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredStock.map((item) => {
                const isCritical = item.quantidade_atual <= item.quantidade_minima;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 block">{item.item_nome}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Minimo: {item.quantidade_minima} un.</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.categoria === 'Toner'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {item.modelo_compativel || <span className="italic text-slate-400">Não informado</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block font-extrabold px-3 py-1 rounded text-sm ${isCritical
                          ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse'
                          : 'bg-slate-100 text-slate-800'
                        }`}>
                        {item.quantidade_atual} un.
                      </span>
                      {isCritical && (
                        <span className="block text-[9px] text-rose-500 font-extrabold tracking-wide uppercase mt-1">Estoque Baixo!</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5 shadow-sm">
                        <button
                          onClick={() => handleQuickAdjust(item.id, item.quantidade_atual, -1)}
                          disabled={item.quantidade_atual === 0}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded text-xs font-black disabled:opacity-30 cursor-pointer"
                          title="Remover 1 item"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 text-slate-400 text-[10px] self-center select-none font-bold">AJUSTE</span>
                        <button
                          onClick={() => handleQuickAdjust(item.id, item.quantidade_atual, 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded text-xs font-black cursor-pointer"
                          title="Adicionar 1 item"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors font-semibold rounded text-xs cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.item_nome)}
                          className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors font-semibold rounded text-xs cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
              {editingItem ? 'Editar Insumo no Estoque' : 'Cadastrar Novo Insumo'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label htmlFor="form_item_nome" className="block text-xs font-bold text-slate-500 uppercase">Nome do Insumo *</label>
                <input
                  id="form_item_nome"
                  type="text"
                  name="item_nome"
                  value={formData.item_nome}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Toner HP 83A, Película Fusor Universal"
                  className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form_categoria" className="block text-xs font-bold text-slate-500 uppercase">Categoria *</label>
                  <select
                    id="form_categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="Toner">Toner</option>
                    <option value="Cilindro">Cilindro</option>
                    <option value="Peça">Peça</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="form_modelo_compativel" className="block text-xs font-bold text-slate-500 uppercase">Compatibilidade</label>
                  <input
                    id="form_modelo_compativel"
                    type="text"
                    name="modelo_compativel"
                    value={formData.modelo_compativel}
                    onChange={handleInputChange}
                    placeholder="Ex: HP M127/M125"
                    className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form_quantidade_atual" className="block text-xs font-bold text-slate-500 uppercase">Qtd Disponível *</label>
                  <input
                    id="form_quantidade_atual"
                    type="number"
                    name="quantidade_atual"
                    value={formData.quantidade_atual}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="form_quantidade_minima" className="block text-xs font-bold text-slate-500 uppercase">Qtd Mínima (Alerta) *</label>
                  <input
                    id="form_quantidade_minima"
                    type="number"
                    name="quantidade_minima"
                    value={formData.quantidade_minima}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="form_codigo_barras" className="block text-xs font-bold text-slate-500 uppercase">Código de Barras (EAN)</label>
                <input
                  id="form_codigo_barras"
                  type="text"
                  name="codigo_barras"
                  value={formData.codigo_barras}
                  onChange={handleInputChange}
                  placeholder="Ex: 7891234567890 (Opcional)"
                  className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all bg-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
