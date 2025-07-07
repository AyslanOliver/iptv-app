import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Box, IconButton, CircularProgress, Slider, Typography, Chip } from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit,
  Forward10,
  Replay10,
  SkipNext,
  SkipPrevious,
  Settings
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const PlayerContainer = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
});

const VideoWrapper = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'none',
  '&.show-cursor': {
    cursor: 'default',
  },
});

const VideoElement = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

const ControlsOverlay = styled(Box)<{ visible: boolean }>(({ visible }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
  padding: '40px 24px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  transition: 'opacity 0.3s ease, transform 0.3s ease',
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(20px)',
  pointerEvents: visible ? 'auto' : 'none',
  zIndex: 10000,
}));

const TopControls = styled(Box)<{ visible: boolean }>(({ visible }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  background: 'linear-gradient(rgba(0,0,0,0.8), transparent)',
  padding: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  transition: 'opacity 0.3s ease, transform 0.3s ease',
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(-20px)',
  pointerEvents: visible ? 'auto' : 'none',
  zIndex: 10000,
}));

const CenterControls = styled(Box)<{ visible: boolean }>(({ visible }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  transition: 'opacity 0.3s ease',
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? 'auto' : 'none',
  zIndex: 10000,
}));

const ControlButton = styled(IconButton)({
  color: '#fff',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    transform: 'scale(1.1)',
  },
  transition: 'all 0.2s ease',
});

const EpisodeNavButton = styled(IconButton)({
  color: '#fff',
  backgroundColor: 'rgba(255, 68, 68, 0.7)',
  backdropFilter: 'blur(10px)',
  border: '2px solid rgba(255, 68, 68, 0.8)',
  width: '56px',
  height: '56px',
  '&:hover': {
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    transform: 'scale(1.15)',
    boxShadow: '0 0 20px rgba(255, 68, 68, 0.5)',
  },
  transition: 'all 0.3s ease',
  '& .MuiSvgIcon-root': {
    fontSize: '1.8rem',
  },
});

const PlayButton = styled(IconButton)({
  color: '#fff',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  width: '80px',
  height: '80px',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: 'scale(1.1)',
  },
  transition: 'all 0.2s ease',
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
  },
});

const ControlsRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  color: '#fff',
});

const TimeDisplay = styled(Typography)({
  fontSize: '16px',
  fontFamily: 'monospace',
  fontWeight: 500,
  minWidth: '120px',
  textAlign: 'center',
  color: '#fff',
});

const EpisodeInfo = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

const SeriesTitle = styled(Typography)({
  fontSize: '24px',
  fontWeight: 600,
  color: '#fff',
  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
});

const EpisodeTitle = styled(Typography)({
  fontSize: '18px',
  fontWeight: 400,
  color: '#fff',
  opacity: 0.9,
  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
});

const LoadingContainer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  color: '#fff',
});

const ErrorContainer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  color: '#ff4444',
  textAlign: 'center',
  maxWidth: '400px',
});

interface Episode {
  id: string;
  title: string;
  episode_num: number;
  season_num: number;
  container_extension: string;
  info?: {
    plot?: string;
    duration?: string;
  };
}

interface SeriesPlayerProps {
  episode: Episode;
  seriesTitle: string;
  autoPlay?: boolean;
  onReady?: () => void;
  onClose: () => void;
  onNextEpisode?: () => void;
  onPreviousEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPreviousEpisode?: boolean;
}

