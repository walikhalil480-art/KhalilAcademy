import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  Users,
  Square,
  Sparkles,
  RefreshCw,
  Play,
} from 'lucide-react';

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

interface NativeClassroomStageProps {
  sessionId: string;
  sessionTitle: string;
  user: any;
  isInstructor: boolean;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export const NativeClassroomStage: React.FC<NativeClassroomStageProps> = ({
  sessionId,
  sessionTitle,
  user,
  isInstructor,
  onEndSession,
  onLeaveSession,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [raisedHandsList, setRaisedHandsList] = useState<string[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Correctly resolve backend socket URL (Port 5001)
  const getSocketUrl = () => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001/api';
    return apiUrl.replace(/\/api\/?$/, '');
  };

  useEffect(() => {
    const socketUrl = getSocketUrl();
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    setSocket(s);

    s.on('connect', () => {
      setConnectionStatus('connected');
      s.emit('join-room', {
        sessionId,
        userId: user?.id || `user-${Date.now()}`,
        name: user?.name || 'Student',
        role: user?.role || (isInstructor ? 'INSTRUCTOR' : 'STUDENT'),
        isHost: isInstructor,
      });

      // If student, request stream from host immediately upon connect
      if (!isInstructor) {
        s.emit('request-stream', { sessionId });
      }
    });

    s.on('connect_error', () => {
      setConnectionStatus('error');
    });

    s.on('room-users', ({ participants: parts }: { participants: ClassroomParticipant[] }) => {
      setParticipants(parts);
      // If student, request stream if host exists
      if (!isInstructor && parts.some((p) => p.isHost)) {
        s.emit('request-stream', { sessionId });
      }
    });

    // Host receives request from new student to start WebRTC negotiation
    s.on('request-stream', async ({ studentSocketId }: { studentSocketId: string }) => {
      if (isInstructor && localStreamRef.current) {
        await createPeerOffer(studentSocketId, s);
      }
    });

    s.on('user-joined', async ({ user: newUser, callerSocketId }: { user: ClassroomParticipant; callerSocketId: string }) => {
      setParticipants((prev) => [...prev.filter((p) => p.socketId !== newUser.socketId), newUser]);

      // If instructor is live, send stream offer to the new participant
      if (isInstructor && localStreamRef.current) {
        await createPeerOffer(callerSocketId, s);
      }
    });

    s.on('user-left', ({ socketId, name }: { socketId: string; name: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      if (peerConnectionsRef.current.has(socketId)) {
        peerConnectionsRef.current.get(socketId)?.close();
        peerConnectionsRef.current.delete(socketId);
      }
    });

    // WebRTC Signaling Handlers
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

    s.on('signal-ice-candidate', async ({ callerSocketId, candidate }: { callerSocketId: string; candidate: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(callerSocketId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {}
    });

    s.on('user-hand-updated', ({ name, isHandRaised: hr }: { name: string; isHandRaised: boolean }) => {
      setRaisedHandsList((prev) =>
        hr ? [...new Set([...prev, name])] : prev.filter((n) => n !== name)
      );
    });

    s.on('session-ended', () => {
      if (onLeaveSession) onLeaveSession();
    });

    // Auto-start instructor camera if instructor
    if (isInstructor) {
      startLocalMedia(s);
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      s.disconnect();
    };
  }, [sessionId, isInstructor]);

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

    // Attach local stream tracks if host
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(peerSocketId, pc);
    return pc;
  };

  const createPeerOffer = async (peerSocketId: string, currentSocket: Socket) => {
    try {
      const pc = getOrCreatePeerConnection(peerSocketId, currentSocket);

      // Ensure all current tracks are added to peer connection
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        localStreamRef.current.getTracks().forEach((track) => {
          const senderExists = senders.some((s) => s.track?.id === track.id || s.track?.kind === track.kind);
          if (!senderExists) {
            pc.addTrack(track, localStreamRef.current!);
          } else {
            const matchSender = senders.find((s) => s.track?.kind === track.kind);
            if (matchSender) matchSender.replaceTrack(track);
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

  const startLocalMedia = async (currentSocket?: Socket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const activeSocket = currentSocket || socket;
      if (activeSocket) {
        participants.forEach((p) => {
          if (p.socketId !== activeSocket.id) {
            createPeerOffer(p.socketId, activeSocket);
          }
        });
      }
    } catch (err: any) {
      console.warn('Could not access camera/mic:', err);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        if (socket) {
          socket.emit('toggle-media', { sessionId, isMuted: !audioTrack.enabled });
        }
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        if (socket) {
          socket.emit('toggle-media', { sessionId, isVideoOff: !videoTrack.enabled });
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        localStreamRef.current = screenStream;

        // Replace video track on all active peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, screenStream);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          revertToCamera();
        };

        setIsScreenSharing(true);
        if (socket) {
          socket.emit('toggle-media', { sessionId, isScreenSharing: true });
          // Send fresh offers to all participants
          participants.forEach((p) => {
            if (p.socketId !== socket.id) {
              createPeerOffer(p.socketId, socket);
            }
          });
        }
      } catch (err) {}
    } else {
      revertToCamera();
    }
  };

  const revertToCamera = async () => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });

      localStreamRef.current = camStream;
      const cameraTrack = camStream.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = camStream;
      }

      setIsScreenSharing(false);
      if (socket) {
        socket.emit('toggle-media', { sessionId, isScreenSharing: false });
        participants.forEach((p) => {
          if (p.socketId !== socket.id) {
            createPeerOffer(p.socketId, socket);
          }
        });
      }
    } catch (e) {
      setIsScreenSharing(false);
    }
  };

  const toggleRaiseHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socket) {
      socket.emit('toggle-hand', { sessionId, isHandRaised: nextState });
    }
  };

