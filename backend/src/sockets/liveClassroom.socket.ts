import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../config/logger';

interface ClassroomUser {
  socketId: string;
  userId: string;
  name: string;
  role: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: Date;
}

// In-memory room store: sessionId -> Map of socketId to ClassroomUser
const activeRooms = new Map<string, Map<string, ClassroomUser>>();

export const initLiveClassroomSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`[CLASSROOM SOCKET] Client connected: ${socket.id}`);

    // 1. Join Classroom Room
    socket.on('join-room', ({ sessionId, userId, name, role, isHost }: {
      sessionId: string;
      userId: string;
      name: string;
      role: string;
      isHost: boolean;
    }) => {
      socket.join(sessionId);

      if (!activeRooms.has(sessionId)) {
        activeRooms.set(sessionId, new Map());
      }

      const room = activeRooms.get(sessionId)!;
      const userObj: ClassroomUser = {
        socketId: socket.id,
        userId: userId || `guest-${Date.now()}`,
        name: name || 'Participant',
        role: role || 'STUDENT',
        isHost: !!isHost,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isHandRaised: false,
        joinedAt: new Date(),
      };

      room.set(socket.id, userObj);

      logger.info(`[CLASSROOM SOCKET] User ${userObj.name} (${userObj.role}) joined session room ${sessionId}`);

      // Send the current list of participants to the newly joined peer
      const participants = Array.from(room.values());
      socket.emit('room-users', { participants });

      // Notify others in the room about the new participant
      socket.to(sessionId).emit('user-joined', {
        user: userObj,
        callerSocketId: socket.id,
      });
    });

    // 2. WebRTC Signaling: Offer
    socket.on('signal-offer', ({ targetSocketId, offer }: { targetSocketId: string; offer: any }) => {
      io.to(targetSocketId).emit('signal-offer', {
        callerSocketId: socket.id,
        offer,
      });
    });

    // 3. WebRTC Signaling: Answer
    socket.on('signal-answer', ({ targetSocketId, answer }: { targetSocketId: string; answer: any }) => {
      io.to(targetSocketId).emit('signal-answer', {
        callerSocketId: socket.id,
        answer,
      });
    });

    // 4. WebRTC Signaling: ICE Candidate
    socket.on('signal-ice-candidate', ({ targetSocketId, candidate }: { targetSocketId: string; candidate: any }) => {
      io.to(targetSocketId).emit('signal-ice-candidate', {
        callerSocketId: socket.id,
        candidate,
      });
    });

    // 4b. WebRTC Signaling: Request Stream from Host
    socket.on('request-stream', ({ sessionId }: { sessionId: string }) => {
      socket.to(sessionId).emit('request-stream', {
        studentSocketId: socket.id,
      });
    });

    // 5. Media State Controls (Audio / Video / Screen Share)
    socket.on('toggle-media', ({ sessionId, isMuted, isVideoOff, isScreenSharing }: {
      sessionId: string;
      isMuted?: boolean;
      isVideoOff?: boolean;
      isScreenSharing?: boolean;
    }) => {
      const room = activeRooms.get(sessionId);
      if (room && room.has(socket.id)) {
        const userObj = room.get(socket.id)!;
        if (typeof isMuted === 'boolean') userObj.isMuted = isMuted;
        if (typeof isVideoOff === 'boolean') userObj.isVideoOff = isVideoOff;
        if (typeof isScreenSharing === 'boolean') userObj.isScreenSharing = isScreenSharing;

        io.to(sessionId).emit('user-media-updated', {
          socketId: socket.id,
          userId: userObj.userId,
          isMuted: userObj.isMuted,
          isVideoOff: userObj.isVideoOff,
          isScreenSharing: userObj.isScreenSharing,
        });
      }
    });

    // 6. Raise / Lower Hand
    socket.on('toggle-hand', ({ sessionId, isHandRaised }: { sessionId: string; isHandRaised: boolean }) => {
      const room = activeRooms.get(sessionId);
      if (room && room.has(socket.id)) {
        const userObj = room.get(socket.id)!;
        userObj.isHandRaised = isHandRaised;

        io.to(sessionId).emit('user-hand-updated', {
          socketId: socket.id,
          userId: userObj.userId,
          name: userObj.name,
          isHandRaised,
        });
      }
    });

    // 7. Live In-Class Chat
    socket.on('send-chat', ({ sessionId, text, senderName, isHost }: {
      sessionId: string;
      text: string;
      senderName: string;
      isHost: boolean;
    }) => {
      const message = {
        id: Date.now().toString(),
        senderName: senderName || 'Student',
        text: text.trim(),
        isHost: !!isHost,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      io.to(sessionId).emit('new-chat-message', message);
    });

    // 8. End Live Session Broadcast
    socket.on('end-live-class', ({ sessionId }: { sessionId: string }) => {
      io.to(sessionId).emit('session-ended', {
        message: 'The live class has concluded. Thank you for attending!',
      });
      activeRooms.delete(sessionId);
    });

    // 9. Leave / Disconnect
    const handleLeave = () => {
      for (const [sessionId, room] of activeRooms.entries()) {
        if (room.has(socket.id)) {
          const userObj = room.get(socket.id)!;
          room.delete(socket.id);

          logger.info(`[CLASSROOM SOCKET] User ${userObj.name} left session ${sessionId}`);

          io.to(sessionId).emit('user-left', {
            socketId: socket.id,
            userId: userObj.userId,
            name: userObj.name,
          });

          if (room.size === 0) {
            activeRooms.delete(sessionId);
          }
          break;
        }
      }
    };

    socket.on('leave-room', handleLeave);
    socket.on('disconnect', handleLeave);
  });

  return io;
};
