import { z } from 'zod';
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const saleSchema = z.object({
  pedido_id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().optional(),
  metodo_pagamento: z.enum(['pix','cartao','boleto','dinheiro']),
  itens: z.array(z.object({
    produto_id: z.string().uuid(),
    quantidade: z.number().int().positive(),
    preco_unit_cents: z.number().int().nonnegative().optional()
  })).min(1)
});

router.post('/', async (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await query('BEGIN');

    const { pedido_id, cliente_id, metodo_pagamento, itens } = parsed.data;

    let saleItems = itens;
    if (pedido_id) {
      const it = await query('SELECT produto_id, quantidade, preco_unit_cents FROM pedido_itens WHERE pedido_id=$1', [pedido_id]);
      if (it.rowCount === 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Pedido sem itens ou inexistente' });
      }
      saleItems = it.rows.map(r => ({ produto_id: r.produto_id, quantidade: r.quantidade, preco_unit_cents: r.preco_unit_cents }));
    } else {
      for (const s of saleItems) {
        if (s.preco_unit_cents == null) {
          const p = await query('SELECT preco_cents FROM produtos WHERE id=$1', [s.produto_id]);
          if (p.rowCount === 0) throw new Error('Produto inexistente');
          s.preco_unit_cents = p.rows[0].preco_cents;
        }
      }
    }

    const total = saleItems.reduce((acc, it) => acc + it.quantidade * it.preco_unit_cents, 0);

    const v = await query(
      `INSERT INTO vendas (pedido_id, cliente_id, metodo_pagamento, status, total_cents)
       VALUES ($1,$2,$3,'pago',$4) RETURNING *`,
      [pedido_id || null, cliente_id || null, metodo_pagamento, total]
    );

    for (const it of saleItems) {
      await query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unit_cents)
         VALUES ($1,$2,$3,$4)`,
        [v.rows[0].id, it.produto_id, it.quantidade, it.preco_unit_cents]
      );
      await query(
        `UPDATE estoque SET quantidade = quantidade - $1, updated_at = now() WHERE produto_id = $2`,
        [it.quantidade, it.produto_id]
      );
      await query(
        `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, motivo, origem, origem_id)
         VALUES ($1,'saida',$2,'baixa por venda','venda',$3)`,
        [it.produto_id, it.quantidade, v.rows[0].id]
      );
    }

    if (pedido_id) {
      await query(`UPDATE pedidos SET status='confirmado' WHERE id=$1`, [pedido_id]);
    }

    await query('COMMIT');

    res.status(201).json({ venda: v.rows[0] });
  } catch (e) {
    await query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erro ao registrar venda' });
  }
});

router.get('/:id', async (req, res) => {
  const v = await query('SELECT * FROM vendas WHERE id=$1', [req.params.id]);
  if (v.rowCount === 0) return res.status(404).json({ error: 'Venda não encontrada' });
  const itens = await query(
    `SELECT vi.*, pr.nome FROM venda_itens vi 
     JOIN produtos pr ON pr.id = vi.produto_id
     WHERE vi.venda_id=$1`,
    [req.params.id]
  );
  res.json({ venda: v.rows[0], itens: itens.rows });
});

export default router;
