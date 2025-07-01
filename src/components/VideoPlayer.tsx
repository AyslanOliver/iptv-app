import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  title: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    
    // Resetar estados
    setLoading(true);
    setError(null);
    
    // Verificar se a URL é válida
    if (!url || url.trim() === '') {
      setError('URL do stream não disponível. Este canal pode estar temporariamente indisponível.');
      setLoading(false);
      return;
    }

    // Verificar se a URL tem formato válido
    try {
      new URL(url);
    } catch {
      setError('URL do stream inválida. Verifique a configuração do canal.');
      setLoading(false);
      return;
    }

    // Limpar instância anterior do HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;

    if (Hls.isSupported()) {
      // Usar HLS.js para navegadores que suportam
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: Infinity,
        liveDurationInfinity: false,
        enableSoftwareAES: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        startFragPrefetch: false,
        testBandwidth: true,
        progressive: false
      });

      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Manifest carregado, iniciando reprodução...');
        setLoading(false);
        setError(null);
        video.play().catch(error => {
          console.error('Erro ao iniciar reprodução automática:', error);
          setError('Erro ao iniciar reprodução');
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('Erro HLS:', data);
        setLoading(false);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 3) {
                console.log('Erro de rede, tentando recuperar...');
                setError('Erro de conexão, tentando reconectar...');
                setTimeout(() => {
                  hls.startLoad();
                  setRetryCount(prev => prev + 1);
                }, 2000);
              } else {
                setError('Falha na conexão. Verifique sua internet.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Erro de mídia, tentando recuperar...');
              setError('Erro de mídia, tentando recuperar...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Erro fatal, destruindo HLS...');
              setError('Stream não disponível ou formato incompatível');
              hls.destroy();
              break;
          }
        } else {
          // Erros não fatais
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setError('Problemas de conexão detectados');
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Suporte nativo para HLS (Safari)
      video.src = url;
      
      const handleLoadStart = () => {
        setLoading(true);
        setError(null);
      };
      
      const handleCanPlay = () => {
        setLoading(false);
        setError(null);
      };
      
      const handleError = () => {
        setLoading(false);
        setError('Erro ao carregar o stream');
      };
      
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      // Timeout para detectar URLs inválidas
      const timeout = setTimeout(() => {
        if (loading) {
          setLoading(false);
          setError('Timeout: Stream não responde');
        }
      }, 15000);
      
      video.play().catch(error => {
        console.error('Erro ao iniciar reprodução nativa:', error);
        setLoading(false);
        setError('Erro ao iniciar reprodução');
      });
      
      return () => {
        clearTimeout(timeout);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    } else {
      setLoading(false);
      setError('HLS não é suportado neste navegador');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, loading, retryCount]);

  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    setLoading(true);
    // Forçar re-render do useEffect
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

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

  const handleMouseEnter = () => setShowControls(true);
  const handleMouseLeave = () => setShowControls(false);

  return (
    <div 
      className="video-player-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '300px',
        maxHeight: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {loading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Carregando stream...</p>
        </div>
      )}
      
      {error && (
        <div className="video-error">
          <div className="error-icon">⚠️</div>
          <h4>Erro de Reprodução</h4>
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            Tentar Novamente
          </button>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="video-element"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
          backgroundColor: '#000',
          display: loading || error ? 'none' : 'block',
          objectFit: 'contain'
        }}
        playsInline
        muted={false}
      >
        Seu navegador não suporta reprodução de vídeo.
      </video>

      {/* Controles customizados */}
      {showControls && !loading && !error && (
        <div className="custom-controls">
          <div className="volume-control">
            <span>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>
          <button onClick={toggleFullscreen} className="fullscreen-btn">
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;