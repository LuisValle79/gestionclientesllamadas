import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Dashboard, People, Message, Notifications, Logout, AccountCircle, AdminPanelSettings } from '@mui/icons-material';
import NavigationItem from './NavigationItem';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface NavigationProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Navigation = ({ mobileOpen, handleDrawerToggle }: NavigationProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('rol')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserRole(data?.rol || null);
    } catch (error: any) {
      console.error('Error al obtener rol de usuario:', error.message);
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const navigateTo = (path: string) => {
    navigate(path);
    if (isMobile) handleDrawerToggle();
    handleMenuClose();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    handleMenuClose();
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Clientes', icon: <People />, path: '/clientes' },
    { text: 'Mensajes', icon: <Message />, path: '/mensajes' },
    { text: 'Recordatorios', icon: <Notifications />, path: '/recordatorios' },
    { text: 'Usuarios', icon: <AdminPanelSettings />, path: '/usuarios', requiredRole: 'administrador' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const drawer = (
    <Box sx={{ width: 250, height: '100%', bgcolor: theme.palette.background.paper }}>
      <Box sx={{ 
        p: 2, 
        pt: isMobile ? 2 : theme.mixins.toolbar.minHeight / 8, // Ajustar padding-top para AppBar
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold', 
            color: theme.palette.primary.main,
            letterSpacing: 0.5,
          }}
        >
          Gestión de Clientes
        </Typography>
        {isMobile && (
          <IconButton 
            onClick={handleProfileMenuOpen} 
            aria-label="Abrir menú de perfil"
            sx={{ color: theme.palette.text.primary }}
          >
            <AccountCircle />
          </IconButton>
        )}
      </Box>

      {user?.email && (
        <Box sx={{ 
          px: 2, 
          py: 1.5, 
          display: 'flex', 
          alignItems: 'center',
          '&:hover': { bgcolor: theme.palette.action.hover },
          transition: 'background-color 0.2s',
        }}>
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: theme.palette.secondary.main, 
              mr: 1.5,
              fontSize: '1rem',
            }}
          >
            {user.email.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography 
              variant="subtitle2" 
              sx={{ fontWeight: 'medium', color: theme.palette.text.primary }}
            >
              {user.email}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ color: theme.palette.text.secondary }}
            >
              {userRole || 'Usuario'}
            </Typography>
          </Box>
        </Box>
      )}

      <Divider />

      <List sx={{ px: 1, py: 0.5 }}>
        {menuItems
          .filter(item => !item.requiredRole || item.requiredRole === userRole)
          .map((item) => (
            <NavigationItem
              key={item.text}
              text={item.text}
              icon={item.icon}
              isActive={isActive(item.path)}
              onClick={() => navigateTo(item.path)}
            />
          ))}
      </List>

      <Divider sx={{ my: 1 }} />

      <List sx={{ px: 1 }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            '&:hover': {
              bgcolor: theme.palette.error.light,
              color: theme.palette.error.contrastText,
            },
            transition: 'all 0.2s ease',
            py: 1,
          }}
          aria-label="Cerrar sesión"
        >
          <ListItemIcon sx={{ 
            color: isActive('/login') 
              ? theme.palette.error.contrastText 
              : theme.palette.error.main,
            minWidth: '40px',
          }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Cerrar sesión"
            primaryTypographyProps={{
              fontWeight: 'medium',
              fontSize: '0.95rem',
              color: isActive('/login') 
                ? theme.palette.error.contrastText 
                : theme.palette.error.main,
            }}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderMobileMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { 
          mt: 1,
          borderRadius: 2,
          minWidth: 150,
        },
      }}
    >
      <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
        <ListItemIcon sx={{ minWidth: '36px' }}>
          <Logout fontSize="small" color="error" />
        </ListItemIcon>
        <Typography variant="body2" color="error">
          Cerrar sesión
        </Typography>
      </MenuItem>
    </Menu>
  );

  return (
    <>
      {renderMobileMenu}
      <Box sx={{ display: 'flex' }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          sx={{
            width: 250,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 250,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.divider}`,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
              bgcolor: theme.palette.background.paper,
              top: isMobile ? 0 : theme.mixins.toolbar.minHeight,
              height: isMobile ? '100vh' : `calc(100vh - ${theme.mixins.toolbar.minHeight}px)`,
            },
            display: { xs: 'block', md: isMobile ? 'block' : 'none' },
          }}
          ModalProps={{
            keepMounted: true,
          }}
        >
          {drawer}
        </Drawer>

        <Box
          component="nav"
          sx={{ width: { md: 250 }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: 250,
                top: theme.mixins.toolbar.minHeight,
                height: `calc(100vh - ${theme.mixins.toolbar.minHeight}px)`,
                borderRight: `1px solid ${theme.palette.divider}`,
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
                bgcolor: theme.palette.background.paper,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      </Box>
    </>
  );
};

export default Navigation;