import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Box, IconButton, CircularProgress, Slider } from '@mui/material';
import { Close as CloseIcon, PlayArrow, Pause, VolumeUp, Fullscreen, FullscreenExit } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const PlayerContainer = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
});

const VideoWrapper = styled(Box)({
  position: 'relative',
  width: '90vw',
  height: '90vh',
  maxWidth: '1280px',
  maxHeight: '720px',
  backgroundColor: '#000',
  borderRadius: '8px',
  overflow: 'hidden',
  '@media (max-width: 768px)': {
    width: '95vw',
    height: '95vh',
  },
  '@media (orientation: landscape) and (max-height: 600px)': {
    width: '95vw',
    height: '90vh',
  },
  '&:fullscreen': {
    width: '100vw',
    height: '100vh',
    maxWidth: 'none',
    maxHeight: 'none',
    borderRadius: 0,
  },
});

const CloseButton = styled(IconButton)({
  position: 'absolute',
  top: '16px',
  right: '16px',
  color: '#fff',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 10000,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});

const ControlsOverlay = styled(Box)({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
  padding: '20px 16px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  transition: 'opacity 0.3s ease',
  zIndex: 9999,
  pointerEvents: 'auto',
});

const ControlsRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: '#fff',
});

const TimeDisplay = styled(Box)({
  fontSize: '14px',
  fontFamily: 'monospace',
  minWidth: '100px',
  textAlign: 'center',
});

interface PlayerMoviesProps {
  movie: {
    stream_id: string;
    container_extension: string;
  };
  autoPlay?: boolean;
  onReady?: () => void;
  onClose: () => void;
}

