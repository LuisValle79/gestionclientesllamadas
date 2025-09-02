import React, { Component, ErrorInfo, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.error.light,
  color: theme.palette.error.contrastText,
  borderRadius: theme.shape.borderRadius,
  maxWidth: '800px',
  margin: '0 auto',
}));

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorContainer elevation={3}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Algo salió mal
            </Typography>
            <Typography variant="body1" paragraph>
              Se ha producido un error en esta parte de la aplicación.
            </Typography>
            {this.state.error && (
              <Box sx={{ my: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1, textAlign: 'left' }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', overflowX: 'auto' }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
              sx={{ mt: 2 }}
            >
              Intentar de nuevo
            </Button>
          </Box>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;