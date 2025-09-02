import { useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { Menu as MenuIcon } from '@mui/icons-material';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingIndicator from './components/LoadingIndicator';
import Login from './pages/Login';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Mensajes from './pages/Mensajes';
import Recordatorios from './pages/Recordatorios';
import Usuarios from './pages/Usuarios';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E5077',
      light: '#4A6D8C',
      dark: '#1D3557',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E63946',
      light: '#F48C99',
      dark: '#C1121F',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)' },
      },
    },
  },
});

// Rutas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingIndicator fullScreen message="Cargando aplicación..." />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

// Contenido principal
const AppContent = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <Navigate to="/login" />;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const routeTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/clientes': 'Clientes',
    '/mensajes': 'Mensajes',
    '/recordatorios': 'Recordatorios',
    '/usuarios': 'Usuarios',
  };
  const currentPath = window.location.pathname;
  const pageTitle = routeTitles[currentPath] || 'Gestión de Clientes';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Barra superior */}
      <AppBar
        position="fixed"
        sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: theme.palette.primary.main }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="Abrir menú de navegación"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 500 }}>
            {pageTitle}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: isMobile ? '100%' : 'calc(100% - 250px)',
          ml: isMobile ? 0 : '250px',
          bgcolor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          minHeight: '100vh',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Espaciador para el AppBar */}
        <Toolbar />
        {/* Aquí van las páginas */}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/mensajes" element={<Mensajes />} />
          <Route path="/recordatorios" element={<Recordatorios />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
