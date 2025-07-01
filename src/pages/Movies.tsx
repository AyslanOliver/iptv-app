import React, { useState, useEffect, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Grid, Card, CardContent, Typography, TextField, IconButton, Rating, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Icon from '../components/Icon';
import MovieModal from '../components/MovieModal';
import '../styles/Movies.css';

const MovieCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  cursor: 'pointer',
  borderRadius: '16px',
  overflow: 'hidden',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.2)',
    '& .movie-image': {
      transform: 'scale(1.1)',
    },
    '& .movie-overlay': {
      opacity: 1,
    }
  },
}));

const MovieImage = styled('div')(({ theme }) => ({
  width: '100%',
  height: '350px',
  position: 'relative',
  backgroundColor: theme.palette.grey[900],
  borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
  overflow: 'hidden',
}));

const FavoriteButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 12,
  right: 12,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(10px)',
  color: theme.palette.error.main,
  width: '40px',
  height: '40px',
  border: '1px solid rgba(255,255,255,0.2)',
  transition: 'all 0.2s ease',
  padding: 8,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.1)',
    border: '1px solid rgba(255,255,255,0.4)',
  },
}));

const HeartIcon = () => <Icon icon={FaHeart} />;
const RegHeartIcon = () => <Icon icon={FaRegHeart} />;

interface Movie {
  stream_id: string;
  name: string;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

const MovieThumbnail: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    if (!error) {
      setError(true);
      setImgSrc('/noimg.png');
    }
  };

  return (
    <MovieImage>
      <img
        className="movie-image"
        src={imgSrc}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: error ? 'none' : 'block',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onError={handleError}
        loading="lazy"
      />
      {error && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/noimg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </MovieImage>
  );
};

interface Category {
  category_id: string;
  category_name: string;
}

