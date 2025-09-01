import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import productsRouter from './routes/products.js';
import clientsRouter from './routes/clients.js';
import ordersRouter from './routes/orders.js';
import salesRouter from './routes/sales.js';
import stockRouter from './routes/stock.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ ok: true, name: 'DNCommerce API', version: '1.0.0' }));

app.use('/produtos', productsRouter);
app.use('/clientes', clientsRouter);
app.use('/pedidos', ordersRouter);
app.use('/vendas', salesRouter);
app.use('/estoque', stockRouter);

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API rodando em http://localhost:${port}`));
