import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, AlertCircle, RefreshCw, RotateCcw, RotateCw, ExternalLink, VideoOff } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  videoSource?: 'YOUTUBE' | 'UPLOAD';
  videoUrl?: string;
  youtubeVideoId?: string;
  initialPosition?: number;
  onProgressUpdate?: (positionSeconds: number, deltaSeconds?: number, durationSeconds?: number) => void;
  onEnded?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const extractYouTubeId = (url?: string, explicitId?: string): string | null => {
  if (explicitId && explicitId.trim().length >= 10 && explicitId.trim().length <= 15) {
    return explicitId.trim();
  }
  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();

  // If raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard match for youtu.be, youtube.com/watch?v=, embed/, shorts/, etc.
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  return null;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  title,
  videoSource,
  videoUrl,
  youtubeVideoId,
  initialPosition = 0,
  onProgressUpdate,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const lastHeartbeatRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<number>(initialPosition || 0);

  // Read saved preferred playback speed from localStorage
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('khalil_lms_player_speed');
    return saved ? parseFloat(saved) : 1;
  });

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [embedError, setEmbedError] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Reset errors when lesson/video changes
  useEffect(() => {
    setEmbedError(false);
    setVideoError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    lastPositionRef.current = initialPosition || 0;
    lastHeartbeatRef.current = Date.now();
  }, [videoUrl, youtubeVideoId, videoSource]);

  // Determine explicit video mode
  const cleanUrl = (videoUrl || '').trim();
  const isExplicitUpload = videoSource === 'UPLOAD' || cleanUrl.startsWith('/uploads/') || cleanUrl.includes('/uploads/');
  const isExplicitYouTube = videoSource === 'YOUTUBE' || cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be') || (!!youtubeVideoId && !isExplicitUpload);

  const ytId = isExplicitYouTube ? extractYouTubeId(cleanUrl, youtubeVideoId) : null;

  // Resolve upload URL
  const resolvedUploadUrl = isExplicitUpload && cleanUrl
    ? cleanUrl.startsWith('http')
      ? cleanUrl
      : `http://localhost:5001${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`
    : '';

  // Sync saved playback speed to localStorage
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem('khalil_lms_player_speed', speed.toString());
    setShowSpeedMenu(false);

    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // HTML5 Video Event Handlers
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (initialPosition > 0) {
        videoRef.current.currentTime = initialPosition;
        lastPositionRef.current = initialPosition;
      }
    }
  }, [resolvedUploadUrl, initialPosition]);

  // Listen to postMessage events from YouTube iframe (enablejsapi=1)
  useEffect(() => {
    if (!isExplicitYouTube || !ytId) return;

    const sendInitMessage = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      }
    };
    sendInitMessage();
    const initTimer = setInterval(sendInitMessage, 2000);

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.event === 'infoDelivery' && data.info) {
          const info = data.info;
          const cur = info.currentTime;
          const dur = info.duration;

          if (cur !== undefined && cur > 0) {
            setCurrentTime(cur);
            if (dur) setDuration(dur);

            const now = Date.now();
            const timeSinceLastHb = (now - lastHeartbeatRef.current) / 1000;

            if (timeSinceLastHb >= 4) {
              const deltaPos = cur - lastPositionRef.current;
              const validDelta = deltaPos > 0 && deltaPos <= timeSinceLastHb + 3 ? Math.round(deltaPos) : 0;

              if (onProgressUpdate) {
                onProgressUpdate(Math.floor(cur), validDelta, dur ? Math.floor(dur) : undefined);
              }

              lastHeartbeatRef.current = now;
              lastPositionRef.current = cur;
            }
          }

          // YouTube Player State: 0 = ENDED, 1 = PLAYING, 2 = PAUSED
          if (info.playerState === 0) {
            setIsPlaying(false);
            if (onProgressUpdate) {
              const finalDur = dur || cur || 0;
              onProgressUpdate(Math.floor(finalDur), Math.round(finalDur), Math.floor(finalDur));
            }
            if (onEnded) {
              onEnded();
            }
          } else if (info.playerState === 1) {
            setIsPlaying(true);
          } else if (info.playerState === 2) {
            setIsPlaying(false);
          }
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearInterval(initTimer);
      window.removeEventListener('message', handleMessage);
    };
  }, [isExplicitYouTube, ytId, onProgressUpdate, onEnded]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(cur);

      const now = Date.now();
      const timeSinceLastHb = (now - lastHeartbeatRef.current) / 1000;

      if (timeSinceLastHb >= 5) {
        const deltaPos = cur - lastPositionRef.current;
        const validDelta = deltaPos > 0 && deltaPos <= timeSinceLastHb + 3 ? Math.round(deltaPos) : 0;

        if (onProgressUpdate) {
          onProgressUpdate(Math.floor(cur), validDelta, dur ? Math.floor(dur) : undefined);
        }

        lastHeartbeatRef.current = now;
        lastPositionRef.current = cur;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const totalSecs = Math.floor(secs);
    const hrs = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full aspect-video min-h-[460px] sm:min-h-[540px] md:min-h-[600px] lg:min-h-[660px] bg-black rounded-2xl overflow-hidden border border-[#20395D] shadow-2xl relative group flex items-center justify-center ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none min-h-0 max-h-none border-none aspect-auto' : ''
      }`}
    >
      {/* 1. YOUTUBE VIDEO MODE */}
      {isExplicitYouTube && ytId && !embedError ? (
        <div className={`relative w-full h-full min-h-[460px] sm:min-h-[540px] md:min-h-[600px] lg:min-h-[660px] ${isFullscreen ? 'h-full w-full' : ''}`}>
          <iframe
            ref={iframeRef}
            className="absolute inset-0 w-full h-full border-0 z-0"
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
            title={title}
            onError={() => setEmbedError(true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>

          {/* Direct YouTube link on hover */}
          <a
            href={`https://www.youtube.com/watch?v=${ytId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-[#07182D]/85 hover:bg-[#4F46E5] text-[#F8FAFC] border border-[#20395D] hover:border-[#4F46E5] text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5 transition opacity-0 group-hover:opacity-100 shadow-lg"
          >
            <span>Open in YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : isExplicitYouTube && embedError ? (
        /* YouTube Embed Error Handling */
        <div className="w-full h-full min-h-[460px] sm:min-h-[540px] bg-[#102342] border border-[#20395D] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 text-[#F8FAFC]">
          <AlertCircle className="h-12 w-12 text-[#F59E0B]" />
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-[#F8FAFC]">This video cannot be embedded.</h4>
            <p className="text-xs text-[#A8B5C7] max-w-md">
              The video owner has restricted embedding. You can watch it directly on YouTube.
            </p>
          </div>
          {ytId && (
            <a
              href={`https://www.youtube.com/watch?v=${ytId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-extrabold shadow-lg transition"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ) : isExplicitYouTube && !ytId ? (
        /* Invalid YouTube URL Handling */
        <div className="w-full h-full min-h-[460px] sm:min-h-[540px] bg-[#102342] border border-[#20395D] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#F8FAFC]">
          <AlertCircle className="h-10 w-10 text-[#EF4444]" />
          <h4 className="text-base font-bold text-[#F8FAFC]">Invalid YouTube video URL.</h4>
          <p className="text-xs text-[#A8B5C7] max-w-md">
            The YouTube URL provided for this lesson is invalid or malformed.
          </p>
        </div>
      ) : isExplicitUpload && resolvedUploadUrl && !videoError ? (
        /* 2. LOCAL UPLOAD VIDEO MODE (HTML5 Video Player) */
        <div className="relative w-full h-full min-h-[460px] sm:min-h-[540px] md:min-h-[600px] lg:min-h-[660px] flex items-center justify-center group bg-black">
          <video
            ref={videoRef}
            src={resolvedUploadUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => {
              setVideoError('Unable to load this uploaded video.');
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            preload="metadata"
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full min-h-[460px] sm:min-h-[540px] md:min-h-[600px] lg:min-h-[660px] object-contain cursor-pointer block"
            onClick={togglePlay}
          >
            Your browser does not support HTML5 video playback.
          </video>

          {/* Large Center Play Button Overlay */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white flex items-center justify-center shadow-2xl shadow-[#4F46E5]/50 transition-transform transform hover:scale-110 z-20"
              title="Play Video"
            >
              <Play className="h-12 w-12 ml-1.5 fill-white text-white" />
            </button>
          )}

          {/* Controls Bar Overlay */}
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 sm:p-5 transition-opacity duration-300 space-y-2 z-20 ${
            !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {/* Progress Timeline Track */}
            <div className="relative w-full h-1.5 bg-[#20395D] rounded-full cursor-pointer flex items-center group/track">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 opacity-0 absolute z-10 cursor-pointer"
              />
              <div
                className="h-full bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] rounded-full relative"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              >
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-[#102A43] rounded-full shadow-md" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white pt-1">
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Play / Pause Button */}
                <button onClick={togglePlay} className="p-1 hover:text-[#06B6D4] transition" title={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                </button>

                {/* 10s Rewind */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }
                  }}
                  className="p-1 text-[#A8B5C7] hover:text-white transition flex items-center justify-center relative"
                  title="Rewind 10 seconds"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-[8px] font-bold absolute text-white">10</span>
                </button>

                {/* 10s Forward */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(duration || 1000, videoRef.current.currentTime + 10);
                    }
                  }}
                  className="p-1 text-[#A8B5C7] hover:text-white transition flex items-center justify-center relative"
                  title="Forward 10 seconds"
                >
                  <RotateCw className="h-4 w-4" />
                  <span className="text-[8px] font-bold absolute text-white">10</span>
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="p-1 hover:text-[#06B6D4] transition">
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-[#20395D] accent-[#4F46E5] rounded-lg cursor-pointer hidden sm:block"
                  />
                </div>

                {/* Time Display */}
                <span className="font-mono text-[#A8B5C7] text-xs">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {/* Playback Speed Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 hover:bg-[#102342] rounded-lg text-xs font-bold transition text-[#F8FAFC]"
                  >
                    {playbackSpeed}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-28 bg-[#102342] border border-[#20395D] rounded-xl shadow-2xl py-1 z-50">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`w-full text-left px-3 py-1.5 text-xs font-bold transition ${
                            playbackSpeed === speed ? 'bg-[#4F46E5] text-white' : 'text-[#A8B5C7] hover:bg-[#142B4D]'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button onClick={toggleFullscreen} className="p-1 text-[#A8B5C7] hover:text-white transition" title="Toggle Fullscreen">
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : isExplicitUpload && videoError ? (
        /* Uploaded Video Loading Error Handling */
        <div className="w-full h-full min-h-[460px] sm:min-h-[540px] bg-[#102342] border border-[#20395D] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#F8FAFC]">
          <AlertCircle className="h-10 w-10 text-[#EF4444]" />
          <h4 className="text-base font-bold text-[#F8FAFC]">Unable to load this uploaded video.</h4>
          <p className="text-xs text-[#A8B5C7] max-w-md">
            The uploaded video file could not be decoded or loaded from the server storage.
          </p>
        </div>
      ) : (
        /* 3. EMPTY STATE: NO VIDEO ATTACHED */
        <div className="w-full h-full min-h-[460px] sm:min-h-[540px] bg-[#102342] border border-[#20395D] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#F8FAFC]">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1B35] border border-[#20395D] flex items-center justify-center text-[#71819A]">
            <VideoOff className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-[#F8FAFC]">No video has been added to this lesson yet.</h4>
          <p className="text-xs text-[#71819A] max-w-md">
            The instructor has not attached a video to this lesson. You can review the lesson notes and resources below.
          </p>
        </div>
      )}
    </div>
  );
};
