import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Tv as TvIcon,
  Movie as MovieIcon,
  Theaters as TheatersIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const Root = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
}));

const AppBarStyled = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  background: 'rgba(26, 27, 38, 0.98)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
}));

const DrawerStyled = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    background: 'rgba(19, 21, 31, 0.98)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(99, 102, 241, 0.1)',
  },
}));

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: theme.spacing(8),
  background: theme.palette.background.default,
  minHeight: '100vh',
}));

interface ListItemStyledProps {
  active?: number;
}

const ListItemStyled = styled(ListItemButton, {
  shouldForwardProp: (prop) => !['active', 'component', 'to'].includes(prop as string),
})<ListItemStyledProps>(({ theme, active }) => ({
  margin: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(1),
  transition: 'all 0.3s ease',
  background: active ? 'linear-gradient(45deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))' : 'transparent',
  '&:hover': {
    background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
    transform: 'translateX(5px)',
  },
  '& .MuiListItemIcon-root': {
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    minWidth: 40,
  },
  '& .MuiListItemText-primary': {
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
    fontWeight: active ? 600 : 400,
  },
}));

const menuItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/' },
  { text: 'TV ao Vivo', icon: <TvIcon />, path: '/live-tv' },
  { text: 'Filmes', icon: <MovieIcon />, path: '/movies' },
  { text: 'Séries', icon: <TheatersIcon />, path: '/series' },
  { text: 'Favoritos', icon: <FavoriteIcon />, path: '/favorites' },
];

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItemStyled
            key={item.path}
            {...{
              component: RouterLink,
              to: item.path
            }}
            active={(location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) ? 1 : 0}
            onClick={isMobile ? handleDrawerToggle : undefined}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemStyled>
        ))}
      </List>
    </>
  );

  return (
    <Root>
      <AppBarStyled position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600,
            }}
          >
            ZEUS PLAYER
          </Typography>
          <IconButton color="inherit" sx={{ ml: 1 }}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBarStyled>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <DrawerStyled
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {drawer}
        </DrawerStyled>
      </Box>

      <MainContent>
        <Outlet />
      </MainContent>
    </Root>
  );
};

export default Dashboard;