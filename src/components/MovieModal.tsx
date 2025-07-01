import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Rating } from '@mui/material';
import MoviePlayer from './MoviePlayer';

interface Movie {
  stream_id: string;
  name: string;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  container_extension: string; // Added this required property
}

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose }) => {
  if (!movie) return null;

  return (
    <Dialog
      open={!!movie}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5">{movie.name}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            Avaliação:
            <Rating
              value={movie.rating_5based}
              readOnly
              precision={0.5}
            />
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Adicionado em: {new Date(movie.added).toLocaleDateString()}
          </Typography>
        </Box>
        <MoviePlayer
          movie={movie}
          onClose={onClose}
          autoPlay
        />
      </DialogContent>
    </Dialog>
  );
};

export default MovieModal;