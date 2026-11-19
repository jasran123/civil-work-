const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

let inMemoryDesigns = [];

const isDbConnected = () => {
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
};

const getDesign = () => {
  if (isDbConnected()) {
    return require('../models/Design');
  }
  return null;
};

// GET /api/designs
router.get('/', auth, async (req, res) => {
  try {
    const Design = getDesign();
    if (Design) {
      const designs = await Design.find({ user: req.user.id }).sort({ createdAt: -1 });
      return res.json(designs);
    } else {
      const designs = inMemoryDesigns.filter((d) => d.user === req.user.id);
      return res.json(designs);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// POST /api/designs
router.post('/', auth, async (req, res) => {
  try {
    const Design = getDesign();
    const designData = { ...req.body, user: req.user.id };

    if (Design) {
      const design = new Design(designData);
      await design.save();
      return res.json(design);
    } else {
      const design = {
        ...designData,
        _id: 'des_' + Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDesigns.unshift(design);
      return res.json(design);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// PUT /api/designs/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const Design = getDesign();
    if (Design) {
      const design = await Design.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        { ...req.body, updatedAt: Date.now() },
        { new: true }
      );
      if (!design) return res.status(404).json({ msg: 'Design not found' });
      return res.json(design);
    } else {
      const idx = inMemoryDesigns.findIndex((d) => d._id === req.params.id && d.user === req.user.id);
      if (idx === -1) return res.status(404).json({ msg: 'Design not found' });
      inMemoryDesigns[idx] = { ...inMemoryDesigns[idx], ...req.body, updatedAt: new Date() };
      return res.json(inMemoryDesigns[idx]);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// DELETE /api/designs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const Design = getDesign();
    if (Design) {
      const design = await Design.findOneAndDelete({ _id: req.params.id, user: req.user.id });
      if (!design) return res.status(404).json({ msg: 'Design not found' });
      return res.json({ msg: 'Design removed' });
    } else {
      const idx = inMemoryDesigns.findIndex((d) => d._id === req.params.id && d.user === req.user.id);
      if (idx === -1) return res.status(404).json({ msg: 'Design not found' });
      inMemoryDesigns.splice(idx, 1);
      return res.json({ msg: 'Design removed' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
