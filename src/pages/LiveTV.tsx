import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { getEpgData, generateCatchupUrl, formatToXmltvUtc } from '../services/iptvService';
import '../styles/LiveTV.css';

interface Channel {
  stream_id: string;
  id: string;
  name: string;
  category_id?: string;
  stream_url?: string;
  stream_icon?: string;
  [key: string]: any;
}

interface Category {
  category_id: string;
  category_name: string;
}

const LiveTV = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [epgData, setEpgData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingEpg, setIsLoadingEpg] = useState(false);
  const navigate = useNavigate();



  // Função para formatar horários
  const formatTime = (timestamp: number): string => {
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
      const user = JSON.parse(userData);
      const credentials = { username: user.username, password: user.password };
      
      console.log('🔄 Carregando dados EPG...');
      const data = await getEpgData(credentials);
      setEpgData(data);
      console.log('✅ EPG carregado:', Object.keys(data).length, 'canais');
    } catch (error) {
      console.error('❌ Erro ao carregar EPG:', error);
    } finally {
      setIsLoadingEpg(false);
    }
  };

  // Função para obter programa atual e próximo
  const getCurrentAndNextProgram = (channel: Channel) => {
    const channelEpg = epgData[channel.stream_id] || [];
    const now = Date.now() / 1000;
    
    let currentProgram = null;
    let nextProgram = null;
    
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
  const playCatchup = (channel: Channel, program: any) => {
    const userData = localStorage.getItem('iptvUser');
    if (!userData) {
      console.error('❌ Dados do usuário não encontrados');
      return;
    }

    try {
      const user = JSON.parse(userData);
      const credentials = { username: user.username, password: user.password };
      
      if (!credentials.username || !credentials.password) {
        console.error('❌ Credenciais inválidas');
        return;
      }
      
      const utcStart = formatToXmltvUtc(program.startTime);
      const duration = Math.ceil((program.stopTime - program.startTime) / 60); // em minutos
      
      const catchupUrl = generateCatchupUrl(credentials, channel.stream_id, utcStart, duration);
      
      console.log('🎬 Reproduzindo catchup:', {
        channel: channel.name,
        program: program.title,
        inicio: new Date(program.startTime * 1000).toLocaleString(),
        duracao: duration + ' minutos',
        url: catchupUrl
      });
      
      // Substituir a URL do canal atual com informações de catchup
      setSelectedChannel({
        ...channel,
        stream_url: catchupUrl,
        isCatchup: true,
        catchupProgram: program
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar catchup:', error);
    }
  };

    // Buscar categorias (apenas uma vez)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const userData = localStorage.getItem('iptvUser');
        if (!userData) {
          navigate('/login');
          return;
        }

        const user = JSON.parse(userData);
        if (!user || !user.username || !user.password) {
          navigate('/login');
          return;
        }

        const categoriesUrl = `/api/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password)}&action=get_live_categories`;

        const categoriesResponse = await fetch(categoriesUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!categoriesResponse.ok) {
          throw new Error(`Falha ao carregar categorias: ${categoriesResponse.status}`);
        }

        const categoriesData = await categoriesResponse.json();

        const formattedCategories = Array.isArray(categoriesData) ? categoriesData
          .filter(cat => cat && cat.category_id && cat.category_name)
          .map(cat => ({
            category_id: cat.category_id.toString(),
            category_name: cat.category_name
          })) : [];

        setCategories(formattedCategories);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      }
    };

    fetchCategories();
  }, [navigate]);

  // Buscar canais (inicial e quando categoria muda)
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Só mostra loading na primeira vez
        if (channels.length === 0) {
          setLoading(true);
        }
        setError(null);
        
        const userData = localStorage.getItem('iptvUser');
        if (!userData) {
          navigate('/login');
          return;
        }

        const user = JSON.parse(userData);
        if (!user || !user.username || !user.password) {
          navigate('/login');
          return;
        }

        const channelsUrl = `/api/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password)}&action=get_live_streams${selectedCategory !== 'all' ? `&category_id=${selectedCategory}` : ''}`;

        const channelsResponse = await fetch(channelsUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!channelsResponse.ok) {
          throw new Error(`Falha ao carregar canais: ${channelsResponse.status}`);
        }

        const channelsData = await channelsResponse.json();

        const formattedChannels = Array.isArray(channelsData) ? channelsData
          .filter(channel => channel && channel.stream_id)
          .map(channel => ({
            ...channel,
            category_id: channel.category_id?.toString() || '',
            stream_url: channel.stream_url || '',
            stream_icon: channel.stream_icon || ''
          })) : [];

        setChannels(formattedChannels);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar os canais. Por favor, verifique sua conexão e tente novamente.');
        setLoading(false);
      }
    };

    fetchChannels();
  }, [selectedCategory, navigate, channels.length]);

  // Carregar EPG quando os canais estiverem disponíveis
  useEffect(() => {
    if (channels.length > 0) {
      loadEpgData();
    }
  }, [channels]);

    // Carregar favoritos do localStorage
  useEffect(() => {
    const loadFavorites = () => {
      try {
        const favs = localStorage.getItem('favoriteChannels');
        if (favs) {
          const parsed = JSON.parse(favs);
          const validFavs = Array.isArray(parsed) ? parsed.filter(fav => fav && fav.stream_id) : [];
          setFavorites(validFavs);
          
          // Limpar localStorage se os dados estavam corrompidos
          if (validFavs.length !== parsed.length) {
            localStorage.setItem('favoriteChannels', JSON.stringify(validFavs));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar favoritos:', err);
        localStorage.removeItem('favoriteChannels');
        setFavorites([]);
      }
    };
    
    loadFavorites();
  }, []);

  // Gerenciar favoritos
  const toggleFavorite = useCallback((channel: Channel) => {
    if (!channel || !channel.stream_id) return;
    
    setFavorites(prev => {
      const isFavorite = prev.some(fav => fav.stream_id === channel.stream_id);
      const newFavorites = isFavorite
        ? prev.filter(fav => fav.stream_id !== channel.stream_id)
        : [...prev, channel];
      
      try {
        localStorage.setItem('favoriteChannels', JSON.stringify(newFavorites));
      } catch (err) {
        console.error('Erro ao salvar favoritos:', err);
      }
      
      return newFavorites;
    });
  }, []);

  // Verificar se um canal é favorito
  const isFavorite = useCallback((channel: Channel) => {
    return favorites.some(fav => fav.stream_id === channel.stream_id);
  }, [favorites]);

  // Filtrar canais
  const filteredChannels = useCallback(() => {
    let filtered = channels.filter(c => c && c.stream_id && c.name);
    
    if (selectedCategory === 'favorites') {
      return favorites
        .map(fav => channels.find(c => c.stream_id === fav.stream_id))
        .filter((channel): channel is Channel => Boolean(channel));
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(channel => channel.category_id === selectedCategory);
    }
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(channel =>
        channel.name.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [channels, selectedCategory, favorites, searchTerm]);

  // Selecionar canal
  const handleChannelSelect = useCallback((channel: Channel) => {
    if (!channel || !channel.stream_id) return;
    
    // Construir URL completa do stream para canais de TV ao vivo
    const userData = localStorage.getItem('iptvUser');
    if (userData) {
      const user = JSON.parse(userData);
      if (user && user.username && user.password) {
        // Tentar múltiplas URLs como fallback usando proxy para evitar CORS
        const possibleUrls = [
          `/stream/live/${user.username}/${user.password}/${channel.stream_id}.m3u8`,
          `/stream/${user.username}/${user.password}/${channel.stream_id}`,
          channel.stream_url // URL original do canal, se existir
        ].filter(url => url && url.trim() !== '');
        
        const channelWithUrl = {
          ...channel,
          stream_url: possibleUrls[0], // Usar a primeira URL disponível
          fallback_urls: possibleUrls.slice(1) // Guardar as outras como fallback
        };
        setSelectedChannel(channelWithUrl);
        return;
      }
    }
    
    // Se não conseguir construir URL, usar a URL original do canal
    if (channel.stream_url && channel.stream_url.trim() !== '') {
      setSelectedChannel(channel);
    } else {
      // Canal sem URL válida
      const channelWithError = {
        ...channel,
        stream_url: '',
        error: 'URL não disponível para este canal'
      };
      setSelectedChannel(channelWithError);
    }
  }, []);

  // Limpar busca
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Renderizar ícone de busca

  if (loading) {
    return (
      <div className={`livetv-container ${selectedChannel ? 'with-player' : ''}`}>
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Carregando canais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`livetv-container ${selectedChannel ? 'with-player' : ''}`}>
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
    <div className={`livetv-container ${selectedChannel ? 'with-player' : ''}`}>
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
            <svg className="category-icon" fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <span>Todos os Canais</span>
          </button>
          
          <button
            className={`category-sidebar-item ${selectedCategory === 'favorites' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('favorites')}
          >
            <svg className="category-icon" fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span>Favoritos ({favorites.length})</span>
          </button>
          
          {categories.map(category => (
            <button
              key={category.category_id}
              className={`category-sidebar-item ${selectedCategory === category.category_id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              <svg className="category-icon" fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" />
              </svg>
              <span>{category.category_name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className={`main-content ${selectedChannel ? 'with-player' : ''}`}>
        {/* Header com busca */}
        <div className="header-section">
          <div className="search-box">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar canais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="clear-search">
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
                      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="tvGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#007bff" />
                            <stop offset="100%" stopColor="#0056b3" />
                          </linearGradient>
                        </defs>
                        <rect x="2" y="3" width="20" height="14" rx="3" stroke="url(#tvGradient)" strokeWidth="2" fill="rgba(0, 123, 255, 0.1)"/>
                        <path d="M8 21l8 0" stroke="url(#tvGradient)" strokeWidth="2"/>
                        <path d="M12 17l0 4" stroke="url(#tvGradient)" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" fill="url(#tvGradient)"/>
                        <rect x="6" y="6" width="4" height="2" rx="1" fill="rgba(0, 123, 255, 0.3)"/>
                        <rect x="14" y="6" width="4" height="2" rx="1" fill="rgba(0, 123, 255, 0.3)"/>
                        <rect x="6" y="13" width="12" height="1" rx="0.5" fill="rgba(0, 123, 255, 0.3)"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Informações do canal */}
                <div className="channel-info">
                  <div className="channel-main-info">
                    <h4 className="channel-name">{channel.name}</h4>
                    <p className="channel-category">
                      {categories.find(c => c.category_id === channel.category_id)?.category_name || 'TV'}
                    </p>
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
                          <div className="program-current">
                            {current ? (
                              <>
                                <span className="program-time">{formatTime(current.startTime)}</span>
                                <span className="program-separator"> - </span>
                                <span className="program-time">{formatTime(current.stopTime)}</span>
                                <span className="program-title">{current.title}</span>
                                <button 
                                  className="catchup-btn"
                                  onClick={() => playCatchup(channel, current)}
                                  title="Assistir desde o início"
                                >
                                  ⏮️
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="program-time">--:--</span>
                                <span className="program-separator"> - </span>
                                <span className="program-time">--:--</span>
                                <span className="program-title">Sem programação</span>
                              </>
                            )}
                          </div>
                          <div className="program-next">
                            {next ? (
                              <>
                                <span className="program-time">{formatTime(next.startTime)}</span>
                                <span className="program-separator"> - </span>
                                <span className="program-time">{formatTime(next.stopTime)}</span>
                                <span className="program-title">{next.title}</span>
                              </>
                            ) : (
                              <>
                                <span className="program-time">--:--</span>
                                <span className="program-separator"> - </span>
                                <span className="program-time">--:--</span>
                                <span className="program-title">Próximo programa</span>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="channel-actions">
                  <button
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(channel);
                    }}
                    title={isFavorite(channel) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    {isFavorite(channel) ? 
                      <svg className="favorite-icon active" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg> : 
                      <svg className="favorite-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    }
                  </button>
                  
                  <button
                    className="play-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChannelSelect(channel);
                    }}
                    title="Reproduzir canal"
                  >
                    <svg className="play-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredChannels().length === 0 && (
            <div className="no-channels">
              <p>
                {searchTerm ? 
                  `Nenhum canal encontrado para "${searchTerm}"` :
                  selectedCategory === 'favorites' ?
                    'Você ainda não tem canais favoritos' :
                    'Nenhum canal disponível nesta categoria'
                }
              </p>
              {searchTerm && (
                <button onClick={clearSearch} className="clear-search-button">
                  Limpar busca
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Player de vídeo */}
      {selectedChannel && (
        <div className="video-section">
          <div className="video-player-container">
            <div className="video-header">
              <div className="channel-info-header">
                <h3>{selectedChannel.name}</h3>
                <p>TV ao Vivo</p>
              </div>
              <button
                className="close-player"
                onClick={() => setSelectedChannel(null)}
                title="Fechar player"
              >
                ×
              </button>
            </div>
            
            {selectedChannel.stream_url ? (
              <VideoPlayer
                url={selectedChannel.stream_url}
                title={selectedChannel.name}
              />
            ) : (
              <div className="video-error">
                <div className="error-icon">⚠️</div>
                <h4>Stream Indisponível</h4>
                <p>
                  {(selectedChannel as any).error || 
                   'Este canal está temporariamente indisponível. Tente novamente mais tarde ou selecione outro canal.'}
                </p>
                <button 
                  onClick={() => handleChannelSelect(selectedChannel)}
                  className="retry-button"
                >
                  Tentar Novamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTV;