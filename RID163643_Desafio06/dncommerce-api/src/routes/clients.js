import { z } from 'zod';
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const clientSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  telefone: z.string().optional()
});

router.post('/', async (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { nome, email, telefone } = parsed.data;
  try {
    const r = await query(
      `INSERT INTO clientes (nome, email, telefone) VALUES ($1,$2,$3) RETURNING *`,
      [nome, email, telefone || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

router.get('/', async (req, res) => {
  const r = await query('SELECT * FROM clientes ORDER BY created_at DESC');
  res.json(r.rows);
});

export default router;
