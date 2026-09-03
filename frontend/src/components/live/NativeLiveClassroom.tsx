import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  PenTool, 
  Hand, 
  Users, 
  MessageSquare, 
  Maximize2, 
  Minimize2, 
  PhoneOff, 
  Shield, 
  Send, 
  Trash2,
  Play,
  Radio,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { LiveSession } from '../../services/liveSessionApi';

interface NativeLiveClassroomProps {
  session: LiveSession;
  isHost: boolean;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  onLeave: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
  isHost: boolean;
  isSystem?: boolean;
}

interface RaisedHandUser {
  id: string;
  name: string;
  timestamp: string;
}

interface HostBroadcastState {
  isLive: boolean;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isAudioMuted: boolean;
  isWhiteboardActive: boolean;
  hostName: string;
}

interface ClassroomParticipant {
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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export const NativeLiveClassroom: React.FC<NativeLiveClassroomProps> = ({
  session,
  isHost,
  currentUser,
  onLeave,
}) => {
  // Socket.IO instance
  const [socket, setSocket] = useState<Socket | null>(null);

  // Media Stream States (Host)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  // Synchronized Host State (For Student View)
  const [hostState, setHostState] = useState<HostBroadcastState>({
    isLive: true,
    isScreenSharing: false,
    isVideoOff: false,
    isAudioMuted: false,
    isWhiteboardActive: false,
    hostName: session.instructor?.name || 'Lead Instructor',
  });

  // Classroom Sidepanel State
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'attendees' | 'hands'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      senderId: 'system',
      senderName: 'Classroom System',
      senderRole: 'SYSTEM',
      text: `Live classroom connected for ${session.title}. In-platform broadcasting active.`,
      timestamp: 'Just now',
      isHost: false,
      isSystem: true,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [raisedHandsList, setRaisedHandsList] = useState<RaisedHandUser[]>([]);
  const [liveDuration, setLiveDuration] = useState(0);
  const [handAlert, setHandAlert] = useState<string | null>(null);

  // Attendees List
  const [onlineAttendees, setOnlineAttendees] = useState<{ id: string; name: string; role: string }[]>([
    { id: currentUser.id, name: currentUser.name, role: currentUser.role || 'STUDENT' },
  ]);

  // Video & Canvas Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // WebRTC Peer Connections map & Local Streams refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Whiteboard drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#14B8A6');
  const [penSize] = useState(3);

  // Resolve backend socket URL
  const getSocketUrl = () => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001/api';
    return apiUrl.replace(/\/api\/?$/, '');
  };

