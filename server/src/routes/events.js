const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

router.get('/', async (_req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({ date: { $gte: now } })
      .sort({ date: 1 })
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email');
    return res.json(events);
  } catch (err) {
    console.error('List events error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    return res.json(event);
  } catch (err) {
    console.error('Get event error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;
    if (!title || !description || !date || !location || !capacity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const event = await Event.create({
      title,
      description,
      date,
      location,
      capacity,
      imageUrl,
      createdBy: req.user.id,
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error('Create event error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const { title, description, date, location, capacity } = req.body;
    if (req.file) {
      event.imageUrl = `/uploads/${req.file.filename}`;
    }
    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = date;
    if (location) event.location = location;
    if (capacity) event.capacity = capacity;

    await event.save();
    return res.json(event);
  } catch (err) {
    console.error('Update event error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await event.deleteOne();
    return res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/rsvp', auth, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      {
        _id: req.params.id,
        attendees: { $ne: req.user.id },
        $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] },
      },
      { $push: { attendees: req.user.id } },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email');

    if (!event) {
      const exists = await Event.findById(req.params.id);
      if (!exists) return res.status(404).json({ message: 'Event not found' });
      const already = exists.attendees.some((a) => a.toString() === req.user.id);
      if (already) return res.status(409).json({ message: 'Already joined' });
      return res.status(409).json({ message: 'Event is full' });
    }

    return res.json(event);
  } catch (err) {
    console.error('RSVP error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/unrsvp', auth, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id },
      { $pull: { attendees: req.user.id } },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email');

    if (!event) return res.status(404).json({ message: 'Event not found' });
    return res.json(event);
  } catch (err) {
    console.error('UnRSVP error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine/created', auth, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.id }).sort({ date: 1 });
    return res.json(events);
  } catch (err) {
    console.error('My created events error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine/attending', auth, async (req, res) => {
  try {
    const events = await Event.find({ attendees: req.user.id }).sort({ date: 1 });
    return res.json(events);
  } catch (err) {
    console.error('My attending events error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


