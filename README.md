# DNCommerce API (Express + PostgreSQL)

Sistema simples para **cadastro de produtos**, **clientes**, **pedidos**, **registro de vendas** e **controle de estoque**.

## 🧱 Entidades & Relacionamentos

```mermaid
erDiagram
  CLIENTES ||--o{ PEDIDOS : "faz"
  CLIENTES ||--o{ VENDAS : "compra"
  PRODUTOS ||--o{ PEDIDO_ITENS : "compõe"
  PEDIDOS ||--o{ PEDIDO_ITENS : "tem"
  PRODUTOS ||--o{ VENDA_ITENS : "compõe"
  VENDAS ||--o{ VENDA_ITENS : "tem"
  PRODUTOS ||--|| ESTOQUE : "tem"
  PRODUTOS ||--o{ MOVIMENTO_ESTOQUE : "gera"
  PEDIDOS ||--o{ VENDAS : "origina"

  CLIENTES {
    uuid id PK
    varchar nome
    varchar email
    varchar telefone
    timestamptz created_at
  }

  PRODUTOS {
    uuid id PK
    varchar sku
    varchar nome
    text descricao
    int preco_cents
    bool ativo
    timestamptz created_at
  }

  ESTOQUE {
    uuid produto_id PK, FK -> PRODUTOS.id
    int quantidade
    timestamptz updated_at
  }

  MOVIMENTO_ESTOQUE {
    uuid id PK
    uuid produto_id FK -> PRODUTOS.id
    varchar tipo
    int quantidade
    text motivo
    varchar origem
    uuid origem_id
    timestamptz created_at
  }

  PEDIDOS {
    uuid id PK
    uuid cliente_id FK -> CLIENTES.id
    varchar status
    int total_cents
    timestamptz created_at
  }

  PEDIDO_ITENS {
    uuid id PK
    uuid pedido_id FK -> PEDIDOS.id
    uuid produto_id FK -> PRODUTOS.id
    int quantidade
    int preco_unit_cents
  }

  VENDAS {
    uuid id PK
    uuid pedido_id FK -> PEDIDOS.id
    uuid cliente_id FK -> CLIENTES.id
    varchar metodo_pagamento
    varchar status
    int total_cents
    timestamptz created_at
  }

  VENDA_ITENS {
    uuid id PK
    uuid venda_id FK -> VENDAS.id
    uuid produto_id FK -> PRODUTOS.id
    int quantidade
    int preco_unit_cents
  }
```

## 🚀 Como rodar

1. Requisitos: Node 18+, PostgreSQL 13+.
2. `cp .env.example .env` e ajuste `DATABASE_URL`.
3. Crie o banco e rode:
   ```bash
   npm install
   npm run db:setup
   npm run dev
   ```

## 🔌 Endpoints

- **POST /produtos**, **GET /produtos**, **GET /produtos/:id**
- **POST /clientes**, **GET /clientes**
- **POST /pedidos**, **GET /pedidos/:id**
- **POST /vendas**, **GET /vendas/:id**
- **GET /estoque**, **POST /estoque/ajuste**

## 🧪 Insomnia

Importe o arquivo `insomnia_collection.json` incluído neste projeto e ajuste os UUIDs.
