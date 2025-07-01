import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Grid,
  Card,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow,
  Star,
  CalendarToday,
  Movie,
  Tv
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import SeriesPlayer from './SeriesPlayer';
import { getSeriesInfo, getSeriesEpisodes } from '../services/iptvService';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    maxWidth: '1200px',
    width: '95%',
    maxHeight: '90vh',
    margin: theme.spacing(2),
  },
}));

const HeaderSection = styled(Box)({
  position: 'relative',
  minHeight: '300px',
  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
  borderRadius: '8px 8px 0 0',
  overflow: 'hidden',
});

const BackdropImage = styled('div')<{ backdrop?: string }>(({ backdrop }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: backdrop ? `url(${backdrop})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: 0.3,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, rgba(26,26,26,0.4) 0%, rgba(26,26,26,0.9) 100%)',
  },
}));

const HeaderContent = styled(Box)({
  position: 'relative',
  zIndex: 2,
  padding: '24px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
});

const SeriesTitle = styled(Typography)({
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '16px',
  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
});

const SeriesInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '16px',
  flexWrap: 'wrap',
});

const InfoChip = styled(Chip)({
  backgroundColor: 'rgba(255, 68, 68, 0.2)',
  color: '#fff',
  border: '1px solid rgba(255, 68, 68, 0.5)',
  '& .MuiChip-icon': {
    color: '#ff4444',
  },
});

// SeasonCard styled component removed - not used

const EpisodeItem = styled(ListItem)({
  backgroundColor: '#2d2d2d',
  marginBottom: '8px',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#3d3d3d',
  },
});

const PlayButton = styled(Button)({
  backgroundColor: '#ff4444',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#ff3333',
  },
  borderRadius: '20px',
  padding: '8px 24px',
  textTransform: 'none',
  fontWeight: 600,
});

const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
  flexDirection: 'column',
  gap: '16px',
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
    rating?: string;
    releasedate?: string;
  };
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  overview?: string;
}

interface SeriesData {
  seasons: Season[];
  episodes: Episode[];
  info?: {
    name?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releasedate?: string;
    rating?: string;
    duration?: string;
    backdrop_path?: string;
    poster_path?: string;
  };
}

interface SeriesModalProps {
  open: boolean;
  onClose: () => void;
  seriesId: string;
  seriesTitle: string;
}

// formatRating and formatDuration functions removed - not used

const SeriesModal: React.FC<SeriesModalProps> = ({
  open,
  onClose,
  seriesId,
  seriesTitle,
}) => {
  const [seriesData, setSeriesData] = useState<SeriesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);



  // Carregar dados da série com debounce
  useEffect(() => {
    if (open && seriesId) {
      // Reset states when opening
      setSeriesData(null);
      setError(null);
      setSelectedEpisode(null);
      setShowPlayer(false);
      setExpandedSeason(null);
      
      // Delay loading to prevent blocking
      const timer = setTimeout(() => {
        loadSeriesData();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [open, seriesId]);

  const loadSeriesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
      if (!user?.username || !user?.password) {
        setError('Usuário não autenticado');
        return;
      }

      const credentials = { username: user.username, password: user.password };
      
      // Buscar informações da série
      const seriesInfo = await getSeriesInfo(credentials, seriesId);
      
      // Buscar episódios separadamente
      const episodesData = await getSeriesEpisodes(credentials, seriesId);
      
      // Combinar os dados
      const episodes = episodesData?.episodes || episodesData || seriesInfo?.episodes || [];
      
      // Debug: Verificar estrutura dos episódios
      console.log('=== DEBUG EPISÓDIOS ===');
      console.log('Total de episódios encontrados:', episodes.length);
      console.log('Estrutura completa dos primeiros 3 episódios:', JSON.stringify(episodes.slice(0, 3), null, 2));
      
      if (episodes.length > 0) {
        console.log('Análise detalhada dos primeiros 20 episódios:');
        episodes.slice(0, 20).forEach((ep: any, index: number) => {
          const seasonNum = ep.season_num || ep.season_number || ep.info?.season_num || ep.season;
          console.log(`Episódio ${index + 1}:`);
          console.log(`  - Título: "${ep.title}"`);
          console.log(`  - season_num: ${ep.season_num}`);
          console.log(`  - season_number: ${ep.season_number}`);
          console.log(`  - info?.season_num: ${ep.info?.season_num}`);
          console.log(`  - season: ${ep.season}`);
          console.log(`  - Temporada detectada: ${seasonNum}`);
          console.log(`  - ID: ${ep.id}`);
          console.log(`  - stream_id: ${ep.stream_id}`);
          console.log(`  - episode_id: ${ep.episode_id}`);
          console.log(`  - Todos os campos disponíveis:`, Object.keys(ep));
          console.log('  ---');
        });
      }
      
      // Criar temporadas automaticamente se não existirem
      let seasons = seriesInfo?.seasons || episodesData?.seasons || [];
      
      if (!seasons || seasons.length === 0) {
        // Agrupar episódios por temporada
        const seasonMap = new Map();
        
        console.log('=== CRIANDO TEMPORADAS AUTOMATICAMENTE ===');
        episodes.forEach((episode: any, index: number) => {
          let seasonNum = episode.season_num || episode.season_number || episode.info?.season_num || episode.season;
          
          // Se não encontrou temporada, tentar extrair do título
          if (!seasonNum && episode.title) {
            const seasonMatch = episode.title.match(/S(\d+)E\d+/i) || episode.title.match(/Season\s+(\d+)/i) || episode.title.match(/Temporada\s+(\d+)/i);
            if (seasonMatch) {
              seasonNum = parseInt(seasonMatch[1]);
            }
          }
          
          // Se ainda não encontrou, assumir temporada 1
          if (!seasonNum) {
            seasonNum = 1;
          }
          
          if (index < 10) { // Log dos primeiros 10 episódios
            console.log(`Criação - Episódio ${index + 1}: título="${episode.title}", temporada detectada = ${seasonNum}`);
          }
          
          if (!seasonMap.has(seasonNum)) {
            seasonMap.set(seasonNum, {
              season_number: seasonNum,
              name: `Temporada ${seasonNum}`,
              episode_count: 0
            });
            console.log(`Nova temporada criada: ${seasonNum}`);
          }
          
          const season = seasonMap.get(seasonNum);
           season.episode_count++;
         });
        
        seasons = Array.from(seasonMap.values()).sort((a, b) => a.season_number - b.season_number);
        console.log('Temporadas criadas automaticamente:', seasons);
      }
      
      const combinedData = {
        ...seriesInfo,
        episodes,
        seasons
      };
      
      console.log('Series loaded successfully with', episodes?.length || 0, 'episodes and', seasons?.length || 0, 'seasons');
      setSeriesData(combinedData);
      
      // Expandir primeira temporada por padrão
       if (combinedData.seasons && combinedData.seasons.length > 0) {
         setExpandedSeason(combinedData.seasons[0].season_number);
       }
    } catch (err) {
      console.error('Erro ao carregar dados da série:', err);
      setError('Erro ao carregar informações da série');
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  const handlePlayEpisode = (episode: Episode) => {
    console.log('=== CLICOU EM ASSISTIR ===');
    console.log('Dados do episódio selecionado:', JSON.stringify(episode, null, 2));
    console.log('Todos os campos do episódio:', Object.keys(episode));
    
    // Verificar se é realmente um episódio ou dados da série
    const episodeId = episode.id || (episode as any).stream_id || (episode as any).series_id;
    const containerExt = episode.container_extension || 'mp4'; // fallback para .mp4
    
    console.log('ID encontrado:', episodeId);
    console.log('Container extension:', containerExt);
    
    if (!episodeId) {
      console.error('ERRO: Não foi possível encontrar ID válido para o episódio!');
      console.error('Campos disponíveis:', Object.keys(episode));
      return;
    }
    
    // Criar uma cópia do episódio com os dados corretos
    const episodeWithId = {
      ...episode,
      id: episodeId,
      container_extension: containerExt
    };
    
    console.log('Episódio processado:', episodeWithId);
    setSelectedEpisode(episodeWithId);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedEpisode(null);
  };

  // Memoizar episódios para evitar reprocessamento
  const allEpisodes = useMemo(() => {
    if (!seriesData) return [];

    // Função auxiliar para extrair episódios de qualquer estrutura
    const extractEpisodes = (data: any): Episode[] => {
      if (!data) return [];
      
      // Se já é um array de episódios
      if (Array.isArray(data)) {
        return data.filter((item: any) => item && (item.episode_num !== undefined || item.title));
      }
      
      // Se é um objeto, procurar por arrays dentro dele
      if (typeof data === 'object') {
        for (const key of Object.keys(data)) {
          const value = data[key];
          if (Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (firstItem && (firstItem.episode_num !== undefined || firstItem.title)) {
              return value;
            }
          }
        }
        
        // Tentar converter o próprio objeto em array
        const values = Object.values(data);
        if (values.length > 0 && values[0] && typeof values[0] === 'object') {
          const firstValue = values[0] as any;
          if (firstValue.episode_num !== undefined || firstValue.title) {
            return values as Episode[];
          }
        }
      }
      
      return [];
    };

    // Procurar episódios em diferentes locais
    return extractEpisodes(seriesData.episodes) ||
           extractEpisodes(seriesData.seasons) ||
           extractEpisodes(seriesData.info) ||
           extractEpisodes(seriesData) ||
           [];
  }, [seriesData]);

  const getEpisodesForSeason = useCallback((seasonNumber: number): Episode[] => {
    if (allEpisodes.length === 0) {
      console.log(`Temporada ${seasonNumber}: Nenhum episódio disponível`);
      return [];
    }

    console.log(`=== FILTRANDO TEMPORADA ${seasonNumber} ===`);
    console.log('Total de episódios para filtrar:', allEpisodes.length);
    
    // Log detalhado de todos os episódios para debug
    console.log('Análise de TODOS os episódios:');
    allEpisodes.forEach((ep: any, index: number) => {
      const seasonFields = {
        season_num: ep.season_num,
        season_number: ep.season_number,
        info_season_num: ep.info?.season_num,
        season: ep.season,
        title: ep.title
      };
      console.log(`Episódio ${index + 1}:`, seasonFields);
    });
    
    const filteredEpisodes = allEpisodes.filter((ep: any, index: number) => {
      // Tentar diferentes campos para identificar a temporada
      let epSeasonNum = ep.season_num || ep.season_number || ep.info?.season_num || ep.season;
      
      // Se não encontrou temporada, tentar extrair do título
      if (!epSeasonNum && ep.title) {
        const seasonMatch = ep.title.match(/S(\d+)E\d+/i) || ep.title.match(/Season\s+(\d+)/i) || ep.title.match(/Temporada\s+(\d+)/i);
        if (seasonMatch) {
          epSeasonNum = parseInt(seasonMatch[1]);
        }
      }
      
      // Se ainda não encontrou, assumir temporada 1
      if (!epSeasonNum) {
        epSeasonNum = 1;
      }
      
      const matches = epSeasonNum === seasonNumber;
      
      console.log(`Episódio ${index + 1}: temporada detectada=${epSeasonNum}, procurando=${seasonNumber}, match=${matches}, título="${ep.title}"`);
      
      return matches;
    });
    
    console.log(`Temporada ${seasonNumber}: ${filteredEpisodes.length} episódios encontrados`);
    return filteredEpisodes;
  }, [allEpisodes]);

  const getNextEpisode = (): Episode | null => {
    if (!selectedEpisode || !seriesData?.episodes) return null;
    
    // Garantir que episodes é um array
    const episodesArray = Array.isArray(seriesData.episodes) 
      ? seriesData.episodes 
      : Object.values(seriesData.episodes);
    
    const currentIndex = episodesArray.findIndex((ep: any) => ep.id === selectedEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodesArray.length - 1) {
      return episodesArray[currentIndex + 1] as Episode;
    }
    return null;
  };

  const getPreviousEpisode = (): Episode | null => {
    if (!selectedEpisode || !seriesData?.episodes) return null;
    
    // Garantir que episodes é um array
    const episodesArray = Array.isArray(seriesData.episodes) 
      ? seriesData.episodes 
      : Object.values(seriesData.episodes);
    
    const currentIndex = episodesArray.findIndex((ep: any) => ep.id === selectedEpisode.id);
    if (currentIndex > 0) {
      return episodesArray[currentIndex - 1] as Episode;
    }
    return null;
  };

  const handleNextEpisode = () => {
    const nextEpisode = getNextEpisode();
    if (nextEpisode) {
      setSelectedEpisode(nextEpisode);
    }
  };

  const handlePreviousEpisode = () => {
    const previousEpisode = getPreviousEpisode();
    if (previousEpisode) {
      setSelectedEpisode(previousEpisode);
    }
  };





  if (showPlayer && selectedEpisode) {
    return (
      <SeriesPlayer
        episode={selectedEpisode}
        seriesTitle={seriesData?.info?.name || seriesTitle}
        onClose={handleClosePlayer}
        onNextEpisode={getNextEpisode() ? handleNextEpisode : undefined}
        onPreviousEpisode={getPreviousEpisode() ? handlePreviousEpisode : undefined}
        hasNextEpisode={!!getNextEpisode()}
        hasPreviousEpisode={!!getPreviousEpisode()}
      />
    );
  }

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header */}
        <HeaderSection>
          <BackdropImage backdrop={seriesData?.info?.backdrop_path} />
          <HeaderContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <SeriesTitle variant="h3">
                  {seriesData?.info?.name || seriesTitle}
                </SeriesTitle>
                
                <SeriesInfo>
                  {seriesData?.info?.releasedate && (
                    <InfoChip
                      icon={<CalendarToday />}
                      label={new Date(seriesData.info.releasedate).getFullYear()}
                      size="small"
                    />
                  )}
                  
                  {seriesData?.info?.rating && (
                    <InfoChip
                      icon={<Star />}
                      label={seriesData.info.rating || ''}
                      size="small"
                    />
                  )}
                  
                  {seriesData?.seasons && (
                    <InfoChip
                      icon={<Tv />}
                      label={`${seriesData.seasons.length} temporada${seriesData.seasons.length !== 1 ? 's' : ''}`}
                      size="small"
                    />
                  )}
                  
                  {seriesData?.episodes && (
                    <InfoChip
                      icon={<Movie />}
                      label={`${Array.isArray(seriesData.episodes) ? seriesData.episodes.length : Object.keys(seriesData.episodes).length} episódio${(Array.isArray(seriesData.episodes) ? seriesData.episodes.length : Object.keys(seriesData.episodes).length) !== 1 ? 's' : ''}`}
                      size="small"
                    />
                  )}
                  
                  {seriesData?.info?.genre && (
                    <InfoChip
                      label={seriesData.info.genre}
                      size="small"
                    />
                  )}
                </SeriesInfo>
                
                {seriesData?.info?.plot && (
                  <Typography
                    variant="body1"
                    sx={{
                      opacity: 0.9,
                      lineHeight: 1.6,
                      maxWidth: '800px',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {seriesData.info.plot}
                  </Typography>
                )}
              </Box>
              
              <IconButton
                onClick={onClose}
                sx={{
                  color: '#fff',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </HeaderContent>
        </HeaderSection>
        
        {/* Content */}
        <Box sx={{ p: 3 }}>
          {loading && (
            <LoadingContainer>
              <CircularProgress size={60} sx={{ color: '#ff4444' }} />
              <Typography variant="h6">Carregando episódios...</Typography>
            </LoadingContainer>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {seriesData && (
            <Box>
              {/* Cast and Crew */}
              {(seriesData.info?.cast || seriesData.info?.director) && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#ff4444' }}>
                    Elenco e Equipe
                  </Typography>
                  <Grid container spacing={2}>
                    {seriesData.info.cast && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Elenco:
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {seriesData.info.cast}
                        </Typography>
                      </Grid>
                    )}
                    {seriesData.info.director && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Direção:
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {seriesData.info.director}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Divider sx={{ mt: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                </Box>
              )}
              
              {/* Seasons and Episodes */}
              <Typography variant="h6" sx={{ mb: 3, color: '#ff4444' }}>
                Temporadas e Episódios
              </Typography>
              

              
              {seriesData.seasons?.map((season) => {
                const episodes = getEpisodesForSeason(season.season_number);
                
                return (
                  <Accordion
                    key={season.season_number}
                    expanded={expandedSeason === season.season_number}
                    onChange={() => {
                      setExpandedSeason(
                        expandedSeason === season.season_number ? null : season.season_number
                      );
                    }}
                    sx={{
                      backgroundColor: '#2d2d2d',
                      color: '#fff',
                      mb: 2,
                      '&:before': {
                        display: 'none',
                      },
                      '& .MuiAccordionSummary-root': {
                        backgroundColor: '#3d3d3d',
                        '&:hover': {
                          backgroundColor: '#4d4d4d',
                        },
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {season.name || `Temporada ${season.season_number}`}
                        </Typography>
                        <Chip
                          label={`${episodes.length} episódio${episodes.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255, 68, 68, 0.2)',
                            color: '#fff',
                            border: '1px solid rgba(255, 68, 68, 0.5)',
                          }}
                        />
                        {season.air_date && (
                          <Typography variant="body2" sx={{ opacity: 0.7, ml: 'auto' }}>
                            {new Date(season.air_date).getFullYear()}
                          </Typography>
                        )}
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails sx={{ p: 0 }}>
                      {season.overview && (
                        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            {season.overview}
                          </Typography>
                        </Box>
                      )}
                      
                      <List sx={{ p: 1, maxHeight: '400px', overflow: 'auto' }}>
                        {episodes.slice(0, expandedSeason === season.season_number ? Math.min(episodes.length, 50) : 10).map((episode: any) => (
                          <EpisodeItem key={episode.id}>
                            <ListItemButton
                              onClick={() => handlePlayEpisode(episode)}
                              sx={{
                                borderRadius: '8px',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 68, 68, 0.1)',
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                <PlayButton
                                  size="small"
                                  startIcon={<PlayArrow />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayEpisode(episode);
                                  }}
                                >
                                  Assistir
                                </PlayButton>
                                
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {episode.episode_num}. {episode.title}
                                  </Typography>
                                  
                                  {episode.info?.plot && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        opacity: 0.7,
                                        mt: 0.5,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {episode.info.plot}
                                    </Typography>
                                  )}
                                  
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>

                                    

                                  </Box>
                                </Box>
                              </Box>
                            </ListItemButton>
                          </EpisodeItem>
                        ))}
                        
                        {/* Mostrar mensagem se há mais episódios */}
                        {episodes.length > (expandedSeason === season.season_number ? 50 : 10) && (
                          <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>
                              {expandedSeason === season.season_number 
                                ? `Mostrando 50 de ${episodes.length} episódios` 
                                : `Mostrando 10 de ${episodes.length} episódios`
                              }
                            </Typography>
                          </Box>
                        )}

                      </List>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>
    </StyledDialog>
  );
};

export default SeriesModal;