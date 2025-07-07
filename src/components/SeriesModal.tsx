import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Grid,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Tv as TvIcon,
  CalendarToday as CalendarIcon,
  Movie as MovieIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Interfaces
interface Episode {
  id: string;
  name: string;
  stream_url: string;
  episode_num?: number;
  season_num?: number;
  season_number?: number;
  season?: number;
  info?: {
    season_num?: number;
    episode_num?: number;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    release_date?: string;
    rating?: string;
    duration?: string;
  };
  added?: string;
  category_id?: string;
  container_extension?: string;
  custom_sid?: string;
  direct_source?: string;
  stream_icon?: string;
  title?: string;
}

interface Season {
  season_number: number;
  episodes: Episode[];
  episode_count: number;
  year?: string;
}

interface SeriesInfo {
  name: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  release_date?: string;
  rating?: string;
  backdrop_path?: string[];
  youtube_trailer?: string;
  episode_run_time?: string;
  category_id?: string;
}

interface SeriesModalProps {
  open: boolean;
  onClose: () => void;
  series: {
    series_id: string;
    name: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    release_date?: string;
    rating?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
    episode_run_time?: string;
    category_id?: string;
  } | null;
  onPlayEpisode: (episode: Episode) => void;
}

// Styled Components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '95vw',
    maxHeight: '95vh',
    width: '1200px',
    margin: theme.spacing(1),
    borderRadius: theme.spacing(2),
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
    color: '#ffffff',
  },
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
  borderRadius: `${theme.spacing(2)} ${theme.spacing(2)} 0 0`,
  color: '#ffffff',
}));

const InfoCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.spacing(1),
  color: '#ffffff',
}));

const SeasonAccordion = styled(Accordion)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: `${theme.spacing(1)} 0`,
  },
}));

const EpisodeItem = styled(ListItem)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.08)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
}));

const PlayButton = styled(IconButton)(({ theme }) => ({
  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
  color: '#ffffff',
  '&:hover': {
    background: 'linear-gradient(135deg, #ee5a24 0%, #ff6b6b 100%)',
    transform: 'scale(1.1)',
  },
  transition: 'all 0.3s ease',
}));

