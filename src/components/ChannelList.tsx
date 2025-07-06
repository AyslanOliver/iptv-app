import React from 'react';
import { styled } from '@mui/material/styles';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const ListContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: 360,
  backgroundColor: theme.palette.background.paper,
  maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: '4px',
    '&:hover': {
      background: theme.palette.primary.dark,
    },
  },
}));

const StyledListItem = styled(ListItem)<{ selected?: boolean }>(({ theme, selected }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    cursor: 'pointer',
  },
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  '&.Mui-selected': {
    backgroundColor: `${theme.palette.action.selected} !important`,
  },
}));

interface Channel {
  id: string;
  name: string;
  url: string;
  group?: string;
}

interface ChannelListProps {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  selectedChannelId?: string;
}

const ChannelList: React.FC<ChannelListProps> = ({ channels, onChannelSelect, selectedChannelId }) => {
  // Agrupar canais por categoria
  const groupedChannels = channels.reduce((groups: { [key: string]: Channel[] }, channel) => {
    const group = channel.group || 'Sem Categoria';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(channel);
    return groups;
  }, {});

  return (
    <ListContainer>
      {Object.entries(groupedChannels).map(([group, groupChannels]) => (
        <Accordion key={group} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{group}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List component="nav" dense>
              {groupChannels.map((channel) => (
                <StyledListItem
                  key={channel.id}
                  selected={channel.id === selectedChannelId}
                  onClick={() => onChannelSelect(channel)}
                >
                  <ListItemIcon>
                    <PlayArrowIcon />
                  </ListItemIcon>
                  <ListItemText primary={channel.name} />
                </StyledListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </ListContainer>
  );
};

export default ChannelList;