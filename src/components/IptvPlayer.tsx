import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Box, IconButton, CircularProgress, Slider, Typography, Tooltip } from '@mui/material';
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
  Refresh,
  Settings
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Estilos para o player
const PlayerContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
});

const VideoWrapper = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const VideoElement = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

const ControlsOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '16px',
  background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.7) 100%)',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  '&.visible': {
    opacity: 1,
  },
});

const TopControls = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
});

const BottomControls = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

const ProgressContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  marginBottom: '8px',
});

const TimeDisplay = styled(Typography)({
  marginLeft: '8px',
  marginRight: '8px',
  fontSize: '14px',
  color: '#fff',
});

const ButtonsContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
});

const CenterControls = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const BufferingIndicator = styled(CircularProgress)({
  color: '#90caf9',
});

const ErrorMessage = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#fff',
  textAlign: 'center',
  padding: '20px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '8px',
  maxWidth: '80%',
});

interface IptvPlayerProps {
  streamUrl: string;
  channelName?: string;
  autoPlay?: boolean;
  onClose?: () => void;
  onError?: (error: string) => void;
}

const IptvPlayer: React.FC<IptvPlayerProps> = ({
  streamUrl,
  channelName = '',
  autoPlay = true,
  onClose,
  onError,
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
  const [fallbackMode, setFallbackMode] = useState(0); // 0: normal, 1: sem crossOrigin, 2: config alternativa

  // Formatar tempo (segundos para MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inicializar HLS
  const initializeHls = useCallback(() => {
    if (!videoRef.current) return;
    
    // Limpar instância anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Verificar se o navegador suporta HLS nativamente (Safari)
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      return;
    }

    // Verificar se Hls.js é suportado
    if (!Hls.isSupported()) {
      setError('Seu navegador não suporta a reprodução de streams HLS.');
      if (onError) onError('Navegador incompatível com HLS');
      return;
    }

    try {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
        startLevel: -1, // Auto
        debug: false,
      });

      hlsRef.current = hls;

      // Eventos HLS
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS: Media attached');
        hls.loadSource(streamUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log(`HLS: Manifest carregado, ${data.levels.length} qualidades disponíveis`);
        if (autoPlay) {
          videoRef.current?.play().catch(e => {
            console.warn('Falha no autoplay:', e);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error(`HLS Erro fatal: ${data.type} - ${data.details}`);
          
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
              // Erro não recuperável
              handleStreamError('Erro ao carregar o stream');
              break;
          }
        }
      });

      // Anexar ao elemento de vídeo
      hls.attachMedia(videoRef.current);
    } catch (error) {
      console.error('Erro ao inicializar HLS:', error);
      handleStreamError('Falha ao inicializar o player');
    }
  }, [streamUrl, autoPlay, onError]);

  // Tentar stream com fallback
  const retryStreamWithFallback = useCallback(() => {
    if (retryCount >= 3) {
      // Tentar mudar o modo de fallback
      if (fallbackMode < 2) {
        setFallbackMode(prev => prev + 1);
        setRetryCount(0);
        console.log(`Mudando para modo de fallback ${fallbackMode + 1}`);
      } else {
        // Todos os modos de fallback falharam
        handleStreamError('Não foi possível reproduzir este canal após várias tentativas');
        return;
      }
    }

    setRetryCount(prev => prev + 1);
    console.log(`Tentativa ${retryCount + 1} de reproduzir o stream`);
    
    // Pequeno atraso antes de tentar novamente
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      initializeHls();
    }, 1000);
  }, [retryCount, fallbackMode, initializeHls]);

  // Manipular erro de stream
  const handleStreamError = (message: string) => {
    setError(message);
    setIsLoading(false);
    if (onError) onError(message);
  };

  // Manipular eventos de vídeo
  const handleVideoEvent = useCallback((event: Event) => {
    const video = event.target as HTMLVideoElement;
    
    switch (event.type) {
      case 'loadstart':
        console.log('Vídeo: loadstart');
        setIsLoading(true);
        break;
      
      case 'loadeddata':
        console.log('Vídeo: loadeddata');
        break;
      
      case 'canplay':
        console.log('Vídeo: canplay');
        setIsLoading(false);
        break;
      
      case 'play':
        console.log('Vídeo: play');
        setIsPlaying(true);
        break;
      
      case 'pause':
        console.log('Vídeo: pause');
        setIsPlaying(false);
        break;
      
      case 'timeupdate':
        setCurrentTime(video.currentTime);
        break;
      
      case 'durationchange':
        if (video.duration !== Infinity) {
          setDuration(video.duration);
        }
        break;
      
      case 'waiting':
        console.log('Vídeo: waiting (buffering)');
        setIsBuffering(true);
        break;
      
      case 'playing':
        console.log('Vídeo: playing');
        setIsBuffering(false);
        setIsLoading(false);
        break;
      
      case 'error':
        console.error('Vídeo: error', video.error);
        if (video.error) {
          const errorCode = video.error.code;
          let errorMessage = 'Erro desconhecido ao reproduzir o vídeo';
          
          switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = 'A reprodução foi abortada';
              break;
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = 'Erro de rede ao carregar o stream';
              retryStreamWithFallback();
              return;
            case 3: // MEDIA_ERR_DECODE
              errorMessage = 'Erro ao decodificar o stream';
              retryStreamWithFallback();
              return;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage = 'Formato de stream não suportado';
              break;
          }
          
          handleStreamError(errorMessage);
        }
        break;
      
      case 'stalled':
        console.log('Vídeo: stalled');
        // Após 5 segundos em stalled, tentar recuperar
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState === 0) {
            console.log('Vídeo continua stalled, tentando recuperar...');
            retryStreamWithFallback();
          }
        }, 5000);
        break;
      
      case 'suspend':
        console.log('Vídeo: suspend');
        // Após 2 segundos em suspend, verificar se ainda está carregando
        setTimeout(() => {
          if (videoRef.current && isLoading) {
            console.log('Vídeo continua em suspend, verificando estado...');
            if (videoRef.current.readyState >= 3) {
              setIsLoading(false);
            }
          }
        }, 2000);
        break;
    }
  }, [isLoading, retryStreamWithFallback]);

  // Reproduzir/Pausar
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => {
        console.error('Erro ao reproduzir:', e);
      });
    }
  }, [isPlaying]);

  // Controle de volume
  const handleVolumeChange = useCallback((event: Event, newValue: number | number[]) => {
    if (!videoRef.current) return;
    
    const volumeValue = newValue as number;
    setVolume(volumeValue);
    videoRef.current.volume = volumeValue / 100;
    setIsMuted(volumeValue === 0);
  }, []);

  // Alternar mudo
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    videoRef.current.muted = newMutedState;
  }, [isMuted]);

  // Alternar tela cheia
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Erro ao entrar em tela cheia:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Reiniciar stream
  const restartStream = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setFallbackMode(0);
    
    // Pequeno atraso para garantir que tudo seja reiniciado
    setTimeout(() => {
      initializeHls();
    }, 500);
  }, [initializeHls]);

  // Mostrar/esconder controles
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    // Limpar timeout anterior
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Esconder controles após 3 segundos
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Efeito para inicializar o player
  useEffect(() => {
    if (streamUrl) {
      setIsLoading(true);
      setError(null);
      initializeHls();
    }
    
    return () => {
      // Limpar ao desmontar
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [streamUrl, initializeHls]);

  // Efeito para adicionar eventos ao vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Lista de eventos para monitorar
    const events = [
      'loadstart', 'loadeddata', 'canplay', 'play', 'pause',
      'timeupdate', 'durationchange', 'waiting', 'playing',
      'error', 'stalled', 'suspend'
    ];
    
    // Adicionar listeners
    events.forEach(event => {
      video.addEventListener(event, handleVideoEvent);
    });
    
    // Configurar volume inicial
    video.volume = volume / 100;
    video.muted = isMuted;
    
    // Configurações específicas para IPTV
    if (fallbackMode === 0) {
      video.crossOrigin = 'anonymous';
    }
    video.preload = 'auto';
    video.playsInline = true;
    
    return () => {
      // Remover listeners
      events.forEach(event => {
        video.removeEventListener(event, handleVideoEvent);
      });
    };
  }, [handleVideoEvent, volume, isMuted, fallbackMode]);

  // Efeito para monitorar mudanças de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Efeito para controles de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'r':
          restartStream();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.addEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, toggleMute, toggleFullscreen, restartStream]);

  return (
    <PlayerContainer ref={containerRef} onMouseMove={handleMouseMove}>
      <VideoWrapper>
        <VideoElement
          ref={videoRef}
          playsInline
          onClick={togglePlay}
        />
        
        {/* Indicador de carregamento */}
        {isLoading && (
          <CenterControls>
            <BufferingIndicator size={60} />
          </CenterControls>
        )}
        
        {/* Indicador de buffer */}
        {!isLoading && isBuffering && (
          <CenterControls>
            <BufferingIndicator size={40} />
          </CenterControls>
        )}
        
        {/* Mensagem de erro */}
        {error && (
          <ErrorMessage>
            <Typography variant="h6" gutterBottom>
              Erro ao reproduzir
            </Typography>
            <Typography variant="body1" gutterBottom>
              {error}
            </Typography>
            <IconButton
              onClick={restartStream}
              color="primary"
              aria-label="Tentar novamente"
            >
              <Refresh />
            </IconButton>
          </ErrorMessage>
        )}
        
        {/* Controles */}
        <ControlsOverlay className={showControls ? 'visible' : ''}>
          {/* Controles superiores */}
          <TopControls>
            <Typography variant="h6" sx={{ color: '#fff' }}>
              {channelName}
            </Typography>
            {onClose && (
              <IconButton
                onClick={onClose}
                color="inherit"
                aria-label="Fechar"
                size="large"
              >
                <CloseIcon />
              </IconButton>
            )}
          </TopControls>
          
          {/* Controles centrais */}
          <CenterControls>
            {!isLoading && !isBuffering && !error && (
              <IconButton
                onClick={togglePlay}
                color="inherit"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                size="large"
                sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' } }}
              >
                {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
              </IconButton>
            )}
          </CenterControls>
          
          {/* Controles inferiores */}
          <BottomControls>
            {/* Barra de progresso (apenas se tiver duração) */}
            {duration > 0 && (
              <ProgressContainer>
                <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
                <Slider
                  value={currentTime}
                  max={duration}
                  onChange={(e, newValue) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = newValue as number;
                    }
                  }}
                  aria-label="Progresso do vídeo"
                  sx={{ mx: 2, color: '#90caf9' }}
                />
                <TimeDisplay>{formatTime(duration)}</TimeDisplay>
              </ProgressContainer>
            )}
            
            <ButtonsContainer>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Botão Play/Pause */}
                <IconButton
                  onClick={togglePlay}
                  color="inherit"
                  aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
                
                {/* Botão Reiniciar Stream */}
                <Tooltip title="Reiniciar stream">
                  <IconButton
                    onClick={restartStream}
                    color="inherit"
                    aria-label="Reiniciar stream"
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
                
                {/* Controle de volume */}
                <Box sx={{ display: 'flex', alignItems: 'center', width: 140, ml: 1 }}>
                  <IconButton
                    onClick={toggleMute}
                    color="inherit"
                    aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
                  >
                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>
                  <Slider
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                    sx={{ ml: 1, color: '#90caf9' }}
                  />
                </Box>
              </Box>
              
              <Box>
                {/* Botão de tela cheia */}
                <IconButton
                  onClick={toggleFullscreen}
                  color="inherit"
                  aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                >
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              </Box>
            </ButtonsContainer>
          </BottomControls>
        </ControlsOverlay>
      </VideoWrapper>
    </PlayerContainer>
  );
};

export default IptvPlayer;