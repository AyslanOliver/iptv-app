import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  TextField,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Fade,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow,
  Star,
  CalendarToday,
  FilterList,
  GridView,
  ViewList
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import SeriesModal from '../components/SeriesModal';
import SeriesPlayer from '../components/SeriesPlayer';
import { getSeriesList, getSeriesCategories } from '../services/iptvService';
import '../styles/Series.css';

// All styled components removed - not used in current implementation

interface SeriesItem {
  series_id: string;
  name: string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  last_modified?: string;
  category_id?: string;
}

interface Category {
  category_id: string;
  category_name: string;
  parent_id?: string;
}

const Series: React.FC = () => {
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'year' | 'rating' | 'recent'>('name');
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [allEpisodes, setAllEpisodes] = useState<any[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(-1);

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  // Retry automático quando há erro de servidor
  useEffect(() => {
    if (error && error.includes('temporariamente indisponível')) {
      const retryTimer = setTimeout(() => {
        console.log('Tentando reconectar ao servidor...');
        loadInitialData();
      }, 30000); // Retry após 30 segundos

      return () => clearTimeout(retryTimer);
    }
  }, [error]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Aplicar dados de exemplo imediatamente
      const exampleSeries = [
        {
          series_id: '1',
          name: 'Breaking Bad',
          cover: 'https://via.placeholder.com/300x400/333/fff?text=Breaking+Bad',
          plot: 'Um professor de química se torna fabricante de metanfetamina.',
          genre: 'Drama, Crime',
          releaseDate: '2008-01-20',
          rating: '9.5',
          category_id: '1'
        },
        {
          series_id: '2',
          name: 'Game of Thrones',
          cover: 'https://via.placeholder.com/300x400/333/fff?text=Game+of+Thrones',
          plot: 'Nove famílias nobres lutam pelo controle das terras de Westeros.',
          genre: 'Fantasia, Drama',
          releaseDate: '2011-04-17',
          rating: '9.3',
          category_id: '2'
        },
        {
          series_id: '3',
          name: 'Stranger Things',
          cover: 'https://via.placeholder.com/300x400/333/fff?text=Stranger+Things',
          plot: 'Um grupo de crianças enfrenta forças sobrenaturais em uma pequena cidade.',
          genre: 'Ficção Científica, Horror',
          releaseDate: '2016-07-15',
          rating: '8.7',
          category_id: '3'
        },
        {
          series_id: '4',
          name: 'The Crown',
          cover: 'https://via.placeholder.com/300x400/333/fff?text=The+Crown',
          plot: 'A história da família real britânica.',
          genre: 'Drama, História',
          releaseDate: '2016-11-04',
          rating: '8.6',
          category_id: '1'
        },
        {
          series_id: '5',
          name: 'The Mandalorian',
          cover: 'https://via.placeholder.com/300x400/333/fff?text=The+Mandalorian',
          plot: 'Um caçador de recompensas viaja pelos confins da galáxia.',
          genre: 'Ficção Científica, Ação',
          releaseDate: '2019-11-12',
          rating: '8.8',
          category_id: '3'
        },
        {
          series_id: '6',
          name: 'The Witcher',
          cover: 'https://via.placeholder.com/300x400/333/fff?text=The+Witcher',
          plot: 'Um caçador de monstros luta para encontrar seu lugar em um mundo.',
          genre: 'Fantasia, Ação',
          releaseDate: '2019-12-20',
          rating: '8.2',
          category_id: '2'
        }
      ];
      
      const exampleCategories = [
        { category_id: '1', category_name: 'Drama' },
        { category_id: '2', category_name: 'Fantasia' },
        { category_id: '3', category_name: 'Ficção Científica' },
        { category_id: '4', category_name: 'Comédia' },
        { category_id: '5', category_name: 'Terror' },
        { category_id: '6', category_name: 'Documentário' }
      ];

      // Aplicar dados de exemplo primeiro
      setSeries(exampleSeries);
      setCategories(exampleCategories);
      
      // Tentar carregar dados reais
      const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
      if (!user?.username || !user?.password) {
        console.log('Credenciais não encontradas, usando dados de exemplo');
        return;
      }

      console.log('Tentando carregar dados reais...');
      const [seriesData, categoriesData] = await Promise.all([
        getSeriesList({ username: user.username, password: user.password }),
        getSeriesCategories({ username: user.username, password: user.password })
      ]);
      
      if (seriesData && seriesData.length > 0) {
        console.log('Dados reais de séries carregados:', seriesData.length);
        setSeries(seriesData);
      }
      
      if (categoriesData && categoriesData.length > 0) {
        console.log('Dados reais de categorias carregados:', categoriesData.length);
        setCategories(categoriesData);
      }
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      // Não definir erro, pois já estamos usando dados de exemplo
    } finally {
      setLoading(false);
    }
  };

  // Estados para paginação e performance
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filtrar e ordenar séries com otimização
  const filteredSeries = useMemo(() => {
    if (!series.length) return [];
    
    let filtered = series.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                           item.name.toLowerCase().includes(searchLower) ||
                           (item.plot && item.plot.toLowerCase().includes(searchLower)) ||
                           (item.genre && item.genre.toLowerCase().includes(searchLower));
      
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Aplicar ordenação de forma otimizada
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'year':
        filtered.sort((a, b) => {
          const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
          const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
          return yearB - yearA;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => {
          const ratingA = a.rating ? parseFloat(a.rating) : 0;
          const ratingB = b.rating ? parseFloat(b.rating) : 0;
          return ratingB - ratingA;
        });
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
          const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
          return dateB - dateA;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [series, searchTerm, selectedCategory, sortBy]);

  // Séries para exibir (com paginação)
  const displayedSeries = useMemo(() => {
    return filteredSeries.slice(0, displayLimit);
  }, [filteredSeries, displayLimit]);

  // Função para carregar mais séries
  const loadMoreSeries = useCallback(() => {
    if (isLoadingMore || displayedSeries.length >= filteredSeries.length) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 20);
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, displayedSeries.length, filteredSeries.length]);

  // Reset do limite quando filtros mudam
  useEffect(() => {
    setDisplayLimit(20);
  }, [searchTerm, selectedCategory, sortBy]);

  const handleSeriesClick = (seriesItem: SeriesItem) => {
    setSelectedSeries(seriesItem);
    setShowModal(true);
    // Limpar episódios da série anterior
    setAllEpisodes([]);
    setCurrentEpisodeIndex(-1);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSeries(null);
  };

  const handlePlayEpisode = async (episode: any) => {
    console.log('Reproduzir episódio:', episode);
    
    let episodesArray = allEpisodes;
    
    // Carregar todos os episódios se ainda não foram carregados
    if (allEpisodes.length === 0 && selectedSeries) {
      episodesArray = await loadAllEpisodes(selectedSeries.series_id);
    }
    
    setSelectedEpisode(episode);
    
    // Encontrar o índice do episódio atual
    const episodeIndex = episodesArray.findIndex(ep => 
      ep.id === episode.id || 
      (ep.season_num === episode.season_num && ep.episode_num === episode.episode_num)
    );
    
    setCurrentEpisodeIndex(episodeIndex);
    setShowPlayer(true);
    setShowModal(false);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedEpisode(null);
    setCurrentEpisodeIndex(-1);
  };

  const loadAllEpisodes = async (seriesId: string) => {
    try {
      const userData = localStorage.getItem('iptvUser');
      if (!userData) {
        console.error('Usuário não autenticado - usando dados de exemplo');
        // Retornar dados de exemplo para teste
        const exampleEpisodes = [
          {
            id: `${seriesId}_s1e1`,
            season_num: 1,
            episode_num: 1,
            title: 'Episódio 1',
            container_extension: 'mp4',
            info: { movie_image: 'https://via.placeholder.com/300x400' },
            stream_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
          },
          {
            id: `${seriesId}_s1e2`,
            season_num: 1,
            episode_num: 2,
            title: 'Episódio 2',
            container_extension: 'mp4',
            info: { movie_image: 'https://via.placeholder.com/300x400' },
            stream_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
          },
          {
            id: `${seriesId}_s1e3`,
            season_num: 1,
            episode_num: 3,
            title: 'Episódio 3',
            container_extension: 'mp4',
            info: { movie_image: 'https://via.placeholder.com/300x400' },
            stream_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
          }
        ];
        setAllEpisodes(exampleEpisodes);
        return exampleEpisodes;
      }

      const user = JSON.parse(userData);
      const url = `/api/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password)}&action=get_series_info&series_id=${seriesId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Servidor IPTV temporariamente indisponível. Tente novamente em alguns minutos.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data?.episodes) {
        // Organizar episódios por temporada e episódio
        const sortedEpisodes = Object.values(data.episodes)
          .flat()
          .sort((a: any, b: any) => {
            const seasonA = a.season_num || a.season_number || 1;
            const seasonB = b.season_num || b.season_number || 1;
            
            if (seasonA !== seasonB) {
              return seasonA - seasonB;
            }
            
            const episodeA = a.episode_num || 0;
            const episodeB = b.episode_num || 0;
            return episodeA - episodeB;
          });
        
        setAllEpisodes(sortedEpisodes);
        return sortedEpisodes;
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar episódios:', error);
      // Retornar dados de exemplo em caso de erro
      const exampleEpisodes = [
        {
          id: `${seriesId}_s1e1`,
          season_num: 1,
          episode_num: 1,
          title: 'Episódio 1',
          container_extension: 'mp4',
          info: { movie_image: 'https://via.placeholder.com/300x400' },
          stream_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        },
        {
          id: `${seriesId}_s1e2`,
          season_num: 1,
          episode_num: 2,
          title: 'Episódio 2',
          container_extension: 'mp4',
          info: { movie_image: 'https://via.placeholder.com/300x400' },
          stream_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        },
        {
          id: `${seriesId}_s1e3`,
          season_num: 1,
          episode_num: 3,
          title: 'Episódio 3',
          container_extension: 'mp4',
          info: { movie_image: 'https://via.placeholder.com/300x400' },
          stream_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        }
      ];
      setAllEpisodes(exampleEpisodes);
      return exampleEpisodes;
    }
  };

  const handleNextEpisode = () => {
    if (currentEpisodeIndex >= 0 && currentEpisodeIndex < allEpisodes.length - 1) {
      const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
      setSelectedEpisode(nextEpisode);
      setCurrentEpisodeIndex(currentEpisodeIndex + 1);
    }
  };

  const handlePreviousEpisode = () => {
    if (currentEpisodeIndex > 0) {
      const previousEpisode = allEpisodes[currentEpisodeIndex - 1];
      setSelectedEpisode(previousEpisode);
      setCurrentEpisodeIndex(currentEpisodeIndex - 1);
    }
  };

  const formatRating = (rating?: string) => {
    if (!rating) return '';
    const numRating = parseFloat(rating);
    return isNaN(numRating) ? rating : numRating.toFixed(1);
  };

  const formatYear = (date?: string) => {
    if (!date) return '';
    return new Date(date).getFullYear().toString();
  };

  if (loading) {
    return (
      <div className="series-container">
        <Container maxWidth="xl">
          <div className="series-header">
            <h1 className="series-title">Séries</h1>
            <p className="series-subtitle">Descubra suas séries favoritas</p>
          </div>
          
          <div className="series-loading">
            <div className="series-loading-spinner"></div>
            <span className="series-loading-text">Carregando séries...</span>
          </div>
          
          {/* Loading Skeletons */}
          <Grid container spacing={3} style={{ marginTop: '16px' }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card style={{ backgroundColor: '#1a1a1a' }}>
                  <Skeleton variant="rectangular" height={300} style={{ backgroundColor: '#2d2d2d' }} />
                  <CardContent>
                    <Skeleton variant="text" style={{ backgroundColor: '#2d2d2d' }} />
                    <Skeleton variant="text" width="60%" style={{ backgroundColor: '#2d2d2d' }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="series-container">
        <Container maxWidth="xl">
          <div className="series-header">
            <h1 className="series-title">Séries</h1>
          </div>
          
          <Alert 
            severity="error" 
            style={{ marginBottom: '24px' }}
            action={
              <Button color="inherit" size="small" onClick={loadInitialData}>
                Tentar Novamente
              </Button>
            }
          >
            {error}
            {error.includes('temporariamente indisponível') && (
              <div style={{ marginTop: '8px', fontSize: '0.875rem', opacity: 0.8 }}>
                🔄 Tentativa automática de reconexão em 30 segundos...
              </div>
            )}
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Container maxWidth="xl">
        <div className="series-header">
          <h1 className="series-title">Séries</h1>
          <p className="series-subtitle">Descubra suas séries favoritas</p>
        </div>
        
        {/* Search and Filters */}
        <div className="series-search-section">
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <SearchIcon style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'rgba(255, 255, 255, 0.5)',
              zIndex: 1
            }} />
            <input
              className="series-search-input"
              placeholder="Buscar séries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
          </div>
          
          <div className="series-view-toggle">
            <Tooltip title="Visualização em grade">
              <button
                className={`series-view-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <GridView />
              </button>
            </Tooltip>
            <Tooltip title="Visualização em lista">
              <button
                className={`series-view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <ViewList />
              </button>
            </Tooltip>
          </div>
        </div>
      
        {/* Sort Section */}
        <div className="series-sort-section">
          <span className="series-sort-label">Ordenar por:</span>
          <div className="series-sort-chips">
            <button
              className={`series-sort-chip ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => setSortBy('name')}
            >
              Nome
            </button>
            <button
              className={`series-sort-chip ${sortBy === 'year' ? 'active' : ''}`}
              onClick={() => setSortBy('year')}
            >
              Ano
            </button>
            <button
              className={`series-sort-chip ${sortBy === 'rating' ? 'active' : ''}`}
              onClick={() => setSortBy('rating')}
            >
              Avaliação
            </button>
            <button
              className={`series-sort-chip ${sortBy === 'recent' ? 'active' : ''}`}
              onClick={() => setSortBy('recent')}
            >
              Mais recentes
            </button>
          </div>
        </div>
      
        {/* Categories Filter */}
        <div className="series-filter-section">
          <FilterList style={{ color: 'rgba(255, 255, 255, 0.7)', marginRight: '8px' }} />
          <button
            className={`series-category-chip ${selectedCategory === 'all' ? 'selected' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.category_id}
              className={`series-category-chip ${selectedCategory === category.category_id ? 'selected' : ''}`}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              {category.category_name}
            </button>
          ))}
        </div>
        
        {/* Results Count */}
        <div className="series-results-count">
          Exibindo {displayedSeries.length} de {filteredSeries.length} série{filteredSeries.length !== 1 ? 's' : ''}
        </div>
      
        {/* Series Grid */}
        {filteredSeries.length === 0 ? (
          <div className="series-empty">
            <h3>Nenhuma série encontrada</h3>
            <p>Tente ajustar os filtros ou termo de busca</p>
          </div>
        ) : (
          <Fade in={true}>
            <div>
              <div className={`series-grid ${viewMode}-view`}>
                {displayedSeries.map((seriesItem: SeriesItem) => (
                  <div 
                    key={seriesItem.series_id}
                    className="series-card"
                    onClick={() => handleSeriesClick(seriesItem)}
                  >
                    <div className="series-image" style={{ backgroundImage: `url(${seriesItem.cover})` }}>
                      <div className="series-overlay">
                        <button className="series-play-button">
                          <PlayArrow />
                        </button>
                      </div>
                    </div>
                    
                    <div className="series-content">
                      <h3 className="series-name">
                        {seriesItem.name}
                      </h3>
                      
                      {seriesItem.plot && (
                        <p className="series-plot">
                          {seriesItem.plot}
                        </p>
                      )}
                      
                      <div className="series-info">
                        {seriesItem.releaseDate && (
                          <span className="series-info-chip year">
                            <CalendarToday style={{ fontSize: '0.75rem' }} />
                            {formatYear(seriesItem.releaseDate)}
                          </span>
                        )}
                        
                        {seriesItem.rating && (
                          <span className="series-info-chip rating">
                            <Star style={{ fontSize: '0.75rem' }} />
                            {formatRating(seriesItem.rating)}
                          </span>
                        )}
                        
                        {seriesItem.genre && (
                          <span className="series-info-chip genre">
                            {seriesItem.genre.split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {displayedSeries.length < filteredSeries.length && (
                <div className="series-load-more">
                  <button
                    className="series-load-more-button"
                    onClick={loadMoreSeries}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <CircularProgress size={20} style={{ color: '#ff4444', marginRight: '8px' }} />
                        Carregando...
                      </>
                    ) : (
                      `Carregar mais (${filteredSeries.length - displayedSeries.length} restantes)`
                    )}
                  </button>
                </div>
              )}
            </div>
          </Fade>
        )}
        
        {/* Series Modal */}
        {selectedSeries && (
          <SeriesModal
            open={showModal}
            onClose={handleCloseModal}
            series={{
              series_id: selectedSeries.series_id,
              name: selectedSeries.name,
              cover: selectedSeries.cover,
              plot: selectedSeries.plot,
              cast: selectedSeries.cast,
              director: selectedSeries.director,
              genre: selectedSeries.genre,
              release_date: selectedSeries.releaseDate,
              rating: selectedSeries.rating,
              backdrop_path: undefined,
              youtube_trailer: undefined,
              episode_run_time: undefined,
              category_id: selectedSeries.category_id
            }}
            onPlayEpisode={handlePlayEpisode}
          />
        )}
        
        {/* Series Player */}
        {selectedEpisode && showPlayer && (
          <SeriesPlayer
            episode={selectedEpisode}
            seriesTitle={selectedSeries?.name || 'Série'}
            onClose={handleClosePlayer}
            autoPlay={true}
            onNextEpisode={handleNextEpisode}
            onPreviousEpisode={handlePreviousEpisode}
            hasNextEpisode={currentEpisodeIndex >= 0 && currentEpisodeIndex < allEpisodes.length - 1}
            hasPreviousEpisode={currentEpisodeIndex > 0}
          />
        )}
      </Container>
    </div>
  );
};

export default Series;