const PlayerMovies: React.FC<PlayerMoviesProps> = ({
  movie,
  autoPlay = true,
  onReady,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const playAttemptRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const handleVideoReady = useCallback(() => {
    setIsLoading(false);
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
    if (onReady) onReady();
  }, [autoPlay, onReady]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current && !isSeeking) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (value: number) => {
    setIsSeeking(false);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const initializeHls = useCallback((streamUrl: string) => {
    if (!videoRef.current) return;

    if (hlsRef.current) {
      destroyHls();
    }

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      lowLatencyMode: true,
      backBufferLength: 90,
      enableWorker: true,
      startLevel: -1,
      manifestLoadingTimeOut: 20000,
      manifestLoadingMaxRetry: 6,
      manifestLoadingRetryDelay: 1000,
      levelLoadingTimeOut: 20000,
      levelLoadingMaxRetry: 6,
      levelLoadingRetryDelay: 1000,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000,
    });

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('HLS: Mídia conectada');
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('HLS: Manifesto carregado');
      handleVideoReady();
      
      // Adicionar event listeners para controles de tempo no HLS
      if (videoRef.current) {
        videoRef.current.addEventListener('loadedmetadata', () => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        });
        
        videoRef.current.addEventListener('timeupdate', () => {
          if (videoRef.current && !isSeeking) {
            setCurrentTime(videoRef.current.currentTime);
          }
        });
        
        videoRef.current.addEventListener('play', () => setIsPlaying(true));
        videoRef.current.addEventListener('pause', () => setIsPlaying(false));
      }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('HLS: Erro de rede, tentando recuperar...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('HLS: Erro de mídia, tentando recuperar...');
            hls.recoverMediaError();
            break;
          default:
            console.error('HLS: Erro fatal', data);
            setError('Erro ao carregar o vídeo');
            destroyHls();
            break;
        }
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(videoRef.current);
    hlsRef.current = hls;
  }, [destroyHls, handleVideoReady]);

  useEffect(() => {
    const loadVideo = async () => {
      setIsLoading(true);
      setError(null);

      if (!movie?.stream_id || !movie?.container_extension) {
        setError('Informações do filme incompletas');
        return;
      }

      const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
      if (!user?.username || !user?.password) {
        setError('Usuário não autenticado');
        return;
      }

      const streamUrl = `/stream/movie/${user.username}/${user.password}/${movie.stream_id}.${movie.container_extension}`;
      console.log('Carregando stream:', streamUrl);

      try {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }

        if (movie.container_extension === 'mp4') {
          if (videoRef.current) {
            videoRef.current.src = streamUrl;
            videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
            
            // Adicionar event listeners para controles de tempo
            videoRef.current.addEventListener('loadedmetadata', () => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            });
            
            videoRef.current.addEventListener('timeupdate', () => {
              if (videoRef.current && !isSeeking) {
                setCurrentTime(videoRef.current.currentTime);
              }
            });
            
            videoRef.current.addEventListener('play', () => setIsPlaying(true));
            videoRef.current.addEventListener('pause', () => setIsPlaying(false));
          }
        } else if (Hls.isSupported()) {
          initializeHls(streamUrl);
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
          
          // Adicionar event listeners para controles de tempo
          videoRef.current.addEventListener('loadedmetadata', () => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          });
          
          videoRef.current.addEventListener('timeupdate', () => {
            if (videoRef.current && !isSeeking) {
              setCurrentTime(videoRef.current.currentTime);
            }
          });
          
          videoRef.current.addEventListener('play', () => setIsPlaying(true));
          videoRef.current.addEventListener('pause', () => setIsPlaying(false));
        } else {
          setError('Seu navegador não suporta a reprodução deste vídeo');
        }
      } catch (err) {
        console.error('Erro ao carregar vídeo:', err);
        setError('Erro ao carregar o vídeo');
      }
    };

    loadVideo();

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
      }
      destroyHls();
    };
  }, [movie, initializeHls, destroyHls, handleVideoReady]);

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseEnter = () => {
    setShowControls(true);
  };
  
  const handleMouseLeave = () => {
    if (!isFullscreen) {
      setShowControls(false);
    }
  };

  const handleMouseMove = () => {
    if (isFullscreen) {
      setShowControls(true);
    }
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Monitorar mudanças no estado de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Gerenciar controles em fullscreen
  useEffect(() => {
    let hideTimer: NodeJS.Timeout;

    const resetHideTimer = () => {
      if (hideTimer) clearTimeout(hideTimer);
      setShowControls(true);
      if (isFullscreen) {
        hideTimer = setTimeout(() => {
          setShowControls(false);
        }, 4000);
      }
    };

    if (isFullscreen) {
      // Mostrar controles imediatamente ao entrar em fullscreen
      setShowControls(true);
      resetHideTimer();
      document.addEventListener('mousemove', resetHideTimer);
      document.addEventListener('keydown', resetHideTimer);
      document.addEventListener('click', resetHideTimer);
    } else {
      // Fora do fullscreen, usar lógica normal
      setShowControls(false);
    }

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      document.removeEventListener('mousemove', resetHideTimer);
      document.removeEventListener('keydown', resetHideTimer);
      document.removeEventListener('click', resetHideTimer);
    };
  }, [isFullscreen]);

  return (
    <PlayerContainer onClick={(e) => e.target === e.currentTarget && onClose()}>
      <VideoWrapper
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%' }}
          playsInline
        />
        {isLoading && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            style={{ transform: 'translate(-50%, -50%)' }}
            color="error.main"
          >
            {error}
          </Box>
        )}
        {(showControls || isFullscreen) && !isLoading && !error && (
          <ControlsOverlay>
            {/* Barra de progresso */}
            <Slider
              value={currentTime}
              max={duration || 100}
              onChange={(_: Event, value: number | number[]) => {
                if (typeof value === 'number') {
                  setCurrentTime(value);
                  if (!isSeeking) {
                    handleSeek(value);
                  }
                }
              }}
              onChangeCommitted={(_: Event | React.SyntheticEvent, value: number | number[]) => {
                if (typeof value === 'number') {
                  handleSeekEnd(value);
                }
              }}
              onMouseDown={handleSeekStart}
              sx={{
                color: '#ff4444',
                height: 4,
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  '&:hover': {
                    boxShadow: '0px 0px 0px 8px rgba(255, 68, 68, 0.16)',
                  },
                },
                '& .MuiSlider-track': {
                  border: 'none',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            />
            
            {/* Controles principais */}
            <ControlsRow>
              {/* Play/Pause */}
              <IconButton onClick={togglePlayPause} sx={{ color: '#fff' }}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              
              {/* Tempo atual / Duração */}
              <TimeDisplay>
                {formatTime(currentTime)} / {formatTime(duration)}
              </TimeDisplay>
              
              {/* Spacer */}
              <Box sx={{ flexGrow: 1 }} />
              
              {/* Volume */}
              <VolumeUp sx={{ color: '#fff' }} />
              <Slider
                value={volume}
                max={1}
                step={0.1}
                onChange={(_: Event, value: number | number[]) => {
                  if (typeof value === 'number') {
                    handleVolumeChange(value);
                  }
                }}
                sx={{
                  width: 100,
                  color: '#fff',
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                  },
                }}
              />
              
              {/* Fullscreen */}
              <IconButton onClick={toggleFullscreen} sx={{ color: '#fff' }}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </ControlsRow>
          </ControlsOverlay>
        )}
        <CloseButton onClick={onClose}>
          <CloseIcon />
        </CloseButton>
      </VideoWrapper>
    </PlayerContainer>
  );
};

export default PlayerMovies;