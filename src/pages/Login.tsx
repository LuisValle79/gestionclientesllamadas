import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/dashboard');
      } else {
        await signUp(email, password);
        setIsLogin(true);
        setError('Verifica tu correo para confirmar tu cuenta');
      }
    } catch (error: any) {
      setError(error.message || 'Ocurrió un error durante la autenticación');
      console.error('Error en login:', error);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      setError('');
      const message = await resendConfirmation(email);
      setError(message);
    } catch (error: any) {
      setError(error.message || 'Error al reenviar el correo de confirmación');
      console.error('Error al reenviar confirmación:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* Lado izquierdo: Imagen y texto */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1,
            backgroundImage: 'url(https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          <Typography
            variant="h3"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              zIndex: 1,
              px: 4,
            }}
          >
            Sistema de Gestión de Clientes
          </Typography>
        </Box>
      )}

      {/* Lado derecho: Formulario */}
      <Box
        sx={{
          flex: isMobile ? '1' : '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isMobile ? 'flex-start' : 'center',
          alignItems: 'center',
          p: isMobile ? 2 : 4,
          backgroundColor: isMobile
            ? 'rgba(255, 255, 255, 0.9)'
            : 'white',
          ...(isMobile && {
            backgroundImage:
              'url(https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '100vh',
          }),
        }}
      >
        {isMobile && (
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              mt: 4,
              mb: 4,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            Sistema de Gestión de Clientes
          </Typography>
        )}
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: 'white',
            p: 4,
            borderRadius: 2,
            boxShadow: isMobile ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'medium',
              textAlign: 'center',
              mb: 3,
              color: '#1a237e',
            }}
          >
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3f51b5',
                  },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3f51b5',
                  },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 'medium',
                backgroundColor: '#3f51b5',
                '&:hover': {
                  backgroundColor: '#303f9f',
                },
              }}
            >
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => setIsLogin(!isLogin)}
              sx={{
                textTransform: 'none',
                color: '#3f51b5',
                '&:hover': {
                  backgroundColor: 'rgba(63, 81, 181, 0.04)',
                },
              }}
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Button>
            {isLogin && (
              <Button
                fullWidth
                variant="text"
                onClick={handleResendConfirmation}
                sx={{
                  textTransform: 'none',
                  color: '#757575',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                Reenviar correo de confirmación
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;