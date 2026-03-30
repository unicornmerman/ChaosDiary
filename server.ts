import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ensure directories exist
  const DREAMS_RAW = path.join(process.cwd(), "dreams", "raw");
  const DREAMS_PROCESSED = path.join(process.cwd(), "dreams", "processed");
  
  await fs.mkdir(DREAMS_RAW, { recursive: true });
  await fs.mkdir(DREAMS_PROCESSED, { recursive: true });

  // API Routes
  app.post("/api/capture", async (req, res) => {
    try {
      const signal = req.body;
      const id = uuidv4();
      const timestamp = Math.floor(Date.now() / 1000);
      
      const rawPayload = {
        id,
        timestamp,
        signal,
        context: {
          device: "web-haptic",
          version: "1.0.0"
        }
      };

      const rawPath = path.join(DREAMS_RAW, `${id}.json`);
      await fs.writeFile(rawPath, JSON.stringify(rawPayload, null, 2));

      // Auto-process (The "Interpretation Plugin" logic)
      const dateStr = new Date().toISOString().split('T')[0];
      const intensityPeak = Math.max(...signal.intensity_series, 0);
      
      const processedContent = `---
id: ${id}
type: dream-entry
date: ${dateStr}
anchor: ${signal.anchor_word || "untitled"}
intensity_peak: ${intensityPeak}
---

# Dream: ${signal.anchor_word || "Untitled"}
![[raw/${id}.json]]

## Interpretation
`;

      const processedPath = path.join(DREAMS_PROCESSED, `${id}.md`);
      await fs.writeFile(processedPath, processedContent);

      res.json({ id, status: "committed" });
    } catch (error) {
      console.error("Capture error:", error);
      res.status(500).json({ error: "Failed to commit signal" });
    }
  });

  app.get("/api/dreams", async (req, res) => {
    try {
      const files = await fs.readdir(DREAMS_PROCESSED);
      const dreams = await Promise.all(
        files.filter(f => f.endsWith(".md")).map(async (f) => {
          const content = await fs.readFile(path.join(DREAMS_PROCESSED, f), "utf-8");
          return { id: f.replace(".md", ""), content };
        })
      );
      res.json(dreams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dreams" });
    }
  });

  app.get("/api/dreams/raw/:id", async (req, res) => {
    try {
      const data = await fs.readFile(path.join(DREAMS_RAW, `${req.params.id}.json`), "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(404).json({ error: "Raw signal not found" });
    }
  });

  app.put("/api/dreams/:id", async (req, res) => {
    try {
      const { content } = req.body;
      await fs.writeFile(path.join(DREAMS_PROCESSED, `${req.params.id}.md`), content);
      res.json({ status: "updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update dream" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