const SeriesModal: React.FC<SeriesModalProps> = ({ open, onClose, series, onPlayEpisode }) => {
  const [seriesData, setSeriesData] = useState<{ info: SeriesInfo; seasons: Season[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | false>(false);

  // Função para extrair número da temporada do título do episódio
  const extractSeasonFromTitle = (title: string): number => {
    const patterns = [
      /S(\d+)E\d+/i,           // S01E01
      /Season\s*(\d+)/i,       // Season 1
      /Temporada\s*(\d+)/i,    // Temporada 1
      /T(\d+)E\d+/i,           // T1E01
      /(\d+)ª\s*Temporada/i,   // 1ª Temporada
      /\[(\d+)\]/,             // [1]
      /\((\d+)\)/,             // (1)
      /(\d+)\s*-\s*/,          // 1 - 
      /(\d+)x\d+/i,            // 1x01
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 1; // Padrão para temporada 1
  };

  // Função para extrair temporada do episode_num (ex: 101 = temporada 1, 201 = temporada 2)
  const extractSeasonFromEpisodeNum = (episodeNum: number): number => {
    if (episodeNum >= 100) {
      return Math.floor(episodeNum / 100);
    }
    return 1;
  };

  // Função para determinar a temporada de um episódio
  const getEpisodeSeason = (episode: Episode): number => {
    // Prioridade 1: season_num ou season_number explícito
    if (episode.season_num) return episode.season_num;
    if (episode.season_number) return episode.season_number;
    if (episode.season) return episode.season;
    if (episode.info?.season_num) return episode.info.season_num;

    // Prioridade 2: Extrair do título
    if (episode.name) {
      const seasonFromTitle = extractSeasonFromTitle(episode.name);
      if (seasonFromTitle > 1) return seasonFromTitle;
    }

    // Prioridade 3: Extrair do episode_num
    if (episode.episode_num && episode.episode_num >= 100) {
      return extractSeasonFromEpisodeNum(episode.episode_num);
    }

    return 1; // Padrão
  };

  // Organizar episódios por temporada
  const organizeEpisodesBySeasons = (episodes: Episode[]): Season[] => {
    const seasonsMap = new Map<number, Episode[]>();

    episodes.forEach((episode) => {
      const seasonNumber = getEpisodeSeason(episode);
      
      if (!seasonsMap.has(seasonNumber)) {
        seasonsMap.set(seasonNumber, []);
      }
      seasonsMap.get(seasonNumber)!.push(episode);
    });

    // Converter para array de temporadas e ordenar
    const seasons: Season[] = Array.from(seasonsMap.entries())
      .map(([seasonNumber, episodes]) => ({
        season_number: seasonNumber,
        episodes: episodes.sort((a, b) => {
          const aNum = a.episode_num || 0;
          const bNum = b.episode_num || 0;
          return aNum - bNum;
        }),
        episode_count: episodes.length,
        year: episodes[0]?.info?.release_date?.split('-')[0] || new Date().getFullYear().toString()
      }))
      .sort((a, b) => a.season_number - b.season_number);

    return seasons;
  };

  // Carregar dados da série
  const loadSeriesData = async () => {
    if (!series?.series_id) return;

    setLoading(true);
    setError(null);

    try {
      // Obter credenciais do usuário logado
      const userData = localStorage.getItem('iptvUser');
      if (!userData) {
        throw new Error('Usuário não autenticado');
      }
      
      const user = JSON.parse(userData);
      if (!user.username || !user.password) {
        throw new Error('Credenciais inválidas');
      }

      const response = await fetch(`/api/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password)}&action=get_series_info&series_id=${series.series_id}`);
      
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Servidor IPTV temporariamente indisponível. Tente novamente em alguns minutos.');
        }
        throw new Error('Erro ao carregar dados da série');
      }

      const data = await response.json();
      
      if (!data.episodes || Object.keys(data.episodes).length === 0) {
        throw new Error('Nenhum episódio encontrado para esta série');
      }

      // Extrair todos os episódios
      const allEpisodes: Episode[] = [];
      Object.values(data.episodes).forEach((seasonEpisodes: any) => {
        if (Array.isArray(seasonEpisodes)) {
          allEpisodes.push(...seasonEpisodes);
        }
      });

      // Organizar por temporadas
      const seasons = organizeEpisodesBySeasons(allEpisodes);

      setSeriesData({
        info: data.info || {},
        seasons
      });

      // Expandir primeira temporada por padrão
      if (seasons.length > 0) {
        setExpandedSeason(`season-${seasons[0].season_number}`);
      }

    } catch (err) {
      console.error('Erro ao carregar série:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && series) {
      loadSeriesData();
    }
  }, [open, series]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSeason(isExpanded ? panel : false);
  };

  const handlePlayEpisode = (episode: Episode) => {
    onPlayEpisode(episode);
    onClose();
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return '';
    const minutes = parseInt(duration);
    if (isNaN(minutes)) return duration;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatRating = (rating?: string) => {
    if (!rating) return '';
    const num = parseFloat(rating);
    return isNaN(num) ? rating : `${num.toFixed(1)}/10`;
  };

  if (!series) return null;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
    >
      <HeaderSection>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
              {series.name}
            </Typography>
            
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
              {series.genre && (
                <Chip 
                  icon={<MovieIcon />} 
                  label={series.genre} 
                  size="small" 
                  sx={{ background: 'rgba(255, 255, 255, 0.2)' }}
                />
              )}
              {series.release_date && (
                <Chip 
                  icon={<CalendarIcon />} 
                  label={series.release_date.split('-')[0]} 
                  size="small" 
                  sx={{ background: 'rgba(255, 255, 255, 0.2)' }}
                />
              )}
              {series.rating && (
                <Chip 
                  label={formatRating(series.rating)} 
                  size="small" 
                  sx={{ background: 'rgba(255, 255, 255, 0.2)' }}
                />
              )}
              {series.episode_run_time && (
                <Chip 
                  label={formatDuration(series.episode_run_time)} 
                  size="small" 
                  sx={{ background: 'rgba(255, 255, 255, 0.2)' }}
                />
              )}
            </Stack>

            {series.plot && (
              <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                {series.plot}
              </Typography>
            )}
          </Box>

          <IconButton 
            onClick={onClose} 
            sx={{ color: 'white', ml: 2 }}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </HeaderSection>

      <DialogContent sx={{ p: 3, maxHeight: '60vh', overflow: 'auto' }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress size={60} sx={{ color: '#2a5298' }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, background: 'rgba(244, 67, 54, 0.1)' }}>
            {error}
          </Alert>
        )}

        {seriesData && (
          <Box>
            {/* Informações adicionais */}
            {(series.cast || series.director) && (
              <InfoCard sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Informações
                </Typography>
                <Grid container spacing={2}>
                  {series.cast && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Elenco
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {series.cast}
                      </Typography>
                    </Grid>
                  )}
                  {series.director && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Direção
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {series.director}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </InfoCard>
            )}

            {/* Temporadas e Episódios */}
            <Typography variant="h5" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TvIcon sx={{ mr: 1 }} />
              Temporadas e Episódios
            </Typography>

            {seriesData.seasons.map((season) => (
              <SeasonAccordion
                key={`season-${season.season_number}`}
                expanded={expandedSeason === `season-${season.season_number}`}
                onChange={handleAccordionChange(`season-${season.season_number}`)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" mr={2}>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      Temporada {season.season_number}
                    </Typography>
                    <Chip 
                      label={`${season.episode_count} episódios`} 
                      size="small" 
                      sx={{ 
                        background: 'rgba(42, 82, 152, 0.8)',
                        color: 'white'
                      }}
                    />
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: 0 }}>
                  <List sx={{ width: '100%', p: 1 }}>
                    {season.episodes.map((episode, index) => (
                      <EpisodeItem key={episode.id || index} disablePadding>
                        <ListItemButton 
                          onClick={() => handlePlayEpisode(episode)}
                          sx={{ 
                            borderRadius: 1,
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.1)'
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ background: 'linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)' }}>
                              {episode.episode_num || index + 1}
                            </Avatar>
                          </ListItemAvatar>
                          
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                                {episode.name || `Episódio ${episode.episode_num || index + 1}`}
                              </Typography>
                            }
                            secondary={
                              episode.info?.plot && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    mt: 0.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {episode.info.plot}
                                </Typography>
                              )
                            }
                          />
                          
                          <Tooltip title="Reproduzir episódio">
                            <PlayButton size="small">
                              <PlayIcon />
                            </PlayButton>
                          </Tooltip>
                        </ListItemButton>
                      </EpisodeItem>
                    ))}
                  </List>
                </AccordionDetails>
              </SeasonAccordion>
            ))}
          </Box>
        )}
      </DialogContent>
    </StyledDialog>
  );
};

export default SeriesModal;