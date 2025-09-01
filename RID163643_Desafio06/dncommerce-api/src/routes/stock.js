import { z } from 'zod';
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const r = await query('SELECT * FROM vw_estoque ORDER BY nome');
  res.json(r.rows);
});

const adjustSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().positive(),
  tipo: z.enum(['entrada','saida']),
  motivo: z.string().optional()
});

router.post('/ajuste', async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { produto_id, quantidade, tipo, motivo } = parsed.data;
  try {
    await query('BEGIN');
    const mult = tipo === 'entrada' ? 1 : -1;
    await query('UPDATE estoque SET quantidade = quantidade + $1, updated_at=now() WHERE produto_id=$2', [mult * quantidade, produto_id]);
    await query('INSERT INTO movimento_estoque (produto_id, tipo, quantidade, motivo, origem) VALUES ($1,$2,$3,$4,$5)',
      [produto_id, tipo, quantidade, motivo || null, 'manual']);
    await query('COMMIT');
    res.status(201).json({ ok: true });
  } catch (e) {
    await query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erro ao ajustar estoque' });
  }
});

export default router;
