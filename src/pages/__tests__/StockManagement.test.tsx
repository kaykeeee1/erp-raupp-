import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockManagement from '../StockManagement';
import { estoqueService } from '../../services/estoqueService';

// Mock do estoqueService
vi.mock('../../services/estoqueService', () => {
  const mockService = {
    estoqueService: {
      getEstoque: vi.fn(),
      adicionarItem: vi.fn(),
      updateQuantidade: vi.fn(),
      updateItem: vi.fn(),
      deletarItem: vi.fn(),
    }
  };
  return mockService;
});

const mockGetEstoque = vi.mocked(estoqueService.getEstoque);
const mockAdicionarItem = vi.mocked(estoqueService.adicionarItem);
const mockUpdateQuantidade = vi.mocked(estoqueService.updateQuantidade);

const mockEstoqueData = [
  {
    id: 'e1',
    item_nome: 'Toner HP CF283A (83A)',
    categoria: 'Toner' as const,
    quantidade_atual: 12,
    quantidade_minima: 5,
    modelo_compativel: 'HP LaserJet Pro M127fn',
  },
  {
    id: 'e2',
    item_nome: 'Rolo Tracionador Brother L2320',
    categoria: 'Peça' as const,
    quantidade_atual: 0,
    quantidade_minima: 2,
    modelo_compativel: 'Brother HL-L2320D',
  }
];

describe('StockManagement Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEstoque.mockResolvedValue(mockEstoqueData);
  });

  it('deve renderizar os itens do estoque e resumos na montagem', async () => {
    render(<StockManagement />);

    // Aguarda o carregamento dos dados da tabela
    expect(await screen.findByText('Toner HP CF283A (83A)')).toBeInTheDocument();
    expect(screen.getByText('Rolo Tracionador Brother L2320')).toBeInTheDocument();

    // Verifica se os dados iniciais aparecem nos resumos
    // Toners disponíveis: 12. Peças: 0. Itens críticos: 1 (Rolo Tracionador está em 0, min 2)
    expect(screen.getAllByText('12 un.')[0]).toBeInTheDocument();
    expect(screen.getAllByText('0 un.')[0]).toBeInTheDocument();
    expect(screen.getByText('1 itens')).toBeInTheDocument();
  });

  it('deve permitir cadastrar um novo insumo com sucesso', async () => {
    const user = userEvent.setup();
    mockAdicionarItem.mockResolvedValue({
      id: 'e3',
      item_nome: 'Toner Samsung D111S',
      categoria: 'Toner',
      quantidade_atual: 5,
      quantidade_minima: 2,
      modelo_compativel: 'Samsung M2020',
    });

    render(<StockManagement />);
    await screen.findByText('Toner HP CF283A (83A)');

    // Abre o modal de cadastro
    const addBtn = screen.getByRole('button', { name: /\+ adicionar item/i });
    await user.click(addBtn);

    // Verifica se o modal abriu
    expect(screen.getByText('Cadastrar Novo Insumo')).toBeInTheDocument();

    // Preenche os campos do formulário
    const inputNome = screen.getByLabelText(/nome do insumo \*/i);
    const selectCategoria = screen.getByLabelText(/categoria \*/i);
    const inputCompatibilidade = screen.getByLabelText(/compatibilidade/i);
    const inputQtd = screen.getByLabelText(/qtd disponível \*/i);
    const inputMin = screen.getByLabelText(/qtd mínima \(alerta\) \*/i);

    await user.type(inputNome, 'Toner Samsung D111S');
    await user.selectOptions(selectCategoria, 'Toner');
    await user.type(inputCompatibilidade, 'Samsung M2020');
    
    fireEvent.change(inputQtd, { target: { value: '5' } });
    fireEvent.change(inputMin, { target: { value: '2' } });

    // Salva o item
    const saveBtn = screen.getByRole('button', { name: /salvar insumo/i });
    await user.click(saveBtn);

    // Verifica chamada da API
    expect(mockAdicionarItem).toHaveBeenCalledTimes(1);
    expect(mockAdicionarItem).toHaveBeenCalledWith({
      item_nome: 'Toner Samsung D111S',
      categoria: 'Toner',
      quantidade_atual: 5,
      quantidade_minima: 2,
      modelo_compativel: 'Samsung M2020',
      codigo_barras: '',
    });
  });

  it('deve realizar ajuste rápido de quantidade (+ e -)', async () => {
    const user = userEvent.setup();
    mockUpdateQuantidade.mockResolvedValue();

    render(<StockManagement />);
    await screen.findByText('Toner HP CF283A (83A)');

    // Encontra os botões de ajuste rápido para o primeiro item (Toner HP)
    const plusButtons = screen.getAllByTitle('Adicionar 1 item');
    const minusButtons = screen.getAllByTitle('Remover 1 item');

    // Clica no botão "+" do Toner HP (quantidade atual: 12)
    await user.click(plusButtons[0]);

    // Verifica se disparou a chamada com a nova quantidade (13)
    expect(mockUpdateQuantidade).toHaveBeenCalledWith('e1', 13);

    // Clica no botão "-" do Toner HP (quantidade atual foi para 13, então "-" deve levar para 12)
    await user.click(minusButtons[0]);

    // Verifica se disparou a chamada com a nova quantidade (12)
    expect(mockUpdateQuantidade).toHaveBeenCalledWith('e1', 12);
  });
});
