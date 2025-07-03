import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './IptvPlayer.css';

interface Channel {
  stream_id: string;
  id: string;
  name: string;
  stream_icon?: string;
  current_program?: string;
  [key: string]: any;
}

interface IptvPlayerProps {
  streamUrl: string;
  channel: Channel;
  channels: Channel[];
  autoPlay?: boolean;
  onError: (error: string) => void;
  onChannelChange: (channel: Channel) => void;
}

const IptvPlayer: React.FC<IptvPlayerProps> = ({
  streamUrl,
  channel,
  channels,
  autoPlay = true,
  onError,
  onChannelChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar HLS
  useEffect(() => {
    if (!videoRef.current) return;

    const initializeHls = async () => {
      setLoading(true);
      setError(null);

      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true
          });

          if (videoRef.current) {
            hls.attachMedia(videoRef.current);
          }
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(streamUrl);
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              const errorMessage = 'Erro ao carregar o stream';
              setError(errorMessage);
              onError(errorMessage);
              hls.destroy();
            }
          });

          hlsRef.current = hls;
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
        }
      } catch (err) {
        const errorMessage = 'Erro ao inicializar o player';
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    initializeHls();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [streamUrl, onError]);

  // Handlers de eventos do vídeo
  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const slider = e.currentTarget;
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.round((x / rect.width) * 100);
    
    videoRef.current.volume = newVolume / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    if (!videoRef.current) return;
    
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const slider = e.currentTarget;
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(progress) ? 0 : progress);
  };

  const handleLoadedData = () => {
    setLoading(false);
    if (autoPlay && videoRef.current) {
      videoRef.current.play();
    }
  };

  const handlePreviousChannel = () => {
    const currentIndex = channels.findIndex(c => c.stream_id === channel.stream_id);
    if (currentIndex > 0) {
      onChannelChange(channels[currentIndex - 1]);
    }
  };

  const handleNextChannel = () => {
    const currentIndex = channels.findIndex(c => c.stream_id === channel.stream_id);
    if (currentIndex < channels.length - 1) {
      onChannelChange(channels[currentIndex + 1]);
    }
  };

  return (
    <div className="player-container">
      <video
        ref={videoRef}
        className="video-element"
        onLoadedData={handleLoadedData}
      />

      {/* Overlay de loading/erro */}
      {(loading || error) && (
        <div className="player-overlay">
          {loading && !error && (
            <div className="loading-spinner" />
          )}
          {error && (
            <div className="error-message">
              <h3>Erro</h3>
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Informações do canal */}
      <div className="channel-info">
        <h3 className="channel-name">{channel.name}</h3>
      </div>

      {/* Controles do player */}
      <div className="player-controls">
        <div className="controls-row">
          <button
            className="control-button"
            onClick={handlePreviousChannel}
            title="Canal anterior"
          >
            ⏮️
          </button>
          <div className="volume-control">
            <button
              className="control-button"
              onClick={handleMute}
              title={isMuted ? 'Ativar som' : 'Mudo'}
            >
              {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
            </button>
            <div className="volume-slider" onClick={handleVolumeChange}>
              <style>{`.volume-slider::after { --volume: ${volume}% }`}</style>
            </div>
          </div>
          <button
            className="control-button"
            onClick={handleNextChannel}
            title="Próximo canal"
          >
            ⏭️
          </button>
        </div>
      </div>
    </div>
  );
};

export default IptvPlayer;