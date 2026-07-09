import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer } from "node:http";
import { registerRoutes } from "./routes";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set Supabase env vars directly (anon key is safe to include)
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = "https://iauxhqenkavakilnzhuw.supabase.co";
}
if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdXhocWVua2F2YWtpbG56aHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU0NDQsImV4cCI6MjA5OTE2MTQ0NH0.ZuLPKpvYRtA3CExwgDayOi12xFaPqk63smHfz73rjhM";
}
if (!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY_VERCEL) {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY_VERCEL;
}

let initPromise: Promise<void> | null = null;

function getInit() {
  if (!initPromise) {
    initPromise = registerRoutes(httpServer, app).then(() => {});
  }
  return initPromise;
}

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

export default async function handler(req: Request, res: Response) {
  try {
    await getInit();
    app(req, res);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
