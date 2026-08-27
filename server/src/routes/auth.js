import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { readCollection, writeCollection } from '../utils/jsonStore.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const SECTIONS = ['HSC', 'SSC'];

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function issueToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  const { name, email, password, section } = req.body || {};

  if (!name || !email || !password || !section) {
    return res.status(400).json({ message: 'name, email, password and section are required' });
  }
  if (!SECTIONS.includes(section)) {
    return res.status(400).json({ message: 'section must be HSC or SSC' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'password must be at least 6 characters' });
  }

  const users = await readCollection('users');
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const user = {
    id: uuid(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'student',
    section,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeCollection('users', users);

  res.status(201).json({ token: issueToken(user), user: toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const users = await readCollection('users');
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({ token: issueToken(user), user: toPublicUser(user) });
});

router.get('/me', authenticate, async (req, res) => {
  const users = await readCollection('users');
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(toPublicUser(user));
});

export default router;
