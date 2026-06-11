import express from 'express';
import { login, register } from '../controllers/authController.js';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { getGeofences, createGeofence, updateGeofence, deleteGeofence } from '../controllers/geofenceController.js';
import { getAlerts, createAlert, acknowledgeAlert } from '../controllers/alertController.js';
import { getLocations, createLocation } from '../controllers/locationController.js';
import { getReports } from '../controllers/reportController.js';
import { handleESP32Data } from '../controllers/esp32Controller.js';
import { getDispatches, createDispatch } from '../controllers/dispatchController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// --- PUBLIC ENDPOINTS ---
router.post('/login', login);
router.post('/register', register);
router.post('/esp32', handleESP32Data); // ESP32 physical push endpoint
router.post('/locations', createLocation); // Standard location logger (can also be used by ESP32)

// --- PROTECTED ENDPOINTS (Requires Token) ---
router.use(verifyToken);

// User Management
router.get('/users', checkRole(['admin']), getUsers);
router.post('/users', checkRole(['admin']), createUser);
router.put('/users/:id', checkRole(['admin']), updateUser);
router.delete('/users/:id', checkRole(['admin']), deleteUser);

// Geofence Management
router.get('/geofences', getGeofences);
router.post('/geofences', checkRole(['admin']), createGeofence);
router.put('/geofences/:id', checkRole(['admin']), updateGeofence);
router.delete('/geofences/:id', checkRole(['admin']), deleteGeofence);

// Location Tracking
router.get('/locations', getLocations);

// Alert Management
router.get('/alerts', getAlerts);
router.post('/alerts', checkRole(['admin', 'supervisor']), createAlert);
router.put('/alerts/:id/acknowledge', checkRole(['admin', 'supervisor']), acknowledgeAlert);

// Dispatch Management
router.get('/dispatches', getDispatches);
router.post('/dispatches', checkRole(['admin', 'supervisor']), createDispatch);

// Reports
router.get('/reports', getReports);

export default router;
