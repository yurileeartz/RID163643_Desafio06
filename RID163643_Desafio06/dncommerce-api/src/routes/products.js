import { z } from 'zod';
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const productSchema = z.object({
  sku: z.string().min(1),
  nome: z.string().min(1),
  descricao: z.string().optional().default(''),
  preco_cents: z.number().int().nonnegative(),
  ativo: z.boolean().optional().default(true)
});

router.post('/', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { sku, nome, descricao, preco_cents, ativo } = parsed.data;
  try {
    const result = await query(
      `INSERT INTO produtos (sku, nome, descricao, preco_cents, ativo) 
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [sku, nome, descricao, preco_cents, ativo]
    );
    await query(`INSERT INTO estoque (produto_id, quantidade) VALUES ($1, 0)`, [result.rows[0].id]);
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'SKU ou email duplicado' });
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

router.get('/', async (req, res) => {
  const r = await query('SELECT * FROM produtos ORDER BY created_at DESC');
  res.json(r.rows);
});

router.get('/:id', async (req, res) => {
  const r = await query('SELECT * FROM produtos WHERE id=$1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(r.rows[0]);
});

export default router;
