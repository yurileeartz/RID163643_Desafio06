import { z } from 'zod';
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const itemSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().positive()
});

const orderSchema = z.object({
  cliente_id: z.string().uuid().optional(),
  itens: z.array(itemSchema).min(1)
});

router.post('/', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await query('BEGIN');
    const { cliente_id, itens } = parsed.data;
    const orderRes = await query(
      `INSERT INTO pedidos (cliente_id, status) VALUES ($1,'aberto') RETURNING *`,
      [cliente_id || null]
    );
    const pedido = orderRes.rows[0];

    for (const it of itens) {
      const p = await query('SELECT preco_cents FROM produtos WHERE id=$1', [it.produto_id]);
      if (p.rowCount === 0) throw new Error('Produto inexistente');
      await query(
        `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unit_cents)
         VALUES ($1,$2,$3,$4)`,
        [pedido.id, it.produto_id, it.quantidade, p.rows[0].preco_cents]
      );
    }

    await query('COMMIT');
    const final = await query('SELECT * FROM pedidos WHERE id=$1', [pedido.id]);
    res.status(201).json(final.rows[0]);
  } catch (e) {
    await query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

router.get('/:id', async (req, res) => {
  const p = await query('SELECT * FROM pedidos WHERE id=$1', [req.params.id]);
  if (p.rowCount === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
  const itens = await query(
    `SELECT pi.*, pr.nome FROM pedido_itens pi 
     JOIN produtos pr ON pr.id = pi.produto_id
     WHERE pi.pedido_id=$1`,
    [req.params.id]
  );
  res.json({ pedido: p.rows[0], itens: itens.rows });
});

export default router;
