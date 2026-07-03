const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');

// ==========================================
// PUBLIC: Get all active services
// ==========================================
router.get('/', async (req, res) => {
  try {
    await dbConnect();   // ← MUST ADD THIS
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.json(services);
  } catch (err) {
    console.error('Error fetching public services:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// ADMIN: Get all services (including inactive)
// ==========================================
router.get('/admin', async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (err) {
    console.error('Error fetching admin services:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// ADMIN: Create a new service
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { name, description, duration, icon, iconClass } = req.body;

    // Validation
    if (!name || !duration) {
      return res.status(400).json({ error: 'Name and duration are required' });
    }

    // Check for duplicate name
    const existing = await Service.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'A service with this name already exists' });
    }

    const service = new Service({
      name,
      description: description || '',
      duration,
      icon: icon || '📋',
      iconClass: iconClass || ''
    });

    await service.save();
    res.status(201).json(service);
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// ADMIN: Update a service
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { name, description, duration, icon, iconClass, isActive } = req.body;
    const serviceId = req.params.id;

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check duplicate name (if name is changing)
    if (name && name !== service.name) {
      const existing = await Service.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: serviceId }
      });
      if (existing) {
        return res.status(400).json({ error: 'A service with this name already exists' });
      }
    }

    // Update fields
    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration) service.duration = duration;
    if (icon) service.icon = icon;
    if (iconClass !== undefined) service.iconClass = iconClass;
    if (isActive !== undefined) service.isActive = isActive;
    service.updatedAt = new Date();

    await service.save();
    res.json(service);
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// ADMIN: Soft delete (set inactive)
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ success: true, message: 'Service deactivated' });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;