const Movies: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(20);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Função para gerar dados de fallback para filmes
  const generateFallbackMovies = (): Movie[] => {
    const moviesByCategory = {
      '1': ['Missão Impossível: Protocolo Fantasma', 'Velozes e Furiosos 9', 'John Wick 4'],
      '2': ['As Branquelas', 'Todo Mundo em Pânico', 'Se Beber, Não Case'],
      '3': ['O Poderoso Chefão', 'Cidade de Deus', 'Parasita'],
      '4': ['Blade Runner 2049', 'Matrix Resurrections', 'Duna'],
      '5': ['O Exorcista', 'Invocação do Mal', 'Hereditário'],
      '6': ['Titanic', 'Diário de uma Paixão', 'La La Land'],
      '7': ['Planeta Terra', 'Free Solo', 'Meu Professor Polvo'],
      '8': ['Toy Story 4', 'Frozen 2', 'Encanto']
    };

    const allMovies: Movie[] = [];
    
    Object.entries(moviesByCategory).forEach(([categoryId, titles]) => {
      titles.forEach((title, index) => {
        allMovies.push({
          stream_id: `fallback_${categoryId}_${index + 1}`,
          name: title,
          stream_icon: '/noimg.png',
          rating: (7.0 + Math.random() * 2.5).toFixed(1),
          rating_5based: 3.5 + (Math.random() * 1.5),
          added: String(Math.floor(Date.now() / 1000) - (Math.random() * 31536000)),
          category_id: categoryId,
          container_extension: 'mp4',
          custom_sid: '',
          direct_source: ''
        });
      });
    });

    return allMovies;
  };

  // Função para gerar categorias de fallback
  const generateFallbackCategories = (): Category[] => {
    return [
      { category_id: '1', category_name: 'Ação' },
      { category_id: '2', category_name: 'Comédia' },
      { category_id: '3', category_name: 'Drama' },
      { category_id: '4', category_name: 'Ficção Científica' },
      { category_id: '5', category_name: 'Terror' },
      { category_id: '6', category_name: 'Romance' },
      { category_id: '7', category_name: 'Documentário' },
      { category_id: '8', category_name: 'Animação' }
    ];
  };

  const toggleFavorite = (streamId: string) => {
    const newFavorites = favorites.includes(streamId)
      ? favorites.filter(id => id !== streamId)
      : [...favorites, streamId];
    setFavorites(newFavorites);
    localStorage.setItem('movieFavorites', JSON.stringify(newFavorites));
  };

  useEffect(() => {
    const loadFavorites = () => {
      const savedFavorites = localStorage.getItem('movieFavorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Aplicar dados de fallback imediatamente
        const fallbackMovies = generateFallbackMovies();
        setMovies(fallbackMovies);
        console.log('Dados de fallback aplicados para filmes:', fallbackMovies.length, 'filmes');
        
        const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
        if (!user?.username || !user?.password) {
          navigate('/login');
          return;
        }

        console.log('Tentando carregar filmes reais...');
        const response = await fetch(
          `http://zeusodin.online/player_api.php?username=${user.username}&password=${user.password}&action=get_vod_streams`
        );

        if (!response.ok) {
          throw new Error(`Falha ao carregar os filmes: ${response.status}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('Filmes reais carregados:', data.length, 'filmes');
          setMovies(data);
          toast.success(`${data.length} filmes carregados com sucesso!`);
        } else {
          console.log('Nenhum filme real encontrado, mantendo dados de fallback');
          toast.info('Usando dados de exemplo - verifique sua conexão');
        }
      } catch (err) {
        console.error('Erro ao carregar filmes:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        toast.error('Erro ao carregar filmes - usando dados de exemplo');
        // Manter dados de fallback em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [navigate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Aplicar categorias de fallback imediatamente
        const fallbackCategories = generateFallbackCategories();
        setCategories(fallbackCategories);
        console.log('Categorias de fallback aplicadas:', fallbackCategories.length, 'categorias');
        
        const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
        if (!user?.username || !user?.password) {
          navigate('/login');
          return;
        }

        console.log('Tentando carregar categorias reais...');
        const response = await fetch(
          `http://zeusodin.online/player_api.php?username=${user.username}&password=${user.password}&action=get_vod_categories`
        );

        if (!response.ok) {
          throw new Error(`Falha ao carregar as categorias: ${response.status}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('Categorias reais carregadas:', data.length, 'categorias');
          setCategories(data);
        } else {
          console.log('Nenhuma categoria real encontrada, mantendo dados de fallback');
        }
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
        // Manter categorias de fallback em caso de erro
      }
    };

    fetchCategories();
  }, [navigate]);

  const filteredMovies = useMemo(() => {
    const filtered = movies.filter(movie =>
      (selectedCategory === 'all' || movie.category_id === selectedCategory) &&
      movie.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.slice(0, displayLimit);
  }, [movies, selectedCategory, searchTerm, displayLimit]);

  const totalFilteredCount = useMemo(() => {
    return movies.filter(movie =>
      (selectedCategory === 'all' || movie.category_id === selectedCategory) &&
      movie.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
  }, [movies, selectedCategory, searchTerm]);

  const loadMore = () => {
    setDisplayLimit(prev => prev + 20);
  };

  // Reset display limit when category or search changes
  useEffect(() => {
    setDisplayLimit(20);
  }, [selectedCategory, searchTerm]);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handlePlayerClose = () => {
    setSelectedMovie(null);
  };

  return (
    <Box className="movies-page" sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Box
        className="sidebar"
        sx={{
          width: 280,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto'
        }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            🎬 Filmes
          </Typography>
        </Box>
        
        <Box sx={{ p: 2 }}>
          <TextField
            className="search-field"
            fullWidth
            variant="outlined"
            placeholder="Buscar filmes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ mb: 3 }}
          />
          
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Categorias
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Card
              onClick={() => setSelectedCategory('all')}
              sx={{
                cursor: 'pointer',
                bgcolor: selectedCategory === 'all' ? 'primary.main' : 'transparent',
                color: selectedCategory === 'all' ? 'white' : 'text.primary',
                p: 2,
                transition: 'all 0.2s ease',
                border: selectedCategory === 'all' ? 'none' : '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: selectedCategory === 'all' ? 'primary.dark' : 'action.hover',
                }
              }}
            >
              <Typography>📁 Todas as Categorias</Typography>
              <Typography variant="caption" color="text.secondary">
                {movies.length} filmes
              </Typography>
            </Card>
            {categories.map((category) => {
              return (
                <Card
                  key={category.category_id}
                  onClick={() => setSelectedCategory(category.category_id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selectedCategory === category.category_id ? 'primary.main' : 'transparent',
                    color: selectedCategory === category.category_id ? 'white' : 'text.primary',
                    p: 2,
                    transition: 'all 0.2s ease',
                    border: selectedCategory === category.category_id ? 'none' : '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: selectedCategory === category.category_id ? 'primary.dark' : 'action.hover',
                    }
                  }}
                >
                  <Typography noWrap>{category.category_name}</Typography>
                  <Typography variant="caption" color={selectedCategory === category.category_id ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
                    {movies.filter(movie => movie.category_id === category.category_id).length} filmes
                  </Typography>
                </Card>
              );
            })}
          </Box>
        </Box>
      </Box>
      
      {/* Main Content */}
      <Box className="main-content" sx={{ marginLeft: '280px', flex: 1, p: 3 }}>

        {/* Cabeçalho da seção principal */}
        <Box className="section-header" sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {selectedCategory === 'all' ? 'Todos os Filmes' : categories.find(c => c.category_id === selectedCategory)?.category_name || 'Filmes'}
              {loading && (
                <Typography component="span" sx={{ ml: 2, fontSize: '0.8rem', color: 'primary.main' }}>
                  🔄 Carregando...
                </Typography>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mostrando {filteredMovies.length} de {totalFilteredCount} {totalFilteredCount === 1 ? 'filme' : 'filmes'}
              {error && (
                <Typography component="span" sx={{ ml: 2, color: 'warning.main' }}>
                  ⚠️ Usando dados de exemplo
                </Typography>
              )}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Ordenar por:
            </Typography>
            <Card className="sort-card" sx={{ p: 1, minWidth: 120 }}>
              <Typography variant="body2">Mais recentes</Typography>
            </Card>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {filteredMovies.map((movie) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={movie.stream_id}>
              <MovieCard className="movie-card" onClick={() => handleMovieClick(movie)}>
                <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                  <MovieThumbnail src={movie.stream_icon} alt={movie.name} />
                  
                  {/* Overlay com gradiente */}
                   <Box className="movie-overlay">
                     <Box className="play-button">
                       <Typography variant="h4" sx={{ color: 'white' }}>▶</Typography>
                     </Box>
                   </Box>
                  
                  <FavoriteButton
                     className="favorite-button"
                     onClick={(e) => {
                       e.stopPropagation();
                       toggleFavorite(movie.stream_id);
                     }}
                   >
                    {favorites.includes(movie.stream_id) ? <HeartIcon /> : <RegHeartIcon />}
                  </FavoriteButton>
                </Box>
                
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 2.5 }}>
                  <Typography 
                    variant="h6" 
                    noWrap 
                    sx={{ 
                      fontWeight: 600, 
                      mb: 1,
                      fontSize: '1.1rem'
                    }}
                  >
                    {movie.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={movie.rating_5based} readOnly size="small" />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {movie.rating_5based.toFixed(1)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                       {movie.added ? new Date(Number(movie.added) * 1000).getFullYear() : 'N/A'}
                     </Typography>
                  </Box>
                </CardContent>
              </MovieCard>
            </Grid>
          ))}
        </Grid>

        {/* Botão Carregar Mais */}
        {filteredMovies.length < totalFilteredCount && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button 
              variant="outlined" 
              onClick={loadMore}
              sx={{ px: 4, py: 1.5 }}
            >
              Carregar mais filmes ({totalFilteredCount - filteredMovies.length} restantes)
            </Button>
          </Box>
        )}

        <MovieModal movie={selectedMovie} onClose={handlePlayerClose} />
      </Box>
    </Box>
  );
};

export default Movies;