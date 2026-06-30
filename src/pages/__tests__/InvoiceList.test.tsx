import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceList from '../InvoiceList';
import { supabase } from '../../lib/supabase';

// Mock do supabase client
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn(),
  };
  return {
    supabase: mockSupabase,
  };
});

const mockFrom = vi.mocked(supabase.from);

const mockClientesData = [
  {
    id: 'c1',
    razao_social: 'Cliente Teste Ltda',
    valor_franquia: 250.00,
    franquia_paginas: 1000,
    valor_clique_excedente: 0.15,
  },
];

const mockNotasData = [
  {
    id: 'n1',
    numero_nf: 'NF-123456',
    tipo_nota: 'Serviço',
    valor_bruto: 250.00,
    status: 'Emitida',
    criado_em: '2026-06-29T12:00:00Z',
    metadados_fiscais: {
      contador_anterior: 4000,
      contador_atual: 4800,
      paginas_excedentes: 0,
      cbs_calculado: 22.0,
      ibs_calculado: 10.25,
      lei_regencia: 'Nova Regra Tributária (IVA Dual 2026)',
    },
    tb_clientes: {
      razao_social: 'Cliente Teste Ltda',
      cpf_cnpj: '00.000.000/0001-00',
      valor_franquia: 250.00,
      franquia_paginas: 1000,
      valor_clique_excedente: 0.15,
    },
  },
];

const mockInsert = vi.fn().mockResolvedValue({ error: null });

describe('InvoiceList Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tb_clientes') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockClientesData, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'tb_notas_fiscais') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockNotasData, error: null }),
          insert: mockInsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as ReturnType<typeof supabase.from>;
    });
  });

  it('deve carregar e renderizar as Notas Fiscais na montagem', async () => {
    render(<InvoiceList />);

    // Verifica cabeçalho da página
    expect(screen.getByText('Faturamento Automatizado')).toBeInTheDocument();

    // Aguarda o carregamento dos dados e verifica a presença da nota fiscal mockada na tabela
    const nfElement = await screen.findByText('NF-123456');
    expect(nfElement).toBeInTheDocument();
    expect(screen.getByText('Cliente Teste Ltda')).toBeInTheDocument();
    
    // Verifica o valor renderizado
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
  });

  it('deve abrir o modal, calcular valores e emitir uma nota fiscal com sucesso', async () => {
    const user = userEvent.setup();
    render(<InvoiceList />);

    // Aguarda carregar dados iniciais
    await screen.findByText('NF-123456');

    // Abre o modal de emissão
    const processarBtn = screen.getByText('+ Novo Fechamento (Saída)');
    await user.click(processarBtn);

    // Verifica que o modal abriu
    expect(screen.getByText('Novo Fechamento de Contrato')).toBeInTheDocument();

    // Seleciona o cliente no dropdown
    const selectCliente = screen.getByRole('combobox', { name: /selecione o cliente \*/i });
    await user.selectOptions(selectCliente, 'c1');

    // Preenche os contadores
    const inputAnterior = screen.getByLabelText(/contador anterior \*/i);
    const inputAtual = screen.getByLabelText(/contador atual \*/i);

    // Usa fireEvent para garantir que o react detecte a alteração nos inputs numéricos
    fireEvent.change(inputAnterior, { target: { value: '5000' } });
    fireEvent.change(inputAtual, { target: { value: '6500' } });

    // Verifica se os cálculos derivados são exibidos corretamente na tela
    // Total impresso: 1500. Franquia: 1000. Excedente: 500.
    expect(screen.getByText('1.500')).toBeInTheDocument(); // Páginas rodadas
    expect(screen.getByText('500')).toBeInTheDocument(); // Páginas excedentes
    
    // Valor total: R$ 250,00 (franquia) + (500 * R$ 0,15 = R$ 75,00) = R$ 325,00
    expect(screen.getByText(/325,00/)).toBeInTheDocument();

    // Clica no botão de emitir fatura
    const emitirBtn = screen.getByRole('button', { name: /emitir e registrar/i });
    await user.click(emitirBtn);

    // Verifica se a chamada do Supabase insert foi feita com o payload esperado
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertedPayload = mockInsert.mock.calls[0][0][0];

    expect(insertedPayload.cliente_id).toBe('c1');
    expect(insertedPayload.tipo_nota).toBe('Serviço');
    expect(insertedPayload.valor_bruto).toBe(325);
    expect(insertedPayload.status).toBe('Emitida');
    expect(insertedPayload.metadados_fiscais).toEqual({
      contador_anterior: 5000,
      contador_atual: 6500,
      paginas_excedentes: 500,
      cbs_calculado: 325 * 0.088,
      ibs_calculado: 325 * 0.041,
      lei_regencia: 'Nova Regra Tributária (IVA Dual 2026)',
    });
  });
});
