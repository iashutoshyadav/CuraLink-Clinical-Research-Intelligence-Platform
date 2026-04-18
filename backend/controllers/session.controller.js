import Session from '../models/Session.model.js';
import { createError } from '../middleware/errorHandler.js';

export async function getSession(req, res, next) {
  const { id } = req.params;

  if (!id || id.length < 8) return next(createError('Invalid session ID.', 400));

  try {
    const session = await Session.findOne({ sessionId: id }).select('-__v').lean();
    if (!session) return next(createError('Session not found.', 404));

    res.json({
      success: true,
      session: {
        sessionId:    session.sessionId,
        patientName:  session.patientName,
        disease:      session.disease,
        location:     session.location,
        messages:     session.messages,
        createdAt:    session.createdAt,
        lastActivity: session.lastActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}
