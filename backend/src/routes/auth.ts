import { Router, Response } from 'express';
import User from '../models/User';
import Assignment from '../models/Assignment';
import Group from '../models/Group';
import LibraryDocument from '../models/LibraryDocument';
import { hashPassword, comparePassword, generateToken, authenticateToken, AuthRequest } from '../config/auth';
import fs from 'fs';
import path from 'path';


const router = Router();

// Register a new user
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ error: 'Username is already taken.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const newUser = new User({
      username: username.toLowerCase(),
      passwordHash,
    });

    await newUser.save();

    const token = generateToken(newUser._id.toString());

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get currently authenticated user details
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error retrieving user profile.' });
  }
});

// Update profile details
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, fullName, email, preferences } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ error: 'Username is already taken.' });
        return;
      }
      user.username = username.toLowerCase();
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (preferences !== undefined) {
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-passwordHash');
    res.status(200).json({
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Internal server error updating profile.' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Invalid current password.' });
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Internal server error updating password.' });
  }
});

// Export account data
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const assignments = await Assignment.find({ creator: userId });
    const groups = await Group.find({ creator: userId });
    const libraryDocuments = await LibraryDocument.find({ creator: userId });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
      assignments: assignments.map(a => ({
        title: a.title,
        subject: a.subject,
        grade: a.grade,
        timeLimit: a.timeLimit,
        questionTypes: a.questionTypes,
        totalQuestions: a.totalQuestions,
        totalMarks: a.totalMarks,
        additionalInstructions: a.additionalInstructions,
        status: a.status,
        sections: a.sections,
        createdAt: a.createdAt,
      })),
      groups: groups.map(g => ({
        name: g.name,
        grade: g.grade,
        subject: g.subject,
        description: g.description,
        students: g.students,
        assignments: g.assignments,
        createdAt: g.createdAt,
      })),
      libraryDocuments: libraryDocuments.map(ld => ({
        title: ld.title,
        description: ld.description,
        subject: ld.subject,
        grade: ld.grade,
        fileType: ld.fileType,
        createdAt: ld.createdAt,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(exportData);
  } catch (error: any) {
    console.error('Export data error:', error);
    res.status(500).json({ error: error.message || 'Internal server error exporting data.' });
  }
});

// Delete account completely
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    // 1. Delete Library Documents and files
    const libDocs = await LibraryDocument.find({ creator: userId });
    for (const doc of libDocs) {
      if (doc.filePath) {
        const absolutePath = path.join(process.cwd(), 'public', doc.filePath);
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (err) {
            console.error(`Failed to delete library file: ${absolutePath}`, err);
          }
        }
      }
    }
    await LibraryDocument.deleteMany({ creator: userId });

    // 2. Delete Assignments and files (PDFs, temp sources)
    const assignments = await Assignment.find({ creator: userId });
    for (const asm of assignments) {
      if (asm.pdfPath) {
        const absPath = path.join(process.cwd(), 'public', asm.pdfPath);
        if (fs.existsSync(absPath)) {
          try {
            fs.unlinkSync(absPath);
          } catch (err) {
            console.error(`Failed to delete assignment PDF: ${absPath}`, err);
          }
        }
      }
      if (asm.pdfAnswerPath) {
        const absPath = path.join(process.cwd(), 'public', asm.pdfAnswerPath);
        if (fs.existsSync(absPath)) {
          try {
            fs.unlinkSync(absPath);
          } catch (err) {
            console.error(`Failed to delete assignment answer PDF: ${absPath}`, err);
          }
        }
      }
      if (asm.sourceFilePath && asm.sourceFilePath.startsWith('/uploads/temp/')) {
        const absPath = path.join(process.cwd(), 'public', asm.sourceFilePath);
        if (fs.existsSync(absPath)) {
          try {
            fs.unlinkSync(absPath);
          } catch (err) {
            console.error(`Failed to delete source file: ${absPath}`, err);
          }
        }
      }
    }
    await Assignment.deleteMany({ creator: userId });

    // 3. Delete Groups
    await Group.deleteMany({ creator: userId });

    // 4. Delete User
    await User.deleteOne({ _id: userId });

    res.status(200).json({ message: 'Account and all associated data successfully deleted.' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: error.message || 'Internal server error deleting account.' });
  }
});

export default router;
