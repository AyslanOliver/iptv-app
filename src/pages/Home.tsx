import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Box
} from '@mui/material';
import { 
  LiveTv as LiveTvIcon, 
  Movie as MovieIcon, 
  Tv as SeriesIcon 
} from '@mui/icons-material';

const Home: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const user = JSON.parse(localStorage.getItem('iptvUser') || '{}');
      if (!user?.username || !user?.password) {
        navigate('/login');
        return;
      }
    };

    checkAuth();
  }, [navigate]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Bem-vindo ao Zeus Player
        </Typography>
        <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary">
          Escolha uma opção para começar
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <LiveTvIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography gutterBottom variant="h5" component="h2">
                TV ao Vivo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assista aos seus canais favoritos em tempo real
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                size="large" 
                variant="contained" 
                onClick={() => handleNavigate('/live-tv')}
                fullWidth
              >
                Assistir TV
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <MovieIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
              <Typography gutterBottom variant="h5" component="h2">
                Filmes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Explore nossa coleção de filmes disponíveis
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                size="large" 
                variant="contained" 
                color="secondary"
                onClick={() => handleNavigate('/movies')}
                fullWidth
              >
                Ver Filmes
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <SeriesIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography gutterBottom variant="h5" component="h2">
                Séries
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Descubra séries e episódios para maratonar
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                size="large" 
                variant="contained" 
                color="success"
                onClick={() => handleNavigate('/series')}
                fullWidth
              >
                Ver Séries
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Aproveite sua experiência de streaming!
        </Typography>
      </Box>
    </Container>
  );
};

export default Home;