  // Helper to create or get peer connection for a socket ID
  const getOrCreatePeerConnection = (peerSocketId: string, currentSocket: Socket) => {
    if (peerConnectionsRef.current.has(peerSocketId)) {
      return peerConnectionsRef.current.get(peerSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        currentSocket.emit('signal-ice-candidate', {
          targetSocketId: peerSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {
          setIsAutoplayBlocked(true);
        });
      }
    };

    // If host, attach current stream tracks (video + audio)
    if (isHost && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(peerSocketId, pc);
    return pc;
  };

  // Helper for Host to create and send an offer to a student
  const createPeerOffer = async (peerSocketId: string, currentSocket: Socket) => {
    try {
      const pc = getOrCreatePeerConnection(peerSocketId, currentSocket);

      // Ensure local tracks are attached / replaced
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        localStreamRef.current.getTracks().forEach((track) => {
          const matchSender = senders.find((s) => s.track?.kind === track.kind);
          if (!matchSender) {
            pc.addTrack(track, localStreamRef.current!);
          } else {
            matchSender.replaceTrack(track);
          }
        });
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      currentSocket.emit('signal-offer', { targetSocketId: peerSocketId, offer });
    } catch (err) {
      console.error('Error creating peer offer:', err);
    }
  };

  // 1. Initialize Socket.IO connection & event listeners
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    setSocket(s);

    s.on('connect', () => {
      s.emit('join-room', {
        sessionId: session.id,
        userId: currentUser.id || `user-${Date.now()}`,
        name: currentUser.name || 'Participant',
        role: currentUser.role || (isHost ? 'INSTRUCTOR' : 'STUDENT'),
        isHost,
      });

      // If student, request stream from host immediately upon connect
      if (!isHost) {
        s.emit('request-stream', { sessionId: session.id });
      }
    });

    s.on('room-users', ({ participants }: { participants: ClassroomParticipant[] }) => {
      const attendees = participants.map((p) => ({
        id: p.userId,
        name: p.name,
        role: p.role,
      }));
      setOnlineAttendees(attendees);

      // If student, request stream if host is present
      if (!isHost && participants.some((p) => p.isHost)) {
        s.emit('request-stream', { sessionId: session.id });
      }
    });

    // Host receives request from student to start stream negotiation
    s.on('request-stream', async ({ studentSocketId }: { studentSocketId: string }) => {
      if (isHost && localStreamRef.current) {
        await createPeerOffer(studentSocketId, s);
      }
    });

    s.on('user-joined', async ({ user: newUser, callerSocketId }: { user: ClassroomParticipant; callerSocketId: string }) => {
      setOnlineAttendees((prev) => {
        if (prev.some((u) => u.id === newUser.userId)) return prev;
        return [...prev, { id: newUser.userId, name: newUser.name, role: newUser.role }];
      });

      // If instructor, create offer for newly joined student
      if (isHost && localStreamRef.current) {
        await createPeerOffer(callerSocketId, s);
      }
    });

    s.on('user-left', ({ socketId, userId, name }: { socketId: string; userId: string; name: string }) => {
      setOnlineAttendees((prev) => prev.filter((u) => u.id !== userId));
      setRaisedHandsList((prev) => prev.filter((h) => h.id !== userId));

      if (peerConnectionsRef.current.has(socketId)) {
        peerConnectionsRef.current.get(socketId)?.close();
        peerConnectionsRef.current.delete(socketId);
      }
    });

    // WebRTC Signaling: Offer
    s.on('signal-offer', async ({ callerSocketId, offer }: { callerSocketId: string; offer: any }) => {
      try {
        const pc = getOrCreatePeerConnection(callerSocketId, s);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('signal-answer', { targetSocketId: callerSocketId, answer });
      } catch (err) {
        console.error('Error handling signal-offer:', err);
      }
    });

    // WebRTC Signaling: Answer
    s.on('signal-answer', async ({ callerSocketId, answer }: { callerSocketId: string; answer: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(callerSocketId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error handling signal-answer:', err);
      }
    });

    // WebRTC Signaling: ICE Candidate
    s.on('signal-ice-candidate', async ({ callerSocketId, candidate }: { callerSocketId: string; candidate: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(callerSocketId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {}
    });

    // Media state sync from host
    s.on('user-media-updated', (data: any) => {
      setHostState((prev) => ({
        ...prev,
        isScreenSharing: !!data.isScreenSharing,
        isVideoOff: !!data.isVideoOff,
        isAudioMuted: !!data.isMuted,
        isWhiteboardActive: !!data.isWhiteboardActive,
      }));
    });

    // Hand raise sync
    s.on('user-hand-updated', ({ userId, name, isHandRaised: hr }: { socketId: string; userId: string; name: string; isHandRaised: boolean }) => {
      if (hr) {
        setRaisedHandsList((prev) => {
          if (prev.some((h) => h.id === userId)) return prev;
          return [...prev, { id: userId, name, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
        });
        setHandAlert(`✋ ${name} raised their hand!`);
        setTimeout(() => setHandAlert(null), 5000);
      } else {
        setRaisedHandsList((prev) => prev.filter((h) => h.id !== userId));
      }
    });

    // Chat message sync
    s.on('new-chat-message', (msg: any) => {
      const chatItem: ChatMessage = {
        id: msg.id || Date.now().toString(),
        senderId: msg.senderId || 'user',
        senderName: msg.senderName || 'Participant',
        senderRole: msg.isHost ? 'INSTRUCTOR' : 'STUDENT',
        text: msg.text,
        timestamp: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isHost: !!msg.isHost,
      };
      setChatMessages((prev) => [...prev, chatItem]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    // Whiteboard drawing sync
    s.on('whiteboard-draw', (drawData: any) => {
      renderRemoteWhiteboardDraw(drawData);
    });

    s.on('whiteboard-clear', () => {
      clearWhiteboardCanvas();
    });

    // Floating emoji reaction sync
    s.on('new-emoji-reaction', ({ emoji, x }: { emoji: string; x: number }) => {
      displayFloatingEmoji(emoji, x);
    });

    // Session ended
    s.on('session-ended', () => {
      onLeave();
    });

    // Start local media if instructor
    if (isHost) {
      startHostMedia(s);
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      s.emit('leave-room');
      s.disconnect();
    };
  }, [session.id, isHost]);

  // 2. Start Host Camera & Mic
  const startHostMedia = async (currentSocket?: Socket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });

      localStreamRef.current = stream;
      cameraStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const activeSocket = currentSocket || socket;
      if (activeSocket) {
        activeSocket.emit('request-stream', { sessionId: session.id });
      }
    } catch (err) {
      console.warn('Webcam not accessible, trying audio-only:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioStream;
        cameraStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setIsVideoOff(true);
      } catch (audioErr) {
        console.warn('Audio not accessible:', audioErr);
      }
    }
  };

  // Sync Host Stream Changes to Video Element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isScreenSharing]);

  // Sync Screen Share Video Element
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Sync Remote Stream to Video Element for Student
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {
        setIsAutoplayBlocked(true);
      });
    }
  }, [remoteStream]);

  // 3. Live duration timer
  useEffect(() => {
    const timer = setInterval(() => setLiveDuration((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 4. Device Toggles (Host)
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        socket?.emit('toggle-media', {
          sessionId: session.id,
          isMuted: !audioTrack.enabled,
          isVideoOff,
          isScreenSharing,
          isWhiteboardActive,
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        socket?.emit('toggle-media', {
          sessionId: session.id,
          isMuted: isAudioMuted,
          isVideoOff: !videoTrack.enabled,
          isScreenSharing,
          isWhiteboardActive,
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const scrStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: true,
        });

        screenStreamRef.current = scrStream;
        setScreenStream(scrStream);
        setIsScreenSharing(true);
        setIsWhiteboardActive(false);

        const screenVideoTrack = scrStream.getVideoTracks()[0];

        // Replace video track on all active peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenVideoTrack);
          } else {
            pc.addTrack(screenVideoTrack, scrStream);
          }
        });

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = scrStream;
        }

        // When user stops screen sharing from browser bar
        screenVideoTrack.onended = () => {
          revertToCamera();
        };

        socket?.emit('toggle-media', {
          sessionId: session.id,
          isMuted: isAudioMuted,
          isVideoOff,
          isScreenSharing: true,
          isWhiteboardActive: false,
        });
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    } else {
      revertToCamera();
    }
  };

  const revertToCamera = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    let camStream = cameraStreamRef.current;
    if (!camStream || camStream.getVideoTracks().length === 0 || camStream.getVideoTracks()[0].readyState === 'ended') {
      try {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });
        cameraStreamRef.current = camStream;
      } catch (e) {}
    }

