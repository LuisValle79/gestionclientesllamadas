import { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Card, CardContent, Grid } from '@mui/material';
import { People, Message, Notifications } from '@mui/icons-material';
import { supabase } from '../services/supabase';
import LoadingIndicator from '../components/LoadingIndicator';
import AlertMessage from '../components/AlertMessage';
import useAlert from '../hooks/useAlert';

type DashboardStats = {
  totalClientes: number;
  mensajesRecientes: number;
  recordatoriosPendientes: number;
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    mensajesRecientes: 0,
    recordatoriosPendientes: 0,
  });
  const [loading, setLoading] = useState(true);
  const { alert, showError, hideAlert } = useAlert();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Consulta para contar clientes
        const { count: clientesCount, error: clientesError } = await supabase
          .from('clientes')
          .select('id', { count: 'exact', head: true });

        if (clientesError) {
          console.error('Error en clientes:', clientesError);
          throw new Error(`Error en clientes: ${clientesError.message}`);
        }

        // Consulta para contar mensajes recientes (últimos 7 días)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 7);

        const { count: mensajesCount, error: mensajesError } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', fechaLimite.toISOString());

        if (mensajesError) {
          console.error('Error en mensajes:', mensajesError);
          throw new Error(`Error en mensajes: ${mensajesError.message}`);
        }

        // Consulta para contar recordatorios pendientes
        const { count: recordatoriosCount, error: recordatoriosError } = await supabase
          .from('recordatorios')
          .select('id', { count: 'exact', head: true })
          .eq('completado', false);

        if (recordatoriosError) {
          console.error('Error en recordatorios:', recordatoriosError);
          throw new Error(`Error en recordatorios: ${recordatoriosError.message}`);
        }

        setStats({
          totalClientes: clientesCount || 0,
          mensajesRecientes: mensajesCount || 0,
          recordatoriosPendientes: recordatoriosCount || 0,
        });
      } catch (error: any) {
        console.error('Error al obtener estadísticas:', error);
        showError(error.message || 'Error al cargar las estadísticas', 'Error en Dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [showError, hideAlert]);

  if (loading) {
    return <LoadingIndicator message="Cargando estadísticas..." />;
  }

  return (
    <>
      <AlertMessage
        open={alert.open}
        message={alert.message}
        severity={alert.severity}
        title={alert.title}
        onClose={hideAlert}
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom component="h1">
          Dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 2, bgcolor: 'primary.light', p: 1, borderRadius: 1 }}>
                    <People fontSize="large" color="primary" />
                  </Box>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Clientes
                    </Typography>
                    <Typography variant="h4">{stats.totalClientes}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 2, bgcolor: 'info.light', p: 1, borderRadius: 1 }}>
                    <Message fontSize="large" color="info" />
                  </Box>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Mensajes Recientes
                    </Typography>
                    <Typography variant="h4">{stats.mensajesRecientes}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 2, bgcolor: 'warning.light', p: 1, borderRadius: 1 }}>
                    <Notifications fontSize="large" color="warning" />
                  </Box>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Recordatorios Pendientes
                    </Typography>
                    <Typography variant="h4">{stats.recordatoriosPendientes}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Actividad Reciente
              </Typography>
              <Typography variant="body1">
                Aquí se mostrará un resumen de la actividad reciente con clientes y mensajes.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default Dashboard;