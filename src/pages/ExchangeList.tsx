import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TrocaSuprimento {
  id: string;
  tipo: string;
  data_troca: string;
  contador_na_troca: number;
  tecnico_responsavel: string;
  observacoes: string;
  tb_equipamentos: {
    modelo: string;
    numero_serie: string;
  } | null;
}

interface EquipamentoDropdown {
  id: string;
  modelo: string;
  numero_serie: string;
}

const ExchangeList: React.FC = () => {
  const [trocas, setTrocas] = useState<TrocaSuprimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para o Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    equipamento_id: '',
    tipo: 'Toner Preto',
    contador_na_troca: 0,
    tecnico_responsavel: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchTrocas();
    fetchEquipamentos();
  }, []);

  const fetchTrocas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tb_consumiveis')
        .select('*, tb_equipamentos(modelo, numero_serie)')
        .order('data_troca', { ascending: false });

      if (error) throw error;
      setTrocas(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('tb_equipamentos')
        .select('id, modelo, numero_serie')
        .order('modelo', { ascending: true });

      if (error) throw error;
      setEquipamentos(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar equipamentos para o dropdown:', err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipamento_id) {
      setError('Por favor, selecione um equipamento.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      ...formData,
      contador_na_troca: Number(formData.contador_na_troca),
    };

    try {
      const { error } = await supabase
        .from('tb_consumiveis')
        .insert([payload]);

      if (error) throw error;

      setFormData({
        equipamento_id: '',
        tipo: 'Toner Preto',
        contador_na_troca: 0,
        tecnico_responsavel: '',
        observacoes: '',
      });
      setIsModalOpen(false);
      fetchTrocas();
      
    } catch (err: any) {
      setError(err.message || 'Erro ao registar troca.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Histórico de Trocas (Suprimentos)</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
        >
          + Registar Troca
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md border border-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-sm">Carregando dados...</p>
      ) : (
        <div className="overflow-hidden bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipamento</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Consumível</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contador na Troca</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {trocas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma troca registada ainda.
                  </td>
                </tr>
              ) : (
                trocas.map((troca) => (
                  <tr key={troca.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(troca.data_troca).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{troca.tb_equipamentos?.modelo}</div>
                      <div className="text-xs text-gray-400">S/N: {troca.tb_equipamentos?.numero_serie}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{troca.tipo}</td>
                    <td className="px-6 py-4 text-gray-600">{troca.contador_na_troca.toLocaleString()} pág.</td>
                    <td className="px-6 py-4 text-right text-gray-500">{troca.tecnico_responsavel || '---'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-white rounded-xl shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">Registar Troca de Suprimento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-semibold">&times;</button>
            </div>

            <form onSubmit={handleCreateTroca} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase">Selecione a Impressora *</label>
                <select 
                  name="equipamento_id" 
                  value={formData.equipamento_id} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-sm bg-white outline-none"
                >
                  <option value="">-- Escolha o Equipamento pelo Modelo (S/N) --</option>
                  {equipamentos.map((e) => (
                    <option key={e.id} value={e.id}>{e.modelo} (S/N: {e.numero_serie})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase">Tipo de Consumível *</label>
                  <select 
                    name="tipo" 
                    value={formData.tipo} 
                    onChange={handleInputChange} 
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-sm bg-white outline-none"
                  >
                    <option value="Toner Preto">Toner Preto</option>
                    <option value="Cilindro">Cilindro (Drum)</option>
                    <option value="Unidade de Fusão">Unidade de Fusão</option>
                    <option value="Kit de Roletes">Kit de Roletes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase">Contador Atual *</label>
                  <input 
                    type="number" 
                    name="contador_na_troca" 
                    value={formData.contador_na_troca} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-sm outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase">Técnico Responsável</label>
                <input 
                  type="text" 
                  name="tecnico_responsavel" 
                  value={formData.tecnico_responsavel} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-sm outline-none" 
                  placeholder="Nome do técnico" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase">Observações</label>
                <textarea 
                  name="observacoes" 
                  value={formData.observacoes} 
                  onChange={handleInputChange} 
                  rows={2} 
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-sm outline-none resize-none" 
                  placeholder="Ex: Substituído por insumo compatível / original..." 
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? 'Gravando...' : 'Gravar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeList;