import { Router, Response } from 'express';
import Group from '../models/Group';
import Assignment from '../models/Assignment';
import { authenticateToken, AuthRequest } from '../config/auth';

const router = Router();

// 1. Get all groups created by the authenticated user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groups = await Group.find({ creator: req.userId }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve groups.' });
  }
});

// 2. Create a new group
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, grade, subject, description, students } = req.body;

    if (!name || !grade || !subject) {
      res.status(400).json({ error: 'Group name, grade level, and subject are required.' });
      return;
    }

    const newGroup = new Group({
      name,
      grade,
      subject,
      description,
      creator: req.userId,
      students: students || [],
      assignments: []
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create group.' });
  }
});

// 3. Get detailed info of a specific group
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await Group.findOne({ _id: req.params.id, creator: req.userId })
      .populate('assignments.assignmentId');

    if (!group) {
      res.status(404).json({ error: 'Group not found or unauthorized.' });
      return;
    }

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve group details.' });
  }
});

// 4. Update a group (including student roster)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, grade, subject, description, students } = req.body;

    if (!name || !grade || !subject) {
      res.status(400).json({ error: 'Group name, grade level, and subject are required.' });
      return;
    }

    const group = await Group.findOneAndUpdate(
      { _id: req.params.id, creator: req.userId },
      { name, grade, subject, description, students: students || [] },
      { new: true, runValidators: true }
    );

    if (!group) {
      res.status(404).json({ error: 'Group not found or unauthorized.' });
      return;
    }

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update group.' });
  }
});

// 5. Delete a group
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await Group.deleteOne({ _id: req.params.id, creator: req.userId });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Group not found or unauthorized.' });
      return;
    }

    res.json({ message: 'Group deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete group.' });
  }
});

// 6. Assign an assignment to a group
router.post('/:id/assign', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId, dueDate } = req.body;

    if (!assignmentId) {
      res.status(400).json({ error: 'Assignment ID is required.' });
      return;
    }

    // Verify assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // Find the group and check authorization
    const group = await Group.findOne({ _id: req.params.id, creator: req.userId });
    if (!group) {
      res.status(404).json({ error: 'Group not found or unauthorized.' });
      return;
    }

    // Check if already assigned
    const alreadyAssigned = group.assignments.some(
      (asm) => asm.assignmentId.toString() === assignmentId.toString()
    );

    if (alreadyAssigned) {
      res.status(400).json({ error: 'This assignment is already assigned to this group.' });
      return;
    }

    // Add assignment
    group.assignments.push({
      assignmentId,
      assignedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    await group.save();

    // Populate assignment details and return updated group
    const populatedGroup = await Group.findById(group._id).populate('assignments.assignmentId');
    res.json(populatedGroup);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to assign paper to group.' });
  }
});

export default router;
