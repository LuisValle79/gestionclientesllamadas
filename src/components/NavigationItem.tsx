import React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useTheme } from '@mui/material/styles';

interface NavigationItemProps {
  text: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ text, icon, isActive, onClick }) => {
  const theme = useTheme();

  return (
    <ListItem
      component="button"
      onClick={onClick}
      sx={{
        mb: 0.5,
        borderRadius: 1,
        bgcolor: isActive ? theme.palette.primary.light : 'transparent',
        color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
        '&:hover': {
          bgcolor: isActive 
            ? theme.palette.primary.light 
            : theme.palette.action.hover,
        },
        transition: 'all 0.2s ease',
        py: 1,
      }}
      aria-label={`Navegar a ${text}`}
    >
      <ListItemIcon sx={{ 
        color: isActive 
          ? theme.palette.primary.contrastText 
          : theme.palette.text.primary,
        minWidth: '40px',
      }}>
        {icon}
      </ListItemIcon>
      <ListItemText 
        primary={text}
        primaryTypographyProps={{
          fontWeight: 'medium',
          fontSize: '0.95rem',
        }}
      />
    </ListItem>
  );
};

export default NavigationItem;