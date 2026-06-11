import Dispatch from '../models/Dispatch.js';
import User from '../models/User.js';
import { getDBStatus } from '../config/db.js';
import { mockStore } from '../config/mockStore.js';

export async function getDispatches(req, res) {
  try {
    if (getDBStatus()) {
      const dispatches = await Dispatch.find({}).sort({ timestamp: -1 }).populate('staffId', 'name role').populate('wearerId', 'name wristbandId');
      const formatted = dispatches.map(d => ({
        ...d._doc,
        staffName: d.staffId ? d.staffId.name : d.staffName,
        staffRole: d.staffId ? d.staffId.role : undefined,
        wearerName: d.wearerId ? d.wearerId.name : d.wearerName,
        wearerWristband: d.wearerId ? d.wearerId.wristbandId : undefined
      }));
      return res.json(formatted);
    }

    const formatted = mockStore.dispatches
      .map(d => {
        const staffMember = mockStore.users.find(u => u._id === d.staffId);
        const wearer = mockStore.users.find(u => u._id === d.wearerId);
        return {
          ...d,
          staffName: staffMember ? staffMember.name : d.staffName,
          staffRole: staffMember ? staffMember.role : undefined,
          wearerName: wearer ? wearer.name : d.wearerName,
          wearerWristband: wearer ? wearer.wristbandId : undefined
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching dispatches:', error);
    res.status(500).json({ error: 'Server error fetching dispatches' });
  }
}

export async function createDispatch(req, res) {
  const { staffId, wearerId, staffName, wearerName, zoneName, zoneType } = req.body;

  if (!staffId || !wearerId || !staffName || !wearerName || !zoneName) {
    return res.status(400).json({ error: 'staffId, wearerId, staffName, wearerName and zoneName are required' });
  }

  try {
    const isDb = getDBStatus();
    let staffUser;
    let wearerUser;

    if (isDb) {
      staffUser = await User.findById(staffId);
      wearerUser = await User.findById(wearerId);
      if (!staffUser || !wearerUser) {
        return res.status(404).json({ error: 'Staff or wearer user not found' });
      }
    } else {
      staffUser = mockStore.users.find(u => u._id === staffId);
      wearerUser = mockStore.users.find(u => u._id === wearerId);
      if (!staffUser || !wearerUser) {
        return res.status(404).json({ error: 'Staff or wearer user not found' });
      }
    }

    const message = `${staffName} has been dispatched to ${zoneName} for ${wearerName}`;

    let newDispatch;
    if (isDb) {
      newDispatch = await Dispatch.create({
        staffId,
        wearerId,
        staffName,
        wearerName,
        zoneName,
        zoneType: zoneType || 'restricted',
        message,
        status: 'Assigned'
      });
    } else {
      newDispatch = {
        _id: 'dst_' + Math.random().toString(36).substr(2, 9),
        staffId,
        wearerId,
        staffName,
        wearerName,
        zoneName,
        zoneType: zoneType || 'restricted',
        message,
        status: 'Assigned',
        timestamp: new Date()
      };
      mockStore.dispatches.push(newDispatch);
    }

    res.status(201).json(newDispatch);
  } catch (error) {
    console.error('Error creating dispatch:', error);
    res.status(500).json({ error: 'Server error creating dispatch' });
  }
}
