import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { getDBStatus } from '../config/db.js';
import { mockStore } from '../config/mockStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_wristband_secret_key_123456';

export async function login(req, res) {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  try {
    let user;
    if (getDBStatus()) {
      user = await User.findOne({ phone });
    } else {
      user = mockStore.users.find(u => u.phone === phone);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    // Wearers are not allowed to log into the administrative panel
    if (user.role === 'wearer') {
      return res.status(403).json({ error: 'Access denied: Wearers cannot access control panel' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
}

export async function register(req, res) {
  const { name, phone, age, role, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  }

  try {
    const isDb = getDBStatus();
    let existingUser;
    
    if (isDb) {
      existingUser = await User.findOne({ phone });
    } else {
      existingUser = mockStore.users.find(u => u.phone === phone);
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser;

    if (isDb) {
      newUser = await User.create({
        name,
        phone,
        age,
        role: role || 'supervisor',
        password: hashedPassword,
        status: 'Active'
      });
    } else {
      newUser = {
        _id: 'usr_' + Math.random().toString(36).substr(2, 9),
        name,
        phone,
        age,
        role: role || 'supervisor',
        password: hashedPassword,
        status: 'Active',
        assignedZone: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStore.users.push(newUser);
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
}
