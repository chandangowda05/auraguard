import User from '../models/User.js';
import { getDBStatus } from '../config/db.js';
import { mockStore } from '../config/mockStore.js';
import bcrypt from 'bcryptjs';

export async function getUsers(req, res) {
  try {
    if (getDBStatus()) {
      const users = await User.find({});
      res.json(users);
    } else {
      res.json(mockStore.users);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
}

export async function createUser(req, res) {
  const { name, phone, age, wristbandId, assignedZone, status, role, password } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const isDb = getDBStatus();
    let existing;
    if (isDb) {
      existing = await User.findOne({ phone });
    } else {
      existing = mockStore.users.find(u => u.phone === phone);
    }

    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let newUser;
    if (isDb) {
      newUser = await User.create({
        name,
        phone,
        age,
        wristbandId: wristbandId || undefined,
        assignedZone: assignedZone || '',
        status: status || 'Active',
        role: role || 'wearer',
        password: hashedPassword
      });
    } else {
      newUser = {
        _id: 'usr_' + Math.random().toString(36).substr(2, 9),
        name,
        phone,
        age: age ? Number(age) : undefined,
        wristbandId: wristbandId || undefined,
        assignedZone: assignedZone || '',
        status: status || 'Active',
        role: role || 'wearer',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStore.users.push(newUser);
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Server error creating user' });
  }
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, phone, age, wristbandId, assignedZone, status, role, password } = req.body;

  try {
    const isDb = getDBStatus();
    let updatedUser;

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    if (isDb) {
      const updateData = { name, phone, age, wristbandId, assignedZone, status, role };
      if (hashedPassword) updateData.password = hashedPassword;
      // Filter undefined
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
      
      updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
    } else {
      const idx = mockStore.users.findIndex(u => u._id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      const original = mockStore.users[idx];
      updatedUser = {
        ...original,
        name: name !== undefined ? name : original.name,
        phone: phone !== undefined ? phone : original.phone,
        age: age !== undefined ? Number(age) : original.age,
        wristbandId: wristbandId !== undefined ? wristbandId : original.wristbandId,
        assignedZone: assignedZone !== undefined ? assignedZone : original.assignedZone,
        status: status !== undefined ? status : original.status,
        role: role !== undefined ? role : original.role,
        updatedAt: new Date()
      };

      if (hashedPassword) {
        updatedUser.password = hashedPassword;
      }

      mockStore.users[idx] = updatedUser;
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    if (getDBStatus()) {
      const result = await User.findByIdAndDelete(id);
      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }
    } else {
      const idx = mockStore.users.findIndex(u => u._id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'User not found' });
      }
      mockStore.users.splice(idx, 1);
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
}
