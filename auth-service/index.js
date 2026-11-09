const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Database Connection Configuration
// We use environment variables because these will change inside Docker
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_db',
  password: process.env.DB_PASSWORD || 'password',
  port: 5432,
});

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';
// Le compte dont le username est ADMIN_USERNAME est administrateur
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// 2. Health Check Route (To prove it's alive)
app.get('/', (req, res) => {
  res.send('Auth Service is running!');
});

// 3. Register Route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Hash the password (Security Best Practice)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert into DB
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email || null, hashedPassword]
    );
    
    res.status(201).json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User registration failed' });
  }
});

// 4. Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Generate VIP Wristband (JWT)
    const token = jwt.sign({ id: user.id, username: user.username, admin: user.username === ADMIN_USERNAME }, SECRET_KEY, { expiresIn: '1h' });
    
    res.json({ token, admin: user.username === ADMIN_USERNAME });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------- ADMIN ----------
const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET_KEY);
    if (!payload.admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Liste des utilisateurs (sans les mots de passe)
app.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Suppression d'un utilisateur (l'admin ne peut pas se supprimer lui-meme)
app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});