const SeriesPlayer: React.FC<SeriesPlayerProps> = ({
  episode,
  seriesTitle,
  autoPlay = true,
  onReady,
  onClose,
  onNextEpisode,
  onPreviousEpisode,
  hasNextEpisode = false,
  hasPreviousEpisode = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados do player
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  
  // Estados de tempo
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [buffered, setBuffered] = useState(0);

  // Função para formatar tempo
  const formatTime = useCallback((time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Função para mostrar controles temporariamente
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    setShowCursor(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowCursor(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Limpar HLS
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Inicializar HLS
  const initializeHls = useCallback((streamUrl: string) => {
    if (!videoRef.current) return;

    destroyHls();

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      lowLatencyMode: false,
      backBufferLength: 90,
      enableWorker: true,
      startLevel: -1,
      manifestLoadingTimeOut: 30000,
      manifestLoadingMaxRetry: 6,
      manifestLoadingRetryDelay: 1000,
      levelLoadingTimeOut: 30000,
      levelLoadingMaxRetry: 6,
      levelLoadingRetryDelay: 1000,
      fragLoadingTimeOut: 30000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000,
    });

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('SeriesPlayer: Mídia conectada');
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('SeriesPlayer: Manifesto carregado');
      setIsLoading(false);
      if (autoPlay && videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('SeriesPlayer: Reprodução HLS iniciada com sucesso');
              if (onReady) onReady();
            })
            .catch(error => {
              console.error('SeriesPlayer: Erro ao iniciar reprodução HLS:', error);
              setError('Erro ao iniciar reprodução: ' + error.message);
            });
        }
      } else {
        if (onReady) onReady();
      }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('SeriesPlayer HLS Error:', data);
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('SeriesPlayer: Erro de rede, tentando recuperar...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('SeriesPlayer: Erro de mídia, tentando recuperar...');
            hls.recoverMediaError();
            break;
          default:
            setError('Erro fatal ao carregar o episódio');
            destroyHls();
            break;
        }
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(videoRef.current);
    hlsRef.current = hls;
  }, [autoPlay, onReady, destroyHls]);

  // Controles de reprodução
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number) => {
    if (videoRef.current && !isSeeking) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  }, [isSeeking]);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback((value: number) => {
    setIsSeeking(false);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [currentTime, duration]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Event listeners do vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
      }
      
      // Atualizar buffer
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleEnded = () => {
      // Auto-play próximo episódio se disponível
      if (hasNextEpisode && onNextEpisode) {
        setTimeout(() => {
          onNextEpisode();
        }, 2000);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isSeeking, hasNextEpisode, onNextEpisode]);

  // Monitorar fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controles de mouse e teclado
  useEffect(() => {
    const handleMouseMove = () => showControlsTemporarily();
    const handleKeyDown = (e: KeyboardEvent) => {
      showControlsTemporarily();
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyN':
          e.preventDefault();
          if (hasNextEpisode && onNextEpisode) {
            onNextEpisode();
          }
          break;
        case 'KeyP':
          e.preventDefault();
          if (hasPreviousEpisode && onPreviousEpisode) {
            onPreviousEpisode();
          }
          break;
        case 'Escape':
          if (!document.fullscreenElement) {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showControlsTemporarily, togglePlayPause, skip, volume, handleVolumeChange, toggleFullscreen, toggleMute, onClose, hasNextEpisode, onNextEpisode, hasPreviousEpisode, onPreviousEpisode]);

  // Carregar episódio
  useEffect(() => {
    const loadEpisode = async () => {
      setIsLoading(true);
      setError(null);

      if (!episode?.id || !episode?.container_extension) {
        setError('Informações do episódio incompletas');
        return;
      }

      const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
      if (!user?.username || !user?.password) {
        setError('Usuário não autenticado');
        return;
      }

      const streamUrl = `/stream/series/${user.username}/${user.password}/${episode.id}.${episode.container_extension}`;
      console.log('SeriesPlayer: Carregando episódio:', streamUrl);
      console.log('SeriesPlayer: Dados do episódio:', {
        id: episode.id,
        container_extension: episode.container_extension,
        username: user.username,
        password: user.password
      });
      
      // Log para debug do tipo de arquivo
      console.log('SeriesPlayer: Tipo de arquivo detectado:', episode.container_extension);
      console.log('SeriesPlayer: URL completa construída:', streamUrl);

      try {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }

        console.log('SeriesPlayer: Verificando suporte a formatos de vídeo:');
        console.log('SeriesPlayer: Pode reproduzir MP4:', videoRef.current?.canPlayType('video/mp4'));
        console.log('SeriesPlayer: Pode reproduzir WebM:', videoRef.current?.canPlayType('video/webm'));
        console.log('SeriesPlayer: Pode reproduzir OGG:', videoRef.current?.canPlayType('video/ogg'));
        
        if (episode.container_extension === 'mp4') {
          if (videoRef.current) {
            // Add error event listener before setting src
            const handleVideoError = (e: Event) => {
              console.error('SeriesPlayer: Erro ao carregar vídeo:', e);
              console.error('SeriesPlayer: URL que falhou:', streamUrl);
              if (videoRef.current) {
                console.error('SeriesPlayer: Video error details:', {
                  error: videoRef.current.error,
                  networkState: videoRef.current.networkState,
                  readyState: videoRef.current.readyState
                });
              }
              setError('Erro ao carregar o vídeo: fonte não suportada ou inacessível');
            };
            
            const handleCanPlay = () => {
              console.log('SeriesPlayer: Vídeo pode ser reproduzido');
            };
            
            const handleLoadedData = () => {
              console.log('SeriesPlayer: Dados do vídeo carregados');
            };
            
            // Test if URL is accessible
             console.log('SeriesPlayer: Testando acessibilidade da URL:', streamUrl);
             const testVideo = document.createElement('video');
             testVideo.addEventListener('error', (e) => {
               console.error('SeriesPlayer: Teste de URL falhou:', e);
             });
             testVideo.addEventListener('loadstart', () => {
               console.log('SeriesPlayer: Teste de URL - carregamento iniciado');
             });
             testVideo.src = streamUrl;
             
             videoRef.current.addEventListener('error', handleVideoError);
             videoRef.current.addEventListener('canplay', handleCanPlay);
             videoRef.current.addEventListener('loadeddata', handleLoadedData);
             videoRef.current.src = streamUrl;
             console.log('SeriesPlayer: Fonte MP4 definida:', streamUrl);
            setIsLoading(false);
            if (autoPlay) {
              // Wait a bit for the video element to be ready
              setTimeout(() => {
                if (videoRef.current) {
                  const playPromise = videoRef.current.play();
                  if (playPromise !== undefined) {
                    playPromise
                      .then(() => {
                        console.log('SeriesPlayer: Reprodução iniciada com sucesso');
                        if (onReady) onReady();
                      })
                      .catch(error => {
                        console.error('SeriesPlayer: Erro ao iniciar reprodução:', error);
                        setError('Erro ao iniciar reprodução: ' + error.message);
                      });
                  }
                }
              }, 100);
            } else {
              if (onReady) onReady();
            }
          }
        } else if (Hls.isSupported()) {
          initializeHls(streamUrl);
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          setIsLoading(false);
          if (autoPlay) {
            // Wait a bit for the video element to be ready
            setTimeout(() => {
              if (videoRef.current) {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('SeriesPlayer: Reprodução HLS iniciada com sucesso');
                      if (onReady) onReady();
                    })
                    .catch(error => {
                      console.error('SeriesPlayer: Erro ao iniciar reprodução HLS:', error);
                      setError('Erro ao iniciar reprodução: ' + error.message);
                    });
                }
              }
            }, 100);
          } else {
            if (onReady) onReady();
          }
        } else {
          setError('Seu navegador não suporta a reprodução deste vídeo');
        }
      } catch (err) {
        console.error('SeriesPlayer: Erro ao carregar episódio:', err);
        console.error('SeriesPlayer: Detalhes do erro:', {
          episodeId: episode.id,
          containerExtension: episode.container_extension,
          streamUrl: streamUrl,
          errorMessage: err instanceof Error ? err.message : 'Erro desconhecido'
        });
        setError('Erro ao carregar o episódio: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
         setIsLoading(false);
       }
    };

    loadEpisode();

    return () => {
      const currentVideo = videoRef.current;
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.removeAttribute('src');
      }
      destroyHls();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [episode, initializeHls, destroyHls, autoPlay, onReady]);

  // Inicializar controles
  useEffect(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  return (
    <PlayerContainer
      ref={containerRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <VideoWrapper className={showCursor ? 'show-cursor' : ''}>
        <VideoElement
          ref={videoRef}
          playsInline
          onClick={togglePlayPause}
        />
        
        {/* Loading */}
        {isLoading && (
          <LoadingContainer>
            <CircularProgress size={60} sx={{ color: '#ff4444' }} />
            <Typography variant="h6">Carregando episódio...</Typography>
          </LoadingContainer>
        )}
        
        {/* Error */}
        {error && (
          <ErrorContainer>
            <Typography variant="h5" color="error">
              Erro
            </Typography>
            <Typography variant="body1">
              {error}
            </Typography>
            <ControlButton onClick={onClose}>
              <CloseIcon />
            </ControlButton>
          </ErrorContainer>
        )}
        
        {/* Top Controls */}
        {!isLoading && !error && (
          <TopControls visible={showControls}>
            <EpisodeInfo>
              <SeriesTitle variant="h5">
                {seriesTitle}
              </SeriesTitle>
              <EpisodeTitle variant="h6">
                T{episode.season_num}E{episode.episode_num} - {episode.title}
              </EpisodeTitle>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip 
                  label={`Temporada ${episode.season_num}`} 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(255, 68, 68, 0.2)', 
                    color: '#fff',
                    border: '1px solid rgba(255, 68, 68, 0.5)'
                  }} 
                />
                <Chip 
                  label={`Episódio ${episode.episode_num}`} 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }} 
                />
              </Box>
            </EpisodeInfo>
            <ControlButton onClick={onClose}>
              <CloseIcon />
            </ControlButton>
          </TopControls>
        )}
        
        {/* Center Controls */}
        {!isLoading && !error && !isPlaying && (
          <CenterControls visible={showControls}>
            {hasPreviousEpisode && (
              <EpisodeNavButton onClick={onPreviousEpisode}>
                <SkipPrevious />
              </EpisodeNavButton>
            )}
            <ControlButton onClick={() => skip(-10)}>
              <Replay10 />
            </ControlButton>
            <PlayButton onClick={togglePlayPause}>
              <PlayArrow />
            </PlayButton>
            <ControlButton onClick={() => skip(10)}>
              <Forward10 />
            </ControlButton>
            {hasNextEpisode && (
              <EpisodeNavButton onClick={onNextEpisode}>
                <SkipNext />
              </EpisodeNavButton>
            )}
          </CenterControls>
        )}
        
        {/* Bottom Controls */}
        {!isLoading && !error && (
          <ControlsOverlay visible={showControls}>
            {/* Progress Bar */}
            <Box sx={{ position: 'relative' }}>
              {/* Buffer Bar */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '4px',
                  width: `${buffered}%`,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                }}
              />
              <Slider
                value={currentTime}
                max={duration || 100}
                onChange={(_, value) => {
                  if (typeof value === 'number') {
                    setCurrentTime(value);
                    if (!isSeeking) {
                      handleSeek(value);
                    }
                  }
                }}
                onChangeCommitted={(_, value) => {
                  if (typeof value === 'number') {
                    handleSeekEnd(value);
                  }
                }}
                onMouseDown={handleSeekStart}
                sx={{
                  color: '#ff4444',
                  height: 6,
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    '&:hover': {
                      boxShadow: '0px 0px 0px 8px rgba(255, 68, 68, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    border: 'none',
                    height: 6,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    height: 6,
                  },
                }}
              />
            </Box>
            
            {/* Main Controls */}
            <ControlsRow>
              {/* Play/Pause */}
              <ControlButton onClick={togglePlayPause}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </ControlButton>
              
              {/* Episode Navigation */}
              {hasPreviousEpisode && (
                <EpisodeNavButton onClick={onPreviousEpisode}>
                  <SkipPrevious />
                </EpisodeNavButton>
              )}
              
              {/* Skip buttons */}
              <ControlButton onClick={() => skip(-10)}>
                <Replay10 />
              </ControlButton>
              <ControlButton onClick={() => skip(10)}>
                <Forward10 />
              </ControlButton>
              
              {hasNextEpisode && (
                <EpisodeNavButton onClick={onNextEpisode}>
                  <SkipNext />
                </EpisodeNavButton>
              )}
              
              {/* Time */}
              <TimeDisplay>
                {formatTime(currentTime)} / {formatTime(duration)}
              </TimeDisplay>
              
              {/* Spacer */}
              <Box sx={{ flexGrow: 1 }} />
              
              {/* Volume */}
              <ControlButton onClick={toggleMute}>
                {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
              </ControlButton>
              <Slider
                value={isMuted ? 0 : volume}
                max={1}
                step={0.1}
                onChange={(_, value) => {
                  if (typeof value === 'number') {
                    handleVolumeChange(value);
                  }
                }}
                sx={{
                  width: 120,
                  color: '#fff',
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                  },
                  '& .MuiSlider-track': {
                    height: 4,
                  },
                  '& .MuiSlider-rail': {
                    height: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              />
              
              {/* Settings */}
              <ControlButton>
                <Settings />
              </ControlButton>
              
              {/* Fullscreen */}
              <ControlButton onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </ControlButton>
            </ControlsRow>
          </ControlsOverlay>
        )}
      </VideoWrapper>
    </PlayerContainer>
  );
};

export default SeriesPlayer;