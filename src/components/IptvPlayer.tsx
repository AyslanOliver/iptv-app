import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Box, IconButton, CircularProgress, Slider, Typography, Tooltip } from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit,
  Refresh,
  ArrowBack,
  ArrowForward
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import '../styles/IptvPlayer.css';

interface IptvPlayerProps {
  streamUrl: string;
  channel: any;
  channels: any[];
  autoPlay?: boolean;
  onError?: (error: string) => void;
  onChannelChange?: (channel: any) => void;
}

const IptvPlayer: React.FC<IptvPlayerProps> = ({
  streamUrl,
  channel,
  channels,
  autoPlay = true,
  onError,
  onChannelChange,
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(0);

  const initializeHls = useCallback(() => {
    if (!videoRef.current || !streamUrl) return;

    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: true,
        });

        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(streamUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            videoRef.current?.play().catch(() => {
              console.error('Falha ao iniciar reprodução automática');
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Erro de rede:', data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Erro de mídia:', data);
                hls.recoverMediaError();
                break;
              default:
                console.error('Erro fatal:', data);
                if (onError) onError('Erro ao carregar stream');
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        if (autoPlay) {
          videoRef.current.play().catch(() => {
            console.error('Falha ao iniciar reprodução automática');
          });
        }
      }
    } catch (err) {
      console.error('Erro ao inicializar HLS:', err);
      if (onError) onError('Erro ao inicializar player');
    }
  }, [streamUrl, autoPlay, onError]);

  useEffect(() => {
    initializeHls();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializeHls]);

  // Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsLoading(false);
      setError(null);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError('Erro ao reproduzir vídeo');
      setIsLoading(false);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume * 100);
      setIsMuted(video.muted);
    };

    const handleVolumeSliderChange = (_event: Event, newValue: number | number[]) => {
      const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
      video.volume = volumeValue / 100;
      setVolume(volumeValue);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  // Controls visibility
  useEffect(() => {
    if (!showControls) return;

    const hideControls = () => setShowControls(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(hideControls, 5000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value: number) => {
    if (!videoRef.current) return;
    setVolume(value);
    videoRef.current.volume = value / 100;
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      handleVolumeChange(volume || 100);
    } else {
      handleVolumeChange(0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Reinicializar player quando mudar o canal
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    initializeHls();
  }, [streamUrl, initializeHls]);

  // Adicionar navegação entre canais
  const handlePreviousChannel = () => {
    if (!onChannelChange || !channels.length) return;
    const currentIndex = channels.findIndex(c => c.stream_id === channel.stream_id);
    if (currentIndex > 0) {
      onChannelChange(channels[currentIndex - 1]);
    }
  };

  const handleNextChannel = () => {
    if (!onChannelChange || !channels.length) return;
    const currentIndex = channels.findIndex(c => c.stream_id === channel.stream_id);
    if (currentIndex < channels.length - 1) {
      onChannelChange(channels[currentIndex + 1]);
    }
  };

  // Adicionar controles de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(volume + 5, 100));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(volume - 5, 0));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePreviousChannel();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextChannel();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume, handlePlayPause, toggleMute, toggleFullscreen, handleVolumeChange, handlePreviousChannel, handleNextChannel]);

  return (
    <div className="player-container" ref={containerRef}>
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        onClick={() => setShowControls(!showControls)}
      />

      {/* Channel Info */}
      <div className="channel-info">
        <h3 className="channel-name">{channel.name}</h3>
        {channel.current_program && (
          <p className="channel-program">{channel.current_program}</p>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="player-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="player-overlay">
          <div className="error-message">
            <h3>Erro</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="player-controls">
          <div className="controls-row">
            <IconButton onClick={handlePreviousChannel} className="control-button">
              <ArrowBack />
            </IconButton>

            <IconButton onClick={handlePlayPause} className="control-button">
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>

            <IconButton onClick={handleNextChannel} className="control-button">
              <ArrowForward />
            </IconButton>

            <div className="volume-control">
              <IconButton onClick={toggleMute} className="control-button">
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
              <Slider
                value={volume}
                onChange={(_, value) => handleVolumeChange(value as number)}
                min={0}
                max={100}
                className="volume-slider"
              />
            </div>

            <IconButton onClick={toggleFullscreen} className="control-button">
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default IptvPlayer;