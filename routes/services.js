const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// ====================== PUBLIC ROUTES ======================

// Get all active services (for frontend booking)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.json(services);
  } catch (err) {
    console.error('Fetch services error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ====================== ADMIN ROUTES ======================

// Get all services (including inactive)
router.get('/admin', auth, authorize('admin'), async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new service
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, description, duration, icon, iconClass } = req.body;

    if (!name || !duration) {
      return res.status(400).json({ success: false, message: 'Name and duration are required' });
    }

    // Check duplicate
    const existing = await Service.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Service with this name already exists' });
    }

    const service = new Service({
      name,
      description: description || '',
      duration,
      icon: icon || '🦷',
      iconClass: iconClass || ''
    });

    await service.save();
    res.status(201).json({ success: true, service });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update service
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, description, duration, icon, iconClass, isActive } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration) service.duration = duration;
    if (icon) service.icon = icon;
    if (iconClass !== undefined) service.iconClass = iconClass;
    if (isActive !== undefined) service.isActive = isActive;

    service.updatedAt = new Date();
    await service.save();

    res.json({ success: true, service });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete (soft delete - set inactive)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, message: 'Service deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;