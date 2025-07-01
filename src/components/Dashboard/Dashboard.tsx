import React from 'react';
import { styled } from '@mui/material/styles';
import { AppBar, Toolbar, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';

const Root = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
}));

const AppBarStyled = styled(AppBar)(() => ({
  zIndex: 1000,
}));

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: theme.spacing(8),
}));

const Dashboard: React.FC = () => {
  return (
    <Root>
      <AppBarStyled position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            IPTV Stream Player
          </Typography>
        </Toolbar>
      </AppBarStyled>
      <MainContent>
        <Outlet />
      </MainContent>
    </Root>
  );
};

export default Dashboard;