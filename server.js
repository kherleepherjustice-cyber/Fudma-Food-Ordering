// FUDMA-GET 411 - Group 8 Mini Project
// Campus Food & Mini Mart Ordering System
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
app.use(express.json());
const pub = path.join(__dirname, 'public');
if (fs.existsSync(pub)) app.use(express.static(pub));
['index.html', 'staff.html', 'style.css'].forEach((f) => app.get(f === 'index.html' ? ['/', '/index.html'] : '/' + f, (req, res) => res.sendFile(path.join(__dirname, f))));

// ---------- Staff login codes (group matric numbers) ----------
const STAFF_MATRICS = [
  'ENG/2024/32910', 'ENG/2025/39685', 'ENG/2024/32421', 'ENG/2024/32113',
  'ENG/2024/31583', 'ENG/2024/31983', 'ENG/2024/31925', 'ENG/2024/35041',
  'ENG/2024/32014', 'ENG/2024/31750', 'ENG/2024/32102'
];
const norm = (s) => String(s || '').trim().toUpperCase();

// ---------- Menu (ids are generated) ----------
const menu = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));
const itemIndex = {};
menu.forEach((cat, ci) => {
  cat.items.forEach((it, ii) => {
    it.id = `${ci}-${ii}`;
    itemIndex[it.id] = { ...it, category: cat.category };
  });
});

// ---------- Persistent storage (users, orders, transactions) ----------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

let db = { users: [], orders: [], transactions: [] };
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { console.error('Could not read db.json, starting fresh:', e.message); }
}
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- Live updates (Server-Sent Events) ----------
const clients = new Set();
app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});
const broadcast = () => clients.forEach((c) => c.write('event: update\ndata: 1\n\n'));
setInterval(() => clients.forEach((c) => c.write(': ping\n\n')), 25000);

// ---------- Staff sessions ----------
const sessions = new Map(); // token -> matric
function requireStaff(req, res, next) {
  const matric = sessions.get(req.get('x-token'));
  if (!matric) return res.status(401).json({ error: 'Please log in as staff.' });
  req.staff = matric;
  next();
}

// ---------- Public API ----------
app.get('/api/menu', (req, res) => res.json(menu));

app.post('/api/orders', (req, res) => {
  const name = String(req.body.name || '').trim();
  const matric = norm(req.body.matric);
  const note = String(req.body.note || '').trim().slice(0, 200);
  const raw = Array.isArray(req.body.items) ? req.body.items : [];

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (matric.length < 4) return res.status(400).json({ error: 'Please enter your student/matric ID.' });

  const items = [];
  let total = 0;
  for (const r of raw) {
    const base = itemIndex[r.id];
    const qty = Math.floor(Number(r.qty));
    if (!base || !(qty > 0) || qty > 50) continue;
    items.push({ id: base.id, name: base.name, category: base.category, price: base.price, qty });
    total += base.price * qty;
  }
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const now = new Date().toISOString();

  // save / update user record
  let user = db.users.find((u) => u.matric === matric);
  if (!user) {
    user = { matric, name, firstSeen: now, orderCount: 0 };
    db.users.push(user);
  }
  user.name = name;
  user.lastOrder = now;
  user.orderCount += 1;

  const id = 'FD' + String(db.orders.length + 1).padStart(4, '0');
  const order = {
    id, name, matric, note, items, total,
    status: 'Pending',
    createdAt: now,
    history: [{ status: 'Pending', at: now, by: 'customer' }]
  };
  db.orders.push(order);
  db.transactions.push({
    id: 'TX' + id.slice(2), orderId: id, matric, amount: total,
    status: 'Unpaid', createdAt: now
  });
  save();
  broadcast();
  res.json(order);
});

// Customer tracking by order ids (ids come from the customer's own browser)
app.get('/api/track', (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 30);
  const out = db.orders
    .filter((o) => ids.includes(o.id))
    .map(({ id, items, total, status, createdAt, history }) => ({ id, items, total, status, createdAt, history }));
  res.json(out);
});

// ---------- Staff API ----------
app.post('/api/staff/login', (req, res) => {
  const matric = norm(req.body.matric);
  if (!STAFF_MATRICS.includes(matric)) return res.status(401).json({ error: 'Invalid staff matric number.' });
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, matric);
  res.json({ token, matric });
});

app.get('/api/staff/orders', requireStaff, (req, res) => {
  res.json([...db.orders].reverse());
});

const STATUSES = ['Accepted', 'Ready', 'Delivered', 'Rejected'];
app.patch('/api/staff/orders/:id/status', requireStaff, (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const status = req.body.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  const now = new Date().toISOString();
  order.status = status;
  order.history.push({ status, at: now, by: req.staff });

  const tx = db.transactions.find((t) => t.orderId === order.id);
  if (tx) {
    if (status === 'Delivered') { tx.status = 'Completed'; tx.completedAt = now; tx.handledBy = req.staff; }
    if (status === 'Rejected') { tx.status = 'Cancelled'; }
  }
  save();
  broadcast();
  res.json(order);
});

app.get('/api/staff/summary', requireStaff, (req, res) => {
  const completed = db.transactions.filter((t) => t.status === 'Completed');
  res.json({
    users: db.users.length,
    orders: db.orders.length,
    pending: db.orders.filter((o) => o.status === 'Pending').length,
    revenue: completed.reduce((s, t) => s + t.amount, 0),
    transactions: [...db.transactions].reverse().slice(0, 100)
  });
});

app.get('/api/staff/users', requireStaff, (req, res) => res.json(db.users));

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`  This computer : http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  Object.values(nets).flat().forEach((n) => {
    if (n && n.family === 'IPv4' && !n.internal) console.log(`  Local network : http://${n.address}:${PORT}`);
  });
  console.log(`  Staff page    : /staff.html\n`);
});
