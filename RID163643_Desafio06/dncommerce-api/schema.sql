CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  telefone VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  preco_cents INTEGER NOT NULL CHECK (preco_cents >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque (
  produto_id UUID PRIMARY KEY REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimento_estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  motivo TEXT,
  origem VARCHAR(30),
  origem_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','confirmado','cancelado')),
  total_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unit_cents INTEGER NOT NULL CHECK (preco_unit_cents >= 0),
  UNIQUE (pedido_id, produto_id)
);

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id),
  metodo_pagamento VARCHAR(30) NOT NULL CHECK (metodo_pagamento IN ('pix','cartao','boleto','dinheiro')),
  status VARCHAR(20) NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','estornado','pendente')),
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unit_cents INTEGER NOT NULL CHECK (preco_unit_cents >= 0)
);

CREATE OR REPLACE FUNCTION atualizar_total_pedido() RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos p SET total_cents = COALESCE((
    SELECT SUM(quantidade * preco_unit_cents) FROM pedido_itens WHERE pedido_id = p.id
  ),0) WHERE p.id = NEW.pedido_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_total_pedido_ins ON pedido_itens;
DROP TRIGGER IF EXISTS trg_total_pedido_upd ON pedido_itens;
DROP TRIGGER IF EXISTS trg_total_pedido_del ON pedido_itens;

CREATE TRIGGER trg_total_pedido_ins AFTER INSERT ON pedido_itens
FOR EACH ROW EXECUTE PROCEDURE atualizar_total_pedido();
CREATE TRIGGER trg_total_pedido_upd AFTER UPDATE ON pedido_itens
FOR EACH ROW EXECUTE PROCEDURE atualizar_total_pedido();
CREATE TRIGGER trg_total_pedido_del AFTER DELETE ON pedido_itens
FOR EACH ROW EXECUTE PROCEDURE atualizar_total_pedido();

CREATE OR REPLACE VIEW vw_estoque AS
  SELECT p.id, p.sku, p.nome, e.quantidade
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id;