  const toggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleStudentPlayAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.play();
      setIsAutoplayBlocked(false);
    }
  };

  const hostParticipant = participants.find((p) => p.isHost);

  return (
    <div
      ref={stageContainerRef}
      className={`w-full bg-[#050C17] border border-[#23426A] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
      }`}
    >
      {/* Top Classroom Bar */}
      <div className="bg-[#0A192F] border-b border-[#23426A] px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#F87171] text-[10px] font-extrabold animate-pulse">
            <Radio className="w-3 h-3" />
            LIVE BROADCAST
          </span>
          <span className="font-bold text-white hidden sm:inline">{sessionTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          {raisedHandsList.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B] text-[#FDE68A] text-[11px] font-bold animate-bounce">
              <Hand className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{raisedHandsList.length} Hand Raised: {raisedHandsList.join(', ')}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07182D] border border-[#23426A] text-xs text-[#CBD5E1]">
            <Users className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span className="font-bold text-white">{participants.length}</span>
            <span className="hidden md:inline text-[10px] text-[#94A3B8]">in room</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg bg-[#07182D] text-[#94A3B8] hover:text-[#14B8A6] hover:bg-[#1A365D] transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="w-full flex-1 min-h-[440px] sm:min-h-[520px] lg:min-h-[560px] bg-[#030712] relative flex items-center justify-center overflow-hidden">
        {isInstructor ? (
          /* Instructor Local Video Stage */
          <div className="w-full h-full relative flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${isVideoOff && !isScreenSharing ? 'hidden' : ''}`}
            />

            {isVideoOff && !isScreenSharing && (
              <div className="text-center space-y-3 p-6 animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-[#1A365D] border-2 border-[#14B8A6] flex items-center justify-center text-2xl font-extrabold text-[#14B8A6] mx-auto shadow-xl">
                  {user?.name?.charAt(0) || 'K'}
                </div>
                <div className="text-white font-bold text-base">{user?.name} (Instructor)</div>
                <p className="text-xs text-[#94A3B8]">Camera is turned off. Audio is active.</p>
              </div>
            )}

            {/* Instructor Watermark Badge */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="font-bold">You are Broadcasting Live</span>
              {isScreenSharing && <span className="text-[10px] text-[#14B8A6] font-extrabold uppercase">(Screen Share)</span>}
            </div>
          </div>
        ) : (
          /* Student Remote Video Stage */
          <div className="w-full h-full relative flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-contain ${!remoteStream ? 'hidden' : ''}`}
            />

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

            {!remoteStream && (
              <div className="text-center space-y-4 p-8 animate-fadeIn max-w-md">
                <div className="w-20 h-20 rounded-3xl bg-[#1A365D] border border-[#14B8A6]/40 flex items-center justify-center text-[#14B8A6] mx-auto shadow-2xl">
                  <Radio className="w-10 h-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Connecting to Instructor's Live Stream...</h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Waiting for the instructor to broadcast video. Your audio receiver and live attendance are active!
                  </p>
                </div>
              </div>
            )}

            {remoteStream && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="font-bold">{hostParticipant?.name || 'Instructor'}</span>
                <span className="text-[10px] text-[#14B8A6] font-bold">(Live Stream)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Interactive Control Toolbar */}
      <div className="bg-[#0A192F] border-t border-[#23426A] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: User Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1A365D] border border-[#14B8A6] flex items-center justify-center text-xs font-bold text-[#14B8A6]">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{user?.name}</span>
              {isInstructor && (
                <span className="px-1.5 py-0.2 rounded bg-[#14B8A6]/20 text-[#14B8A6] text-[9px] font-extrabold uppercase">
                  HOST
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#94A3B8]">{user?.email}</div>
          </div>
        </div>

        {/* Center: Stage Media Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isInstructor ? (
            /* Instructor Broadcast Controls */
            <>
              <button
                type="button"
                onClick={toggleMic}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                className={`p-3 rounded-2xl transition-all shadow-md flex items-center justify-center ${
                  isMuted
                    ? 'bg-[#EF4444] text-white'
                    : 'bg-[#1E293B] text-white hover:bg-[#334155]'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                className={`p-3 rounded-2xl transition-all shadow-md flex items-center justify-center ${
                  isVideoOff
                    ? 'bg-[#EF4444] text-white'
                    : 'bg-[#1E293B] text-white hover:bg-[#334155]'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 ${
                  isScreenSharing
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#1E293B] text-white hover:bg-[#334155]'
                }`}
              >
                {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                <span className="hidden sm:inline">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
              </button>

              {onEndSession && (
                <button
                  type="button"
                  onClick={onEndSession}
                  className="px-4 py-2.5 rounded-2xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-xs transition-all shadow-lg shadow-[#EF4444]/20 flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Live Class</span>
                </button>
              )}
            </>
          ) : (
            /* Student Controls */
            <>
              <button
                type="button"
                onClick={toggleRaiseHand}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 ${
                  isHandRaised
                    ? 'bg-[#F59E0B] text-black shadow-[#F59E0B]/30'
                    : 'bg-[#1E293B] text-white hover:bg-[#334155]'
                }`}
              >
                <Hand className={`w-4 h-4 ${isHandRaised ? 'animate-bounce' : ''}`} />
                <span>{isHandRaised ? 'Hand Raised ✋' : 'Raise Hand'}</span>
              </button>

              {onLeaveSession && (
                <button
                  type="button"
                  onClick={onLeaveSession}
                  className="px-4 py-2.5 rounded-2xl bg-[#7F1D1D]/40 hover:bg-[#7F1D1D] text-[#FCA5A5] font-bold text-xs transition border border-[#EF4444]/30"
                >
                  Leave Stage
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: Active Status */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#10B981] bg-[#064E3B] px-3 py-1 rounded-xl">
            ✓ WebRTC HD Stream Active
          </span>
        </div>
      </div>
    </div>
  );
};
