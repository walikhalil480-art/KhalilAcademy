import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { LiveSessionReminderService } from './services/liveSessionReminder.service';
import { AtRiskStudentService } from './services/atRiskStudent.service';
import { initLiveClassroomSocket } from './sockets/liveClassroom.socket';

const server = app.listen(env.PORT, () => {
  logger.info(`Khalil Academy LMS Server listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
  // Initialize native WebRTC live classroom socket signaling
  initLiveClassroomSocket(server);
  // Start background reminder worker for live classes
  LiveSessionReminderService.startScheduler();
  // Start background at-risk student detection scanner
  AtRiskStudentService.startScheduler();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server;
