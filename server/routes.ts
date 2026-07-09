import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertStudySchema, insertLabResultSchema, insertImagingFindingSchema, insertHealthAlertSchema } from "@shared/schema";
import { analyzeAllResults, analyzeAllResultsStream, analyzeStudy, chatWithExpert } from "./ai";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 },
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

  // === STUDIES ===
  app.get("/api/studies", async (req, res) => {
    try {
      const all = await storage.getAllStudies();
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/studies/:id", async (req, res) => {
    try {
      const study = await storage.getStudyById(Number(req.params.id));
      if (!study) return res.status(404).json({ error: "Not found" });
      const labResultsList = await storage.getLabResultsByStudy(study.id);
      const findings = await storage.getImagingFindingsByStudy(study.id);
      res.json({ ...study, labResults: labResultsList, imagingFindings: findings });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/studies", upload.single("file"), async (req, res) => {
    try {
      const body = req.body;
      const parsed = insertStudySchema.parse({
        title: body.title,
        category: body.category,
        studyDate: body.studyDate,
        facility: body.facility || null,
        doctor: body.doctor || null,
        notes: body.notes || null,
        fileUrl: req.file ? `/api/files/${req.file.filename}` : null,
        fileName: req.file ? req.file.originalname : null,
      });
      const study = await storage.createStudy(parsed);
      res.json(study);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/studies/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteLabResultsByStudy(id);
      await storage.deleteImagingFindingsByStudy(id);
      await storage.deleteStudy(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === LAB RESULTS ===
  app.get("/api/studies/:id/lab-results", async (req, res) => {
    try {
      res.json(await storage.getLabResultsByStudy(Number(req.params.id)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/studies/:id/lab-results", async (req, res) => {
    try {
      const data = insertLabResultSchema.parse({ ...req.body, studyId: Number(req.params.id) });
      const result = await storage.createLabResult(data);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // === IMAGING FINDINGS ===
  app.get("/api/studies/:id/findings", async (req, res) => {
    try {
      res.json(await storage.getImagingFindingsByStudy(Number(req.params.id)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/studies/:id/findings", async (req, res) => {
    try {
      const data = insertImagingFindingSchema.parse({ ...req.body, studyId: Number(req.params.id) });
      const finding = await storage.createImagingFinding(data);
      res.json(finding);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // === ALERTS ===
  app.get("/api/alerts", async (req, res) => {
    try {
      res.json(await storage.getAllAlerts());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const data = insertHealthAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);
      res.json(alert);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/alerts/:id/resolve", async (req, res) => {
    try {
      await storage.resolveAlert(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === STATS ===
  app.get("/api/stats", async (req, res) => {
    try {
      const allStudies = await storage.getAllStudies();
      const alerts = await storage.getUnresolvedAlerts();
      const labs = allStudies.filter(s => s.category === "lab");
      const scans = allStudies.filter(s => s.category === "scan");
      const xrays = allStudies.filter(s => s.category === "xray");

      const allLabResults: any[] = [];
      for (const study of labs) {
        const results = await storage.getLabResultsByStudy(study.id);
        results.forEach(r => allLabResults.push({ ...r, studyDate: study.studyDate }));
      }

      res.json({
        totalStudies: allStudies.length,
        totalLabs: labs.length,
        totalScans: scans.length,
        totalXrays: xrays.length,
        unresolvedAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.type === "critical").length,
        labResults: allLabResults,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === FILE SERVING ===
  app.get("/api/files/:filename", (req, res) => {
    const safeName = path.basename(req.params.filename);
    if (!safeName || safeName.startsWith(".")) return res.status(400).json({ error: "Invalid filename" });
    const uploadsDir = path.resolve("uploads");
    const filePath = path.join(uploadsDir, safeName);
    if (!filePath.startsWith(uploadsDir + path.sep)) return res.status(403).json({ error: "Forbidden" });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.sendFile(filePath);
  });

  // === AI / FUNCTIONAL MEDICINE ===
  app.post("/api/ai/analyze-all", async (req, res) => {
    res.setTimeout(120000);
    try {
      const allStudies = await storage.getAllStudies();
      const studiesWithData = await Promise.all(allStudies.map(async s => ({
        ...s,
        labResults: await storage.getLabResultsByStudy(s.id),
        imagingFindings: await storage.getImagingFindingsByStudy(s.id),
      })));
      const analysis = await analyzeAllResults(studiesWithData);
      res.json({ analysis });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ai/analyze-all-stream", async (req, res) => {
    const patientParam = (req.query.patient as string) ?? "yayo";
    const filterFn = patientParam === "tina"
      ? (s: any) => s.title?.startsWith("[TINA]")
      : (s: any) => !s.title?.startsWith("[TINA]");
    const patientName = patientParam === "tina"
      ? 'Tinamarie "Tina" Cruz, 53 años, femenina'
      : 'Javier "Yayo" Cruz, 54 años, masculino';

    res.setTimeout(180000);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write("event: ping\ndata: {}\n\n");
    }, 15000);

    try {
      const allStudies = await storage.getAllStudies();
      const patientStudies = allStudies.filter(filterFn);
      const studiesWithData = await Promise.all(patientStudies.map(async s => ({
        ...s,
        title: s.title.replace(/^\[TINA\]\s*/, ""),
        labResults: await storage.getLabResultsByStudy(s.id),
        imagingFindings: await storage.getImagingFindingsByStudy(s.id),
      })));
      await analyzeAllResultsStream(studiesWithData, patientName, (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      });
      res.write("event: done\ndata: {}\n\n");
    } catch (e: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  });

  app.post("/api/ai/analyze-study/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const study = await storage.getStudyById(id);
      if (!study) return res.status(404).json({ error: "Study not found" });
      const labResults = await storage.getLabResultsByStudy(id);
      const findings = await storage.getImagingFindingsByStudy(id);
      const analysis = await analyzeStudy(study, labResults, findings);
      res.json({ analysis });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages)) return res.status(400).json({ error: "messages required" });
      const allStudies = await storage.getAllStudies();
      const studiesContext = await Promise.all(allStudies.map(async s => ({
        title: s.title,
        category: s.category,
        studyDate: s.studyDate,
        labResults: await storage.getLabResultsByStudy(s.id),
        imagingFindings: await storage.getImagingFindingsByStudy(s.id),
      })));
      const reply = await chatWithExpert(messages, studiesContext);
      res.json({ reply });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
