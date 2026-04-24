import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';
import eventTreeRoutes from './routes/eventTree.routes';
import destinationRoutes from './routes/destination.routes';



dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/events', eventTreeRoutes);
app.use('/api/destinations', destinationRoutes);



export default app;