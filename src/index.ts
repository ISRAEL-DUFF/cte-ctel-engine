import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import healthRouter from './routes/health';
import cteRouter from './routes/ctel';

// Load environment variables
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/health', healthRouter);
app.use('/cte', cteRouter);

// Root route - serve the HTML page
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Handle 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: 'Not Found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Visit http://localhost:${port} to view the Lien Node Visualizer`);
});
