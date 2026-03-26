import React, { useState, useEffect, useCallback } from "react";

// L'URL de l'API est configurable via une variable d'environnement
// En dev local  : proxy dans package.json redirige vers localhost:3001
// En K8s étape 4: REACT_APP_API_URL injecté depuis un ConfigMap via nginx
const API_URL = process.env.REACT_APP_API_URL || "";

// ─── Composant BookForm — formulaire création / édition ──────────────────────
function BookForm({ book, onSave, onCancel }) {
  const [form, setForm] = useState(
    book || { title: "", author: "", year: "", genre: "", description: "", read: false }
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, year: form.year ? parseInt(form.year) : null });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{book ? "✏️ Modifier le livre" : "➕ Ajouter un livre"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titre *</label>
            <input name="title" value={form.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Auteur *</label>
            <input name="author" value={form.author} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Année</label>
              <input name="year" type="number" value={form.year} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Genre</label>
              <input name="genre" value={form.genre} onChange={handleChange} placeholder="Roman, SF…" />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="read"
                checked={form.read}
                onChange={handleChange}
                style={{ marginRight: "0.5rem" }}
              />
              Déjà lu
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {book ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant BookCard — carte d'un livre ───────────────────────────────────
function BookCard({ book, onEdit, onDelete, onToggleRead }) {
  return (
    <div className={`book-card ${book.read ? "read" : ""}`}>
      <h3>📖 {book.title}</h3>
      <p className="author">✍️ {book.author}</p>
      <div className="meta">
        {book.year && <span className="badge">{book.year}</span>}
        {book.genre && <span className="badge">{book.genre}</span>}
        <span className={`badge ${book.read ? "read" : "unread"}`}>
          {book.read ? "✅ Lu" : "📌 À lire"}
        </span>
      </div>
      {book.description && <p className="description">{book.description}</p>}
      <div className="book-actions">
        <button className="btn btn-sm btn-warning" onClick={() => onToggleRead(book.id)}>
          {book.read ? "Marquer non lu" : "Marquer lu"}
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => onEdit(book)}>
          Modifier
        </button>
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(book.id)}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

// ─── Composant App principal ─────────────────────────────────────────────────
export default function App() {
  const [books, setBooks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all"); // all | read | unread
  const [showForm, setShowForm]   = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Chargement des livres depuis l'API
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/books`);
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const data = await res.json();
      setBooks(data);
      setError(null);
    } catch (err) {
      setError("Impossible de contacter l'API. Vérifiez que le backend est démarré.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // Ajout ou modification d'un livre
  const handleSave = async (formData) => {
    try {
      const url    = editingBook ? `${API_URL}/api/books/${editingBook.id}` : `${API_URL}/api/books`;
      const method = editingBook ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      setShowForm(false);
      setEditingBook(null);
      fetchBooks();
    } catch (err) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    }
  };

  // Suppression
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce livre ?")) return;
    await fetch(`${API_URL}/api/books/${id}`, { method: "DELETE" });
    fetchBooks();
  };

  // Bascule lu / non lu
  const handleToggleRead = async (id) => {
    await fetch(`${API_URL}/api/books/${id}/read`, { method: "PATCH" });
    fetchBooks();
  };

  // Filtrage et recherche côté client
  const filteredBooks = books
    .filter((b) => filter === "all" || (filter === "read" ? b.read : !b.read))
    .filter((b) =>
      search === "" ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total:  books.length,
    read:   books.filter((b) => b.read).length,
    unread: books.filter((b) => !b.read).length,
  };

  return (
    <div className="app">
      {/* ── En-tête ── */}
      <header>
        <h1>📚 BookShelf</h1>
        <p>Gérez votre bibliothèque personnelle</p>
      </header>

      {/* ── Statistiques ── */}
      <div className="stats">
        <div className="stat-card">
          <div className="number">{stats.total}</div>
          <div className="label">Total</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.read}</div>
          <div className="label">Lus</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.unread}</div>
          <div className="label">À lire</div>
        </div>
      </div>

      {/* ── Barre d'outils ── */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 Rechercher par titre ou auteur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="btn btn-secondary"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tous</option>
          <option value="read">Lus</option>
          <option value="unread">À lire</option>
        </select>
        <button
          className="btn btn-success"
          onClick={() => { setEditingBook(null); setShowForm(true); }}
        >
          ➕ Ajouter
        </button>
      </div>

      {/* ── Contenu principal ── */}
      {loading && <div className="loading">⏳ Chargement de la bibliothèque…</div>}
      {error   && <div className="error">❌ {error}</div>}

      {!loading && !error && filteredBooks.length === 0 && (
        <div className="empty">📭 Aucun livre trouvé.</div>
      )}

      {!loading && !error && (
        <div className="books-grid">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={(b) => { setEditingBook(b); setShowForm(true); }}
              onDelete={handleDelete}
              onToggleRead={handleToggleRead}
            />
          ))}
        </div>
      )}

      {/* ── Formulaire modal ── */}
      {showForm && (
        <BookForm
          book={editingBook}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingBook(null); }}
        />
      )}
    </div>
  );
}