    localStreamRef.current = camStream;
    setLocalStream(camStream);

    if (localVideoRef.current && camStream) {
      localVideoRef.current.srcObject = camStream;
    }

    const camTrack = camStream?.getVideoTracks()[0];
    if (camTrack) {
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(camTrack);
        }
      });
    }

    socket?.emit('toggle-media', {
      sessionId: session.id,
      isMuted: isAudioMuted,
      isVideoOff,
      isScreenSharing: false,
      isWhiteboardActive,
    });
  };

  const toggleWhiteboard = () => {
    const nextState = !isWhiteboardActive;
    setIsWhiteboardActive(nextState);
    if (nextState && isScreenSharing) {
      revertToCamera();
    }
    socket?.emit('toggle-media', {
      sessionId: session.id,
      isMuted: isAudioMuted,
      isVideoOff,
      isScreenSharing: false,
      isWhiteboardActive: nextState,
    });
  };

  // 5. Student Hand-Raising
  const handleToggleHandRaise = () => {
    const newStatus = !hasRaisedHand;
    setHasRaisedHand(newStatus);
    socket?.emit('toggle-hand', { sessionId: session.id, isHandRaised: newStatus });
  };

  const dismissRaisedHand = (studentId: string) => {
    setRaisedHandsList((prev) => prev.filter((h) => h.id !== studentId));
  };

  // 6. Real-time Live Chat Messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket?.emit('send-chat', {
      sessionId: session.id,
      text: inputMessage.trim(),
      senderName: currentUser.name || 'Participant',
      isHost,
    });

    setInputMessage('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // 7. Floating Emoji Reactions
  const displayFloatingEmoji = (emoji: string, x: number) => {
    const newEmoji = { id: Date.now() + Math.random(), emoji, x };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2500);
  };

  const triggerEmoji = (emoji: string) => {
    const x = Math.random() * 80 + 10;
    displayFloatingEmoji(emoji, x);
    socket?.emit('send-emoji', { sessionId: session.id, emoji, x });
  };

  // 8. Whiteboard Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isHost) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);

    socket?.emit('whiteboard-draw', {
      sessionId: session.id,
      data: { action: 'start', x, y, color: penColor, size: penSize },
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isHost) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.stroke();

    socket?.emit('whiteboard-draw', {
      sessionId: session.id,
      data: { action: 'draw', x, y, color: penColor, size: penSize },
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const renderRemoteWhiteboardDraw = (data: any) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (data.action === 'start') {
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else if (data.action === 'draw') {
      ctx.lineTo(data.x, data.y);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const clearWhiteboard = () => {
    clearWhiteboardCanvas();
    socket?.emit('whiteboard-clear', { sessionId: session.id });
  };

  const clearWhiteboardCanvas = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleStudentPlayAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.play();
      setIsAutoplayBlocked(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#050C1A] text-white rounded-3xl overflow-hidden border border-[#1E3A56] shadow-2xl flex flex-col min-h-[620px] relative animate-fadeIn select-none font-sans"
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & BROADCAST BAR */}
      {/* ========================================================================= */}
      <div className="h-14 px-4 sm:px-6 bg-[#07182D] border-b border-[#1E3A56] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE BROADCAST</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 truncate">
            <span className="text-xs font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md">
              {session.title}
            </span>
            <span className="text-slate-500 dark:text-[#A9BACB]">•</span>
            <span className="text-[11px] font-mono text-[#14B8A6] font-bold">
              {formatTime(liveDuration)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Hand Raise Toast for Instructor */}
          {handAlert && (
            <div className="px-3 py-1 bg-amber-500 text-black font-bold text-xs rounded-xl shadow-lg animate-bounce flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5" />
              <span>{handAlert}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#102A43] border border-[#1E3A56] text-slate-300 text-[11px] font-mono">
            <Shield className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>{isHost ? 'Host Studio' : 'Live Classroom'}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#102A43] hover:bg-[#152F4A] text-slate-300 transition"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              if (isHost) {
                socket?.emit('end-live-class', { sessionId: session.id });
              }
              onLeave();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>{isHost ? 'End Broadcast' : 'Leave Class'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN STAGE & CHAT LAYOUT */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Primary Screen / Presentation Viewport */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-[380px] lg:min-h-[500px]">
          
          {/* HOST VIEW: Local Screen Share Video */}
          {isHost && isScreenSharing && screenStream && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain max-h-[540px]"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/75 backdrop-blur-xs text-white text-xs font-bold border border-[#1E3A56] flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#14B8A6]" />
                <span>Broadcasting Your Screen Live</span>
              </div>
            </div>
          )}

          {/* HOST VIEW: Whiteboard */}
          {isHost && isWhiteboardActive && (
            <div className="w-full h-full relative bg-[#07182D] flex flex-col">
              <div className="h-10 px-4 bg-[#102A43] border-b border-[#1E3A56] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#14B8A6]">Whiteboard Studio</span>
                  {['#14B8A6', '#F59E0B', '#EF4444', '#FFFFFF', '#60A5FA'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-4 h-4 rounded-full border ${penColor === c ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={clearWhiteboard}
                  className="px-2 py-0.5 rounded bg-[#0B223D] hover:bg-[#152F4A] text-[10px] text-slate-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Board</span>
                </button>
              </div>

              <canvas
                ref={whiteboardCanvasRef}
                width={900}
                height={500}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full cursor-crosshair bg-[#07182D]"
              />
            </div>
          )}

          {/* HOST VIEW: Local Camera */}
          {isHost && !isScreenSharing && !isWhiteboardActive && (
            <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[#0B223D] to-black">
              {isVideoOff ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-24 h-24 rounded-3xl bg-[#087F78]/30 border-2 border-[#087F78] flex items-center justify-center text-3xl font-extrabold text-[#14B8A6]">
                    {currentUser.name?.charAt(0) || 'K'}
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-sm text-white">{currentUser.name} (Broadcaster)</h3>
                    <p className="text-xs text-slate-400 font-mono">Camera is paused</p>
                  </div>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted={true}
                  className="w-full h-full object-cover max-h-[560px]"
                />
              )}

              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-xs text-white text-xs font-bold border border-[#1E3A56] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{currentUser.name} (Broadcaster)</span>
                {isAudioMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
          )}

          {/* Picture-In-Picture Presenter Video for Host when screen sharing */}
          {isHost && isScreenSharing && !isVideoOff && (
            <div className="absolute bottom-4 right-4 w-40 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-[#14B8A6] shadow-2xl bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted={true}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STUDENT VIEW: Watch Instructor's Live WebRTC Video / Screen Share */}
          {/* ========================================================================= */}
          {!isHost && (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {/* If Whiteboard is Active on Host */}
              {hostState.isWhiteboardActive ? (
                <div className="w-full h-full relative bg-[#07182D] flex flex-col">
                  <div className="h-8 px-4 bg-[#102A43] border-b border-[#1E3A56] flex items-center text-xs text-[#14B8A6] font-bold">
                    <span>Instructor Whiteboard Stream</span>
                  </div>
                  <canvas
                    ref={whiteboardCanvasRef}
                    width={900}
                    height={500}
                    className="w-full h-full bg-[#07182D]"
                  />
                </div>
              ) : (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-contain max-h-[560px] ${!remoteStream ? 'hidden' : ''}`}
                  />

                  {/* Autoplay blocked overlay */}
                  {isAutoplayBlocked && (
                    <button
                      type="button"
                      onClick={handleStudentPlayAudio}
                      className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 text-white cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#14B8A6] text-[#0B223D] flex items-center justify-center shadow-2xl animate-pulse">
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                      <span className="font-bold text-sm">Click to Enable Live Audio & Video</span>
                    </button>
                  )}

                  {/* Camera paused state */}
                  {remoteStream && hostState.isVideoOff && !hostState.isScreenSharing && (
                    <div className="absolute inset-0 bg-[#0B223D] flex flex-col items-center justify-center space-y-3 z-10">
                      <div className="w-24 h-24 rounded-3xl bg-[#087F78]/30 border-2 border-[#087F78] flex items-center justify-center text-3xl font-extrabold text-[#14B8A6]">
                        {hostState.hostName?.charAt(0) || 'K'}
                      </div>
                      <div className="text-center space-y-1">
                        <h3 className="font-bold text-sm text-white">{hostState.hostName} (Instructor)</h3>
                        <p className="text-xs text-slate-400 font-mono">Camera paused. Audio is active.</p>
                      </div>
                    </div>
                  )}

                  {/* Waiting state */}
                  {!remoteStream && (
                    <div className="text-center space-y-4 p-8 animate-fadeIn max-w-md">
                      <div className="w-20 h-20 rounded-3xl bg-[#102A43] border border-[#14B8A6]/40 flex items-center justify-center text-[#14B8A6] mx-auto shadow-2xl">
                        <Radio className="w-10 h-10 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">Connecting to Instructor's Live Stream...</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Waiting for the instructor to broadcast video. Your live connection and audio receiver are active!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Top Live Badge */}
                  {remoteStream && (
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-xs text-white text-xs font-bold border border-[#1E3A56] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        {hostState.isScreenSharing
                          ? `Viewing ${hostState.hostName}'s Screen Share`
                          : `Live with ${hostState.hostName}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Floating Emoji Reaction Animations */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {floatingEmojis.map((item) => (
              <div
                key={item.id}
                style={{ left: `${item.x}%` }}
                className="absolute bottom-6 text-3xl sm:text-4xl animate-bounce transition-all opacity-90 drop-shadow-md"
              >
                {item.emoji}
              </div>
            ))}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDE PANEL: LIVE CHAT, ATTENDEES & RAISED HANDS */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-80 bg-[#07182D] border-t lg:border-t-0 lg:border-l border-[#1E3A56] flex flex-col h-72 lg:h-auto flex-shrink-0">
          
          {/* Side Navigation Tabs */}
          <div className="flex border-b border-[#1E3A56] text-xs font-bold">
            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeSideTab === 'chat'
                  ? 'border-[#14B8A6] text-[#14B8A6] bg-[#102A43]/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Chat</span>
            </button>

            <button
              onClick={() => setActiveSideTab('hands')}
              className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeSideTab === 'hands'
                  ? 'border-[#14B8A6] text-[#14B8A6] bg-[#102A43]/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Hands ({raisedHandsList.length})</span>
            </button>

            <button
              onClick={() => setActiveSideTab('attendees')}
              className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeSideTab === 'attendees'
                  ? 'border-[#14B8A6] text-[#14B8A6] bg-[#102A43]/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Learners ({onlineAttendees.length})</span>
            </button>
          </div>

          {/* TAB 1: LIVE CHAT */}
          {activeSideTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden p-3 justify-between">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      msg.isSystem
                        ? 'bg-teal-950/30 border-teal-800 text-teal-300'
                        : 'bg-[#102A43] border-[#1E3A56]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${msg.isHost ? 'text-[#14B8A6]' : 'text-slate-200'}`}>
                        {msg.senderName} {msg.isHost && '★ (Host)'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-[#A9BACB] font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="text-slate-300 leading-snug break-words">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Form */}
              <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a live message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-[#102A43] border border-[#1E3A56] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 dark:placeholder-[#A9BACB] focus:outline-none focus:border-[#14B8A6]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: RAISED HANDS LIST */}
          {activeSideTab === 'hands' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {raisedHandsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-[#A9BACB] space-y-2">
                  <Hand className="w-8 h-8 text-slate-600 dark:text-[#A9BACB] mx-auto" />
                  <p>No raised hands right now.</p>
                  <p className="text-[11px] text-slate-400">When students have questions, they will appear here.</p>
                </div>
              ) : (
                raisedHandsList.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-2xl bg-[#102A43] border border-amber-500/50 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                        ✋
                      </div>
                      <div>
                        <div className="font-bold text-white">{student.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Raised at {student.timestamp}</div>
                      </div>
                    </div>

                    {isHost && (
                      <button
                        onClick={() => dismissRaisedHand(student.id)}
                        className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-[#14B8A6] font-bold text-[10px] rounded-lg border border-teal-500/40"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ATTENDEES */}
          {activeSideTab === 'attendees' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#102A43] border border-[#1E3A56] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#087F78] text-white flex items-center justify-center font-bold text-xs">
                    {session.instructor?.name?.charAt(0) || 'K'}
                  </div>
                  <div>
                    <div className="font-bold text-[#14B8A6]">{session.instructor?.name || 'Instructor'}</div>
                    <div className="text-[10px] text-slate-400">Broadcaster (Host)</div>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {onlineAttendees.map((att) => (
                <div key={att.id} className="p-2.5 rounded-xl bg-[#102A43] border border-[#1E3A56] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-800 text-teal-200 flex items-center justify-center font-bold text-xs">
                      {att.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-white">{att.name} {att.id === currentUser.id && '(You)'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{att.role}</div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="h-16 px-4 sm:px-6 bg-[#07182D] border-t border-[#1E3A56] flex items-center justify-between flex-shrink-0">
        
        {/* Left: Device Controls (for Host) */}
        <div className="flex items-center space-x-2">
          {isHost ? (
            <>
              {/* Mic Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-2.5 rounded-2xl font-bold text-xs transition flex items-center gap-1.5 ${
                  isAudioMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-[#102A43] text-white hover:bg-[#152F4A] border border-[#1E3A56]'
                }`}
                title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#14B8A6]" />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-2xl font-bold text-xs transition flex items-center gap-1.5 ${
                  isVideoOff
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-[#102A43] text-white hover:bg-[#152F4A] border border-[#1E3A56]'
                }`}
                title={isVideoOff ? 'Turn Camera ON' : 'Turn Camera OFF'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4 text-[#14B8A6]" />}
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                className={`p-2.5 rounded-2xl font-bold text-xs transition hidden sm:flex items-center gap-1.5 ${
                  isScreenSharing
                    ? 'bg-teal-500/20 text-[#14B8A6] border border-teal-500/40'
                    : 'bg-[#102A43] text-white hover:bg-[#152F4A] border border-[#1E3A56]'
                }`}
                title="Share Screen"
              >
                {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                <span className="text-[11px]">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
              </button>

              {/* Whiteboard */}
              <button
                onClick={toggleWhiteboard}
                className={`p-2.5 rounded-2xl font-bold text-xs transition hidden sm:flex items-center gap-1.5 ${
                  isWhiteboardActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#102A43] text-white hover:bg-[#152F4A] border border-[#1E3A56]'
                }`}
                title="Whiteboard"
              >
                <PenTool className="w-4 h-4" />
                <span className="text-[11px]">Whiteboard</span>
              </button>
            </>
          ) : (
            /* Student Controls: Raise Hand */
            <button
              onClick={handleToggleHandRaise}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition flex items-center gap-2 shadow-sm ${
                hasRaisedHand
                  ? 'bg-amber-500 text-black border border-amber-400 scale-105'
                  : 'bg-[#102A43] hover:bg-[#152F4A] text-white border border-[#1E3A56]'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span>{hasRaisedHand ? 'Hand Raised ✋' : 'Raise Hand ✋'}</span>
            </button>
          )}
        </div>

        {/* Center: Emoji Reactions */}
        <div className="flex items-center space-x-1.5">
          {['👏', '🔥', '💡', '❤️', '🚀'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerEmoji(emoji)}
              className="p-1.5 sm:p-2 rounded-xl bg-[#102A43] hover:bg-[#152F4A] border border-[#1E3A56] text-sm sm:text-base transition hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Right: Role Status */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold text-slate-400">
            {isHost ? 'Host Controls Active' : 'Connected as Learner'}
          </span>
        </div>

      </div>

    </div>
  );
};
