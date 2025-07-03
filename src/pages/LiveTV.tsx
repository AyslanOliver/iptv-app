import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEpgData, generateCatchupUrl, formatToXmltvUtc } from '../services/iptvService';
import IptvPlayer from '../components/IptvPlayer/IptvPlayer';
import '../styles/LiveTV.css';

interface Channel {
  stream_id: string;
  id: string;
  name: string;
  category_id?: string;
  stream_url?: string;
  stream_icon?: string;
  isCatchup?: boolean;
  catchupProgram?: any;
  current_program?: string;
  [key: string]: any;
}

interface Category {
  category_id: string;
  category_name: string;
}

interface EpgProgram {
  startTime: number;
  stopTime: number;
  title: string;
}

interface User {
  username: string;
  password: string;
}

const LiveTV: React.FC = () => {
  const navigate = useNavigate();

  // Estados principais
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [epgData, setEpgData] = useState<Record<string, EpgProgram[]>>({});
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingEpg, setIsLoadingEpg] = useState(false);
  
  // Estados do player
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>('');

  // Função para formatar horários EPG
  const formatEpgTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para carregar EPG
  const loadEpgData = async () => {
    const userData = localStorage.getItem('iptvUser');
    if (!userData) return;

    try {
      setIsLoadingEpg(true);
      const user: User = JSON.parse(userData);
      const data = await getEpgData(user);
      setEpgData(data);
    } catch (err) {
      console.error('Erro ao carregar EPG:', err);
    } finally {
      setIsLoadingEpg(false);
    }
  };

  // Função para obter programa atual e próximo
  const getCurrentAndNextProgram = (channel: Channel) => {
    const channelEpg = epgData[channel.stream_id] || [];
    const now = Date.now() / 1000;
    
    let currentProgram: EpgProgram | null = null;
    let nextProgram: EpgProgram | null = null;
    
    for (let i = 0; i < channelEpg.length; i++) {
      const program = channelEpg[i];
      if (program.startTime <= now && program.stopTime >= now) {
        currentProgram = program;
        nextProgram = channelEpg[i + 1] || null;
        break;
      } else if (program.startTime > now && !nextProgram) {
        nextProgram = program;
        break;
      }
    }
    
    return { current: currentProgram, next: nextProgram };
  };

  // Função para reproduzir catchup
  const playCatchup = (channel: Channel, program: EpgProgram) => {
    const userData = localStorage.getItem('iptvUser');
    if (!userData) return;

    try {
      const user: User = JSON.parse(userData);
      const utcStart = formatToXmltvUtc(program.startTime);
      const duration = Math.ceil((program.stopTime - program.startTime) / 60);
      
      const catchupUrl = generateCatchupUrl(user, channel.stream_id, utcStart, duration);
      
      setSelectedChannel({
        ...channel,
        stream_url: catchupUrl,
        isCatchup: true,
        catchupProgram: program,
        current_program: program.title
      });
      
      setCurrentStreamUrl(catchupUrl);
    } catch (err) {
      console.error('Erro ao gerar catchup:', err);
    }
  };

  // Função para testar credenciais
  const testCredentials = async (): Promise<boolean> => {
    const userData = localStorage.getItem('iptvUser');
    if (!userData) return false;

    try {
      const user: User = JSON.parse(userData);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `/api/player_api.php?username=${user.username}&password=${user.password}&action=get_live_categories`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.status === 401) return false;
      
      await response.json();
      return true;
    } catch (err) {
      return false;
    }
  };

  // Função para lidar com seleção de canal
  const handleChannelSelect = async (channel: Channel) => {
    const credentialsValid = await testCredentials();
    
    if (!credentialsValid) {
      localStorage.removeItem('iptvUser');
      setError('Sessão expirada. Redirecionando para login...');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }
    
    const userData = localStorage.getItem('iptvUser');
    if (!userData) return;
    
    const user: User = JSON.parse(userData);
    const streamUrl = `http://zeusodin.online/live/${user.username}/${user.password}/${channel.stream_id}.m3u8`;
    
    const { current } = getCurrentAndNextProgram(channel);
    const channelWithUrl = {
      ...channel,
      stream_url: streamUrl,
      current_program: current?.title
    };
    
    setSelectedChannel(channelWithUrl);
    setCurrentStreamUrl(streamUrl);
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      const userData = localStorage.getItem('iptvUser');
      if (!userData) {
        navigate('/login');
        return;
      }

      try {
        const user: User = JSON.parse(userData);

        const [categoriesResponse, channelsResponse] = await Promise.all([
          fetch(`/api/player_api.php?username=${user.username}&password=${user.password}&action=get_live_categories`),
          fetch(`/api/player_api.php?username=${user.username}&password=${user.password}&action=get_live_streams`)
        ]);

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          setChannels(channelsData);
        }

        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar dados');
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  // Carregar EPG quando canais estiverem disponíveis
  useEffect(() => {
    if (channels.length > 0) {
      loadEpgData();
    }
  }, [channels]);

  // Carregar favoritos do localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Funções auxiliares
  const toggleFavorite = (channel: Channel) => {
    const isFav = favorites.some(fav => fav.stream_id === channel.stream_id);
    const newFavorites = isFav
      ? favorites.filter(fav => fav.stream_id !== channel.stream_id)
      : [...favorites, channel];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const isFavorite = (channel: Channel) => {
    return favorites.some(fav => fav.stream_id === channel.stream_id);
  };

  const filteredChannels = () => {
    let filtered = channels;
    
    if (selectedCategory === 'favorites') {
      filtered = favorites;
    } else if (selectedCategory !== 'all') {
      filtered = channels.filter(channel => channel.category_id === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(channel => 
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="livetv-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Carregando canais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="livetv-container">
        <div className="error">
          <h3>Erro</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="livetv-container">
      {/* Sidebar com categorias */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Categorias</h3>
        </div>
        
        <div className="categories-sidebar">
          <button
            className={`category-sidebar-item ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span>Todos os Canais</span>
          </button>
          
          <button
            className={`category-sidebar-item ${selectedCategory === 'favorites' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('favorites')}
          >
            <span>Favoritos ({favorites.length})</span>
          </button>
          
          {categories.map(category => (
            <button
              key={category.category_id}
              className={`category-sidebar-item ${selectedCategory === category.category_id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              <span>{category.category_name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="main-content">
        {/* Header com busca */}
        <div className="header-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar canais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="clear-search">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Lista de canais */}
        <div className="channels-section">
          <div className="channels-header">
            <h2>
              {selectedCategory === 'all' ? 'Todos os Canais' :
               selectedCategory === 'favorites' ? 'Canais Favoritos' :
               categories.find(c => c.category_id === selectedCategory)?.category_name || 'Canais'}
            </h2>
            <span className="channels-count">
              {filteredChannels().length} canais
            </span>
          </div>

          <div className="channels-grid">
            {filteredChannels().map(channel => (
              <div
                key={channel.stream_id}
                className={`channel-card ${selectedChannel?.stream_id === channel.stream_id ? 'selected' : ''}`}
                onClick={() => handleChannelSelect(channel)}
              >
                {/* Ícone do canal */}
                <div className="channel-logo-container">
                  {channel.stream_icon ? (
                    <img
                      src={channel.stream_icon}
                      alt={channel.name}
                      className="channel-logo"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="channel-logo-placeholder">
                      📺
                    </div>
                  )}
                </div>

                {/* Informações do canal */}
                <div className="channel-info">
                  <div className="channel-main-info">
                    <h4 className="channel-name">{channel.name}</h4>
                    <button
                      className={`favorite-btn ${isFavorite(channel) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(channel);
                      }}
                    >
                      {isFavorite(channel) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  
                  {/* Informações de programação */}
                  <div className="program-info">
                    {isLoadingEpg ? (
                      <div className="epg-loading">
                        <span>Carregando EPG...</span>
                      </div>
                    ) : (() => {
                      const { current, next } = getCurrentAndNextProgram(channel);
                      return (
                        <>
                          {current && (
                            <div className="program-current">
                              <span className="program-time">
                                {formatEpgTime(current.startTime)} - {formatEpgTime(current.stopTime)}
                              </span>
                              <span className="program-title">{current.title}</span>
                              <button 
                                className="catchup-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playCatchup(channel, current);
                                }}
                                title="Assistir desde o início"
                              >
                                ⏮️
                              </button>
                            </div>
                          )}
                          {next && (
                            <div className="program-next">
                              <span className="program-time">
                                {formatEpgTime(next.startTime)} - {formatEpgTime(next.stopTime)}
                              </span>
                              <span className="program-title">{next.title}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player IPTV */}
      {selectedChannel && (
        <IptvPlayer
          streamUrl={currentStreamUrl}
          channel={selectedChannel}
          channels={filteredChannels()}
          autoPlay={true}
          onError={(error: string) => setError(error)}
          onChannelChange={handleChannelSelect}
        />
      )}
    </div>
  );
};

export default LiveTV;
