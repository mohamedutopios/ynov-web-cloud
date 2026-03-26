require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Connexion PostgreSQL ─────────────────────────────────────────────────────
// Les variables d'environnement sont injectées :
//   - en dev       : depuis le fichier .env
//   - en K8s étape 4 : depuis un ConfigMap
//   - en K8s étape 5 : depuis un Secret (DB_USER, DB_PASSWORD)
const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "bookshelf",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// ─── Initialisation de la base de données ────────────────────────────────────
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        author      VARCHAR(255) NOT NULL,
        year        INTEGER,
        genre       VARCHAR(100),
        description TEXT,
        read        BOOLEAN DEFAULT false,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // Données de démonstration (insérées seulement si la table est vide)
    const { rows } = await pool.query("SELECT COUNT(*) FROM books");
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO books (title, author, year, genre, description, read) VALUES
          ('Le Petit Prince',        'Antoine de Saint-Exupéry', 1943, 'Roman',       'Un aviateur rencontre un mystérieux petit garçon.',         true),
          ('1984',                   'George Orwell',            1949, 'Dystopie',    'Une société totalitaire sous la surveillance de Big Brother.', true),
          ('Dune',                   'Frank Herbert',            1965, 'Science-Fi.', 'Une saga épique sur la planète désertique Arrakis.',         false),
          ('Les Misérables',         'Victor Hugo',              1862, 'Roman',       'L''épopée de Jean Valjean dans la France du XIXe siècle.',   false),
          ('L''Étranger',            'Albert Camus',             1942, 'Philosophie', 'Meursault et l''absurde face à la mort.',                    true);
      `);
      console.log("✅ Données de démonstration insérées");
    }

    console.log("✅ Base de données initialisée");
  } catch (err) {
    console.error("❌ Erreur initialisation DB :", err.message);
    // Réessayer après 3 secondes (le Pod PostgreSQL peut démarrer après l'API)
    setTimeout(initDB, 3000);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /health — Sonde de santé pour K8s (livenessProbe + readinessProbe)
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// GET /api/books — Lister tous les livres
app.get("/api/books", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM books ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/:id — Récupérer un livre par son id
app.get("/api/books/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM books WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Livre non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/books — Créer un nouveau livre
app.post("/api/books", async (req, res) => {
  const { title, author, year, genre, description, read } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: "title et author sont obligatoires" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO books (title, author, year, genre, description, read)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, author, year || null, genre || null, description || null, read || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/books/:id — Mettre à jour un livre
app.put("/api/books/:id", async (req, res) => {
  const { title, author, year, genre, description, read } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE books
       SET title=$1, author=$2, year=$3, genre=$4, description=$5, read=$6
       WHERE id=$7 RETURNING *`,
      [title, author, year, genre, description, read, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Livre non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/books/:id/read — Basculer l'état "lu / non lu"
app.patch("/api/books/:id/read", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE books SET read = NOT read WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Livre non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/books/:id — Supprimer un livre
app.delete("/api/books/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM books WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Livre non trouvé" });
    res.json({ message: "Livre supprimé", book: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API BookShelf démarrée sur le port ${PORT}`);
  console.log(`   DB_HOST : ${process.env.DB_HOST || "localhost"}`);
  console.log(`   DB_NAME : ${process.env.DB_NAME || "bookshelf"}`);
  initDB();
});
