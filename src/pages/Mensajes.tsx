import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, CircularProgress, Snackbar, Alert, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Divider, FormControl, InputLabel, Select,
  MenuItem, IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Send as SendIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { supabase } from '../services/supabase';

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
};

type Mensaje = {
  id: number;
  cliente_id: number;
  contenido: string;
  tipo: 'enviado' | 'recibido';
  created_at: string;
  cliente?: Cliente;
};

const Mensajes = () => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<number | ''>('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      fetchMensajes(Number(selectedCliente));
    } else {
      setMensajes([]);
    }
  }, [selectedCliente]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar clientes: ${error.message}`, severity: 'error' });
      setLoading(false);
    }
  };

  const fetchMensajes = async (clienteId: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mensajes')
        .select(`
          id,
          cliente_id,
          contenido,
          tipo,
          created_at,
          clientes (id, nombre, telefono)
        `)
        .eq('cliente_id', clienteId)
        .order('created_at');

      if (error) throw error;
      setMensajes(
        data?.map((item) => ({
          id: item.id,
          cliente_id: item.cliente_id,
          contenido: item.contenido,
          tipo: item.tipo,
          created_at: item.created_at,
          cliente: item.clientes, // Ajustado para que cliente sea un objeto
        })) || []
      );
    } catch (error: any) {
      console.error('Error al cargar mensajes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar mensajes: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClienteChange = (event: SelectChangeEvent<number | string>) => {
    setSelectedCliente(event.target.value as number | '');
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleEnviarMensaje = async () => {
    if (!selectedCliente || !nuevoMensaje.trim()) {
      setSnackbar({ open: true, message: 'Selecciona un cliente y escribe un mensaje', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert([
          {
            cliente_id: selectedCliente,
            contenido: nuevoMensaje,
            tipo: 'enviado',
          },
        ]);

      if (error) throw error;

      const cliente = clientes.find((c) => c.id === selectedCliente);

      if (cliente) {
        const formattedPhone = cliente.telefono.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(nuevoMensaje)}`, '_blank');
      }

      setNuevoMensaje('');
      setSnackbar({ open: true, message: 'Mensaje enviado correctamente', severity: 'success' });
      fetchMensajes(Number(selectedCliente));
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error.message);
      setSnackbar({ open: true, message: `Error al enviar mensaje: ${error.message}`, severity: 'error' });
    }
  };

  const handleRegistrarMensajeRecibido = async () => {
    if (!selectedCliente || !nuevoMensaje.trim()) {
      setSnackbar({ open: true, message: 'Selecciona un cliente y escribe el mensaje recibido', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert([
          {
            cliente_id: selectedCliente,
            contenido: nuevoMensaje,
            tipo: 'recibido',
          },
        ]);

      if (error) throw error;

      setNuevoMensaje('');
      setSnackbar({ open: true, message: 'Mensaje recibido registrado correctamente', severity: 'success' });
      fetchMensajes(Number(selectedCliente));
    } catch (error: any) {
      console.error('Error al registrar mensaje recibido:', error.message);
      setSnackbar({ open: true, message: `Error al registrar mensaje: ${error.message}`, severity: 'error' });
    }
  };

  const handleDeleteMensaje = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      try {
        const { error } = await supabase
          .from('mensajes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Mensaje eliminado correctamente', severity: 'success' });
        fetchMensajes(Number(selectedCliente));
      } catch (error: any) {
        console.error('Error al eliminar mensaje:', error.message);
        setSnackbar({ open: true, message: `Error al eliminar mensaje: ${error.message}`, severity: 'error' });
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Mensajes
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="cliente-select-label">Seleccionar Cliente</InputLabel>
          <Select
            labelId="cliente-select-label"
            id="cliente-select"
            value={selectedCliente}
            onChange={handleClienteChange}
            label="Seleccionar Cliente"
            aria-label="Seleccionar cliente"
          >
            <MenuItem value="">
              <em>Seleccione un cliente</em>
            </MenuItem>
            {clientes.map((cliente) => (
              <MenuItem key={cliente.id} value={cliente.id}>
                {cliente.nombre} ({cliente.telefono})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedCliente ? (
        <>
          <Paper sx={{ p: 2, mb: 3, maxHeight: '50vh', overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress aria-label="Cargando mensajes" />
              </Box>
            ) : mensajes.length > 0 ? (
              <List>
                {mensajes.map((mensaje, index) => (
                  <Box key={mensaje.id}>
                    {index > 0 && <Divider variant="inset" component="li" />}
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        justifyContent: mensaje.tipo === 'enviado' ? 'flex-end' : 'flex-start',
                        '& .MuiListItemText-root': {
                          maxWidth: '70%',
                        },
                      }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label={`Eliminar mensaje ${mensaje.contenido}`}
                          onClick={() => handleDeleteMensaje(mensaje.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      {mensaje.tipo === 'recibido' && (
                        <ListItemAvatar>
                          <Avatar>{mensaje.cliente?.nombre?.charAt(0) || '?'}</Avatar>
                        </ListItemAvatar>
                      )}
                      <ListItemText
                        primary={mensaje.contenido}
                        secondary={formatDate(mensaje.created_at)}
                        sx={{
                          bgcolor: mensaje.tipo === 'enviado' ? 'primary.light' : 'grey.100',
                          p: 2,
                          borderRadius: 2,
                        }}
                      />
                      {mensaje.tipo === 'enviado' && (
                        <ListItemAvatar sx={{ ml: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>Yo</Avatar>
                        </ListItemAvatar>
                      )}
                    </ListItem>
                  </Box>
                ))}
              </List>
            ) : (
              <Typography align="center" color="textSecondary">
                No hay mensajes para mostrar
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Escribe un mensaje"
                multiline
                rows={3}
                variant="outlined"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                sx={{ mr: 2 }}
                aria-label="Escribe un mensaje"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  onClick={handleEnviarMensaje}
                  disabled={!nuevoMensaje.trim()}
                  aria-label="Enviar mensaje"
                >
                  Enviar
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleRegistrarMensajeRecibido}
                  disabled={!nuevoMensaje.trim()}
                  aria-label="Registrar mensaje recibido"
                >
                  Registrar Recibido
                </Button>
              </Box>
            </Box>
          </Paper>
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Selecciona un cliente para ver y enviar mensajes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{ mt: 2 }}
            aria-label="Agregar nuevo cliente"
          >
            Agregar Nuevo Cliente
          </Button>
        </Paper>
      )}

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Diálogo para agregar cliente (simplificado, redirige a la página de clientes) */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
        <DialogContent>
          <Typography>
            Para agregar un nuevo cliente, ve a la sección de Gestión de Clientes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} aria-label="Cancelar">Cancelar</Button>
          <Button
            onClick={() => {
              handleCloseDialog();
              window.location.href = '/clientes';
            }}
            variant="contained"
            color="primary"
            aria-label="Ir a gestión de clientes"
          >
            Ir a Gestión de Clientes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Mensajes;