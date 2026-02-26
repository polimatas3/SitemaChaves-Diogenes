import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("keys_management.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL -- broker, manager, admin
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    di TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    link TEXT,
    status TEXT DEFAULT 'Ativo', -- Ativo, Retirada, Negociação, Vendida, Inativa
    current_key_location TEXT, -- Lago Norte, Matriz, SCS
    responsible_broker_id INTEGER,
    FOREIGN KEY (responsible_broker_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- Retirada, Devolução, Status, Inativação
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    broker_id INTEGER,
    unit TEXT,
    observations TEXT,
    proposal TEXT,
    feedback TEXT,
    return_forecast DATETIME,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (broker_id) REFERENCES users(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (name, role) VALUES (?, ?)").run("Admin Diógenes", "admin");
  db.prepare("INSERT INTO users (name, role) VALUES (?, ?)").run("Gerente Lago", "manager");
  db.prepare("INSERT INTO users (name, role) VALUES (?, ?)").run("Corretor Silva", "broker");
  
  db.prepare("INSERT INTO properties (di, address, description, link, status, current_key_location) VALUES (?, ?, ?, ?, ?, ?)")
    .run("DI001", "SHIN QL 10, Lago Norte", "Casa de alto padrão", "https://diogenesimoveis.com/imovel/DI001", "Ativo", "Lago Norte");
  db.prepare("INSERT INTO properties (di, address, description, link, status, current_key_location) VALUES (?, ?, ?, ?, ?, ?)")
    .run("DI002", "SCS Quadra 4, Edifício Vera Cruz", "Sala comercial reformada", "https://diogenesimoveis.com/imovel/DI002", "Ativo", "SCS");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.get("/api/properties", (req, res) => {
    const { search } = req.query;
    let query = "SELECT * FROM properties";
    let params = [];
    if (search) {
      query += " WHERE di LIKE ? OR address LIKE ?";
      params = [`%${search}%`, `%${search}%`];
    }
    const properties = db.prepare(query).all(...params);
    res.json(properties);
  });

  app.get("/api/properties/:id", (req, res) => {
    const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
    const movements = db.prepare("SELECT m.*, u.name as broker_name FROM movements m LEFT JOIN users u ON m.broker_id = u.id WHERE property_id = ? ORDER BY timestamp DESC").all(req.params.id);
    res.json({ ...property, movements });
  });

  app.post("/api/properties", (req, res) => {
    const { di, address, description, link, current_key_location } = req.body;
    try {
      const result = db.prepare("INSERT INTO properties (di, address, description, link, current_key_location) VALUES (?, ?, ?, ?, ?)")
        .run(di, address, description, link, current_key_location);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "DI já existe ou dados inválidos" });
    }
  });

  app.post("/api/movements/withdraw", (req, res) => {
    const { property_id, broker_id, unit, return_forecast, observations, proposal, feedback } = req.body;
    
    const property = db.prepare("SELECT status FROM properties WHERE id = ?").get(property_id) as any;
    if (property.status === 'Retirada') {
      return res.status(400).json({ error: "Chave já está retirada" });
    }

    const transaction = db.transaction(() => {
      db.prepare("UPDATE properties SET status = 'Retirada', responsible_broker_id = ? WHERE id = ?")
        .run(broker_id, property_id);
      
      db.prepare("INSERT INTO movements (property_id, type, broker_id, unit, return_forecast, observations, proposal, feedback) VALUES (?, 'Retirada', ?, ?, ?, ?, ?, ?)")
        .run(property_id, broker_id, unit, return_forecast, observations, proposal, feedback);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.post("/api/movements/return", (req, res) => {
    const { property_id, unit, observations } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare("UPDATE properties SET status = 'Ativo', current_key_location = ?, responsible_broker_id = NULL WHERE id = ?")
        .run(unit, property_id);
      
      db.prepare("INSERT INTO movements (property_id, type, unit, observations) VALUES (?, 'Devolução', ?, ?)")
        .run(property_id, unit, observations);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.post("/api/properties/:id/status", (req, res) => {
    const { status, broker_id } = req.body;
    const property_id = req.params.id;

    db.prepare("UPDATE properties SET status = ? WHERE id = ?").run(status, property_id);
    db.prepare("INSERT INTO movements (property_id, type, broker_id, observations) VALUES (?, 'Status', ?, ?)")
      .run(property_id, broker_id, `Status alterado para ${status}`);
    
    res.json({ success: true });
  });

  app.get("/api/movements/active", (req, res) => {
    const active = db.prepare(`
      SELECT m.*, p.di, p.address, u.name as broker_name 
      FROM movements m 
      JOIN properties p ON m.property_id = p.id 
      JOIN users u ON m.broker_id = u.id 
      WHERE m.type = 'Retirada' AND p.status = 'Retirada'
      ORDER BY m.timestamp DESC
    `).all();
    res.json(active);
  });

  app.get("/api/movements/all", (req, res) => {
    const movements = db.prepare(`
      SELECT m.*, p.di, p.address, u.name as broker_name 
      FROM movements m 
      JOIN properties p ON m.property_id = p.id 
      LEFT JOIN users u ON m.broker_id = u.id 
      ORDER BY m.timestamp ASC
    `).all();
    res.json(movements);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
