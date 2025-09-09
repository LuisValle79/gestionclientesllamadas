import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, CircularProgress, Snackbar, Alert, TablePagination,
  Tabs, Tab, Chip, Tooltip, FormControl, InputLabel, Select, MenuItem, useTheme,
  Input, Link,
} from '@mui/material';
import { Grid } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Cliente = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  ruc: string | null;
  razon_social: string | null;
  representante: string | null;
  notas: string | null;
  fecha_proxima_llamada: string | null;
  fecha_proxima_visita: string | null;
  fecha_proxima_reunion: string | null;
  created_at: string;
  created_by: string | null;
};

const Clientes = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Partial<Cliente>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [filtro, setFiltro] = useState('todos');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

const fetchUserRole = async () => {
  try {
    if (!user) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setUserRole(data.rol || 'cliente');
    } else {
      // Perfil no encontrado, asigna rol default y crea uno si es necesario
      setUserRole('cliente');
      setSnackbar({ open: true, message: 'Perfil no encontrado. Asignado rol "cliente" por default.', severity: 'warning' });
      // Opcional: Crea el perfil automáticamente
      await supabase.from('perfiles_usuario').insert([{ id: user.id, rol: 'cliente' }]);
    }
  } catch (error: any) {
    console.error('Error al obtener rol de usuario:', error.message);
    setSnackbar({ open: true, message: `Error al obtener rol: ${error.message}`, severity: 'error' });
    setUserRole('cliente'); // Rol default en caso de error
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (user && userRole) {
      fetchClientes();
    }
  }, [filtro, user, userRole]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('clientes')
        .select('*');

      if (userRole !== 'administrador' && userRole !== 'asesor') {
        query = query.eq('created_by', user!.id);
      }

      if (filtro === 'proxima_llamada') {
        query = query.not('fecha_proxima_llamada', 'is', null);
      } else if (filtro === 'proxima_visita') {
        query = query.not('fecha_proxima_visita', 'is', null);
      } else if (filtro === 'proxima_reunion') {
        query = query.not('fecha_proxima_reunion', 'is', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar clientes: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (userRole === null) {
      setSnackbar({ open: true, message: 'No tienes permisos para realizar esta acción', severity: 'error' });
      return;
    }
    if (cliente) {
      setCurrentCliente(cliente);
      setIsEditing(true);
    } else {
      setCurrentCliente({ created_by: user!.id });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleOpenImportDialog = () => {
    if (userRole !== 'administrador' && userRole !== 'asesor') {
      setSnackbar({ open: true, message: 'No tienes permiso para importar clientes', severity: 'error' });
      return;
    }
    setOpenImportDialog(true);
    setImportFile(null);
    setImportError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentCliente({});
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
    setImportFile(null);
    setImportError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentCliente({ ...currentCliente, [name]: value || null });
  };

  const handleDateChange = (field: string, newDate: Date | null) => {
    setCurrentCliente({ ...currentCliente, [field]: newDate ? newDate.toISOString() : null });
  };

  const handleFiltroChange = (event: SelectChangeEvent<string>) => {
    setFiltro(event.target.value);
    setPage(0);
  };

  const handleSaveCliente = async () => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    // Validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (currentCliente.email && !emailRegex.test(currentCliente.email)) {
      setSnackbar({ open: true, message: 'Formato de email inválido', severity: 'error' });
      return;
    }
    if (currentCliente.telefono && !/^\+?\d{9,15}$/.test(currentCliente.telefono)) {
      setSnackbar({ open: true, message: 'Formato de teléfono inválido (9-15 dígitos, ej: +51987654321)', severity: 'error' });
      return;
    }
    if (currentCliente.ruc && !/^\d{11}$/.test(currentCliente.ruc)) {
      setSnackbar({ open: true, message: 'El RUC debe tener exactamente 11 dígitos', severity: 'error' });
      return;
    }

    try {
      const clienteData = {
        nombre: currentCliente.nombre || null,
        telefono: currentCliente.telefono || null,
        email: currentCliente.email || null,
        ruc: currentCliente.ruc || null,
        razon_social: currentCliente.razon_social || null,
        representante: currentCliente.representante || null,
        notas: currentCliente.notas || null,
        fecha_proxima_llamada: currentCliente.fecha_proxima_llamada || null,
        fecha_proxima_visita: currentCliente.fecha_proxima_visita || null,
        fecha_proxima_reunion: currentCliente.fecha_proxima_reunion || null,
        created_by: user.id,
      };

      if (isEditing && currentCliente.id) {
        let query = supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', currentCliente.id);

        if (userRole !== 'administrador') {
          query = query.eq('created_by', user.id);
        }

        const { error } = await query;
        if (error) throw error;
        setSnackbar({ open: true, message: 'Cliente actualizado correctamente', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([clienteData]);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Cliente creado correctamente', severity: 'success' });
      }

      handleCloseDialog();
      fetchClientes();
    } catch (error: any) {
      console.error('Error al guardar cliente:', error);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para realizar esta acción'
          : `Error al guardar cliente: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleImportClientes = async () => {
    if (!importFile) {
      setImportError('Por favor, selecciona un archivo Excel (.xls o .xlsx).');
      return;
    }

    if (!user || (userRole !== 'administrador' && userRole !== 'asesor')) {
      setSnackbar({ open: true, message: 'No tienes permiso para importar clientes', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

      if (jsonData.length < 2) {
        throw new Error('El archivo Excel está vacío o no tiene datos válidos.');
      }

      const headers = jsonData[0] as string[];
      const expectedHeaders = [
        'nombre', 'telefono', 'email', 'ruc', 'razon_social', 'representante',
        'notas', 'fecha_proxima_llamada', 'fecha_proxima_visita', 'fecha_proxima_reunion'
      ];

      const headersMatch = expectedHeaders.every((header, index) => header === headers[index]?.toLowerCase());
      if (!headersMatch) {
        throw new Error('Los encabezados del archivo Excel no coinciden. Descarga el archivo de ejemplo para verificar el formato.');
      }

     // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     // const telefonoRegex = /^\+?\d{9,15}$/;
     // const rucRegex = /^\d{11}$/;

      const clientesData: Partial<Cliente>[] = (jsonData.slice(1) as any[][]).map((row) => {
        const rowData = row.reduce((acc, value, i) => {
          acc[headers[i]] = value === undefined || value === '' ? null : value;
          return acc;
        }, {} as any);

        const validateDate = (date: any) => {
          if (!date) return null;
          let parsedDate: Date;
          if (date instanceof Date) {
            parsedDate = date;
          } else if (typeof date === 'string') {
            parsedDate = new Date(date);
          } else if (typeof date === 'number') {
            parsedDate = XLSX.SSF.parse_date_code(date);
          } else {
            return null;
          }
          return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
        };

        // Validaciones
    //    if (rowData.email && !emailRegex.test(rowData.email)) {
    //      throw new Error(`Formato de email inválido en fila ${index + 2}: ${rowData.nombre || 'sin nombre'}`);
    //    }
    //    if (rowData.telefono && !telefonoRegex.test(String(rowData.telefono))) {
    //      throw new Error(`Formato de teléfono inválido en fila ${index + 2}: ${rowData.nombre || 'sin nombre'}`);
    //    }
      //  if (rowData.ruc && !rucRegex.test(String(rowData.ruc))) {
        //  throw new Error(`RUC inválido en fila ${index + 2}: ${rowData.nombre || 'sin nombre'}`);
        //}

        return {
          nombre: rowData.nombre ? String(rowData.nombre) : null,
          telefono: rowData.telefono ? String(rowData.telefono) : null,
          email: rowData.email ? String(rowData.email) : null,
          ruc: rowData.ruc ? String(rowData.ruc) : null,
          razon_social: rowData.razon_social ? String(rowData.razon_social) : null,
          representante: rowData.representante ? String(rowData.representante) : null,
          notas: rowData.notas ? String(rowData.notas) : null,
          fecha_proxima_llamada: validateDate(rowData.fecha_proxima_llamada),
          fecha_proxima_visita: validateDate(rowData.fecha_proxima_visita),
          fecha_proxima_reunion: validateDate(rowData.fecha_proxima_reunion),
          created_by: user.id,
        };
      });

      const batchSize = 100;
      for (let i = 0; i < clientesData.length; i += batchSize) {
        const batch = clientesData.slice(i, i + batchSize);
        const { error } = await supabase.from('clientes').insert(batch);
        if (error) throw error;
      }

      setSnackbar({ open: true, message: `Se importaron ${clientesData.length} clientes correctamente`, severity: 'success' });
      handleCloseImportDialog();
      fetchClientes();
    } catch (error: any) {
      console.error('Error al importar clientes:', error.message);
      setImportError(`Error al importar clientes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !file.name.match(/\.(xls|xlsx)$/)) {
      setImportError('Por favor, selecciona un archivo Excel (.xls o .xlsx).');
      return;
    }
    setImportFile(file);
    setImportError(null);
  };

  const handleDeleteCliente = async (id: string) => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole !== 'administrador') {
      setSnackbar({ open: true, message: 'Solo los administradores pueden eliminar clientes', severity: 'error' });
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Cliente eliminado correctamente', severity: 'success' });
        fetchClientes();
      } catch (error: any) {
        console.error('Error al eliminar cliente:', error);
        setSnackbar({
          open: true,
          message: error.message.includes('violates row-level security policy')
            ? 'No tienes permiso para eliminar este cliente'
            : `Error al eliminar cliente: ${error.message}`,
          severity: 'error',
        });
      }
    }
  };

  const handleWhatsAppClick = (telefono: string | null) => {
    if (!telefono) {
      setSnackbar({ open: true, message: 'No se proporcionó un número de teléfono', severity: 'error' });
      return;
    }
    const numeroLimpio = telefono.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${numeroLimpio}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePhoneCall = (telefono: string | null) => {
    if (!telefono) {
      setSnackbar({ open: true, message: 'No se proporcionó un número de teléfono', severity: 'error' });
      return;
    }
    const numeroLimpio = telefono.replace(/\D/g, '');
    const telUrl = `tel:${numeroLimpio}`;
    window.location.href = telUrl;
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const isDatePast = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date < new Date();
  };

  const isDateSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 3;
  };

  const renderClienteInfo = (cliente: Cliente) => {
    switch (tabValue) {
      case 0: // Información general
        return (
          <TableRow
            key={cliente.id}
            sx={{
              '&:nth-of-type(odd)': { backgroundColor: theme.palette.background.default },
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
          >
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.nombre || '-'}</TableCell>
            <TableCell sx={{ py: 1.5 }}>
              {cliente.telefono ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Llamar">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handlePhoneCall(cliente.telefono)}
                      sx={{ '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' } }}
                    >
                      <PhoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Box
                    component="span"
                    onClick={() => handlePhoneCall(cliente.telefono)}
                    sx={{
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      '&:hover': { textDecoration: 'underline', color: theme.palette.primary.main },
                    }}
                  >
                    {cliente.telefono}
                  </Box>
                  <Tooltip title="Enviar WhatsApp">
                    <IconButton
                      size="small"
                      sx={{ color: '#25D366', '&:hover': { bgcolor: '#25D366', color: '#fff' } }}
                      onClick={() => handleWhatsAppClick(cliente.telefono)}
                    >
                      <WhatsAppIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : '-'}
            </TableCell>
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.email || '-'}</TableCell>
            <TableCell sx={{ py: 1.5 }}>
              {cliente.ruc && (
                <Tooltip title="RUC">
                  <Chip
                    icon={<BusinessIcon />}
                    label={cliente.ruc}
                    size="small"
                    sx={{ bgcolor: theme.palette.grey[200], color: theme.palette.text.primary }}
                  />
                </Tooltip>
              )}
            </TableCell>
            <TableCell align="center" sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Tooltip title="Editar">
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(cliente)}
                    sx={{ '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' } }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteCliente(cliente.id)}
                    sx={{ '&:hover': { bgcolor: theme.palette.error.light, color: '#fff' } }}
                    disabled={userRole !== 'administrador'}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
          </TableRow>
        );
      case 1: // Información empresarial
        return (
          <TableRow
            key={cliente.id}
            sx={{
              '&:nth-of-type(odd)': { backgroundColor: theme.palette.background.default },
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
          >
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.nombre || '-'}</TableCell>
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.razon_social || '-'}</TableCell>
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.representante || '-'}</TableCell>
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.ruc || '-'}</TableCell>
            <TableCell align="center" sx={{ py: 1.5 }}>
              <Tooltip title="Editar">
                <IconButton
                  color="primary"
                  onClick={() => handleOpenDialog(cliente)}
                  sx={{ '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        );
      case 2: // Programación
        return (
          <TableRow
            key={cliente.id}
            sx={{
              '&:nth-of-type(odd)': { backgroundColor: theme.palette.background.default },
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
          >
            <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{cliente.nombre || '-'}</TableCell>
            <TableCell sx={{ py: 1.5 }}>
              {cliente.fecha_proxima_llamada ? (
                <Chip
                  icon={<PhoneIcon />}
                  label={formatDate(cliente.fecha_proxima_llamada)}
                  color={isDatePast(cliente.fecha_proxima_llamada) ? 'error' : isDateSoon(cliente.fecha_proxima_llamada) ? 'warning' : 'default'}
                  sx={{ bgcolor: isDatePast(cliente.fecha_proxima_llamada) ? theme.palette.error.light : isDateSoon(cliente.fecha_proxima_llamada) ? theme.palette.warning.light : theme.palette.grey[200] }}
                />
              ) : '-'}
            </TableCell>
            <TableCell sx={{ py: 1.5 }}>
              {cliente.fecha_proxima_visita ? (
                <Chip
                  icon={<EventIcon />}
                  label={formatDate(cliente.fecha_proxima_visita)}
                  color={isDatePast(cliente.fecha_proxima_visita) ? 'error' : isDateSoon(cliente.fecha_proxima_visita) ? 'warning' : 'default'}
                  sx={{ bgcolor: isDatePast(cliente.fecha_proxima_visita) ? theme.palette.error.light : isDateSoon(cliente.fecha_proxima_visita) ? theme.palette.warning.light : theme.palette.grey[200] }}
                />
              ) : '-'}
            </TableCell>
            <TableCell sx={{ py: 1.5 }}>
              {cliente.fecha_proxima_reunion ? (
                <Chip
                  icon={<CalendarIcon />}
                  label={formatDate(cliente.fecha_proxima_reunion)}
                  color={isDatePast(cliente.fecha_proxima_reunion) ? 'error' : isDateSoon(cliente.fecha_proxima_reunion) ? 'warning' : 'default'}
                  sx={{ bgcolor: isDatePast(cliente.fecha_proxima_reunion) ? theme.palette.error.light : isDateSoon(cliente.fecha_proxima_reunion) ? theme.palette.warning.light : theme.palette.grey[200] }}
                />
              ) : '-'}
            </TableCell>
            <TableCell align="center" sx={{ py: 1.5 }}>
              <Tooltip title="Editar">
                <IconButton
                  color="primary"
                  onClick={() => handleOpenDialog(cliente)}
                  sx={{ '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        );
      default:
        return null;
    }
  };

  const getTableHeaders = () => {
    switch (tabValue) {
      case 0: // Información general
        return (
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Nombre</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Teléfono</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>RUC</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Acciones</TableCell>
          </TableRow>
        );
      case 1: // Información empresarial
        return (
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Nombre</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Razón Social</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Representante</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>RUC</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Acciones</TableCell>
          </TableRow>
        );
      case 2: // Programación
        return (
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Nombre</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Próxima Llamada</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Próxima Visita</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Próxima Reunión</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100] }}>Acciones</TableCell>
          </TableRow>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        p: { xs: 2, sm: 3, md: 4 },
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[3],
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: theme.palette.text.primary }}
        >
          Gestión de Clientes
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
            disabled={userRole === null || userRole === 'cliente'}
          >
            Nuevo Cliente
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<UploadIcon />}
            onClick={handleOpenImportDialog}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
            disabled={userRole === null || userRole === 'cliente'}
          >
            Importar Clientes
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="client tabs"
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              color: theme.palette.text.secondary,
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
            },
          }}
        >
          <Tab label="Información General" />
          <Tab label="Información Empresarial" />
          <Tab label="Programación" />
        </Tabs>

        {tabValue === 2 && (
          <FormControl
            variant="outlined"
            sx={{ minWidth: { xs: '100%', sm: 200 }, mb: 2 }}
          >
            <InputLabel id="filtro-select-label">Filtrar por</InputLabel>
            <Select
              labelId="filtro-select-label"
              id="filtro-select"
              value={filtro}
              onChange={handleFiltroChange}
              label="Filtrar por"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="todos">Todos los clientes</MenuItem>
              <MenuItem value="proxima_llamada">Con próxima llamada</MenuItem>
              <MenuItem value="proxima_visita">Con próxima visita</MenuItem>
              <MenuItem value="proxima_reunion">Con próxima reunión</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            bgcolor: theme.palette.background.default,
            borderRadius: 2,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Paper
          sx={{
            width: '100%',
            overflow: 'hidden',
            borderRadius: 2,
            boxShadow: theme.shadows[3],
          }}
        >
          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                {getTableHeaders()}
              </TableHead>
              <TableBody>
                {clientes
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((cliente) => renderClienteInfo(cliente))}
                {clientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, fontSize: '1rem', color: theme.palette.text.secondary }}>
                      No hay clientes registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={clientes.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
          />
        </Paper>
      )}

      {/* Diálogo para agregar/editar cliente */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="client form tabs"
              sx={{
                mb: 2,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '1rem',
                },
                '& .Mui-selected': {
                  color: theme.palette.primary.main,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            >
              <Tab label="Información General" />
              <Tab label="Información Empresarial" />
              <Tab label="Programación" />
            </Tabs>

            {tabValue === 0 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    autoFocus
                    margin="dense"
                    name="nombre"
                    label="Nombre (opcional)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.nombre || ''}
                    onChange={handleInputChange}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 255 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    name="telefono"
                    label="Teléfono (opcional)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.telefono || ''}
                    onChange={handleInputChange}
                    helperText="Incluye el código de país, 9-15 dígitos (ej: +51987654321)"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 15 }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    margin="dense"
                    name="email"
                    label="Email (opcional)"
                    type="email"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.email || ''}
                    onChange={handleInputChange}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 255 }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    margin="dense"
                    name="notas"
                    label="Notas (opcional)"
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    value={currentCliente.notas || ''}
                    onChange={handleInputChange}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 1000 }}
                  />
                </Grid>
              </Grid>
            )}

            {tabValue === 1 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    name="ruc"
                    label="RUC (opcional)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.ruc || ''}
                    onChange={handleInputChange}
                    helperText="Debe tener 11 dígitos"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 11 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    name="razon_social"
                    label="Razón Social (opcional)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.razon_social || ''}
                    onChange={handleInputChange}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 255 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    margin="dense"
                    name="representante"
                    label="Representante Legal (opcional)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.representante || ''}
                    onChange={handleInputChange}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    inputProps={{ maxLength: 255 }}
                  />
                </Grid>
              </Grid>
            )}

            {tabValue === 2 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                    Próxima Llamada
                  </Typography>
                  <DateTimePicker
                    label="Fecha y hora (opcional)"
                    value={currentCliente.fecha_proxima_llamada ? new Date(currentCliente.fecha_proxima_llamada) : null}
                    onChange={(newDate) => handleDateChange('fecha_proxima_llamada', newDate)}
                    sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                    Próxima Visita
                  </Typography>
                  <DateTimePicker
                    label="Fecha y hora (opcional)"
                    value={currentCliente.fecha_proxima_visita ? new Date(currentCliente.fecha_proxima_visita) : null}
                    onChange={(newDate) => handleDateChange('fecha_proxima_visita', newDate)}
                    sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                    Próxima Reunión
                  </Typography>
                  <DateTimePicker
                    label="Fecha y hora (opcional)"
                    value={currentCliente.fecha_proxima_reunion ? new Date(currentCliente.fecha_proxima_reunion) : null}
                    onChange={(newDate) => handleDateChange('fecha_proxima_reunion', newDate)}
                    sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            )}
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveCliente}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para importación masiva */}
      <Dialog
        open={openImportDialog}
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          Importar Clientes desde Excel
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
              Sube un archivo Excel (.xls o .xlsx) con los datos de los clientes. La primera hoja debe tener las siguientes columnas:
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, color: theme.palette.text.secondary }}>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>nombre</strong>: Nombre del cliente (opcional)</li>
                <li><strong>telefono</strong>: Teléfono con código de país, 9-15 dígitos, ej: +51987654321 (opcional)</li>
                <li><strong>email</strong>: Correo electrónico (opcional)</li>
                <li><strong>ruc</strong>: RUC de 11 dígitos (opcional)</li>
                <li><strong>razon_social</strong>: Razón social de la empresa (opcional)</li>
                <li><strong>representante</strong>: Nombre del representante legal (opcional)</li>
                <li><strong>notas</strong>: Notas adicionales (opcional)</li>
                <li><strong>fecha_proxima_llamada</strong>: Fecha y hora, ej: 2025-09-10 10:00:00 o formato Excel (opcional)</li>
                <li><strong>fecha_proxima_visita</strong>: Fecha y hora (opcional)</li>
                <li><strong>fecha_proxima_reunion</strong>: Fecha y hora (opcional)</li>
              </ul>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Descarga un{' '}
              <Link
                href="#"
                onClick={() => downloadSampleExcel()}
                sx={{ color: theme.palette.primary.main, '&:hover': { textDecoration: 'underline' } }}
              >
                archivo Excel de ejemplo
              </Link>{' '}
              para guiarte.
              <br />
              <strong>Nota:</strong> Usa la primera hoja del archivo Excel. Asegúrate de que los encabezados coincidan exactamente con los indicados. Todos los campos son opcionales.
            </Typography>
          </Box>
          <Input
            type="file"
            inputProps={{ accept: '.xls,.xlsx' }}
            onChange={handleFileChange}
            fullWidth
            sx={{ mb: 2, borderRadius: 2 }}
          />
          {importError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {importError}
            </Alert>
          )}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={32} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseImportDialog}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportClientes}
            variant="contained"
            color="primary"
            disabled={!importFile || loading}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Importar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Función para descargar un archivo Excel de ejemplo
const downloadSampleExcel = () => {
  const sampleData = [
    {
      nombre: "Juan Pérez",
      telefono: "+51987654321",
      email: "juan.perez@example.com",
      ruc: "12345678901",
      razon_social: "Pérez SAC",
      representante: "Juan Pérez",
      notas: "Interesado en producto A, requiere seguimiento",
      fecha_proxima_llamada: "2025-09-10 10:00:00",
      fecha_proxima_visita: "",
      fecha_proxima_reunion: "2025-09-15 14:00:00",
    },
    {
      nombre: "",
      telefono: "+51912345678",
      email: "maria.lopez@example.com",
      ruc: "98765432109",
      razon_social: "López EIRL",
      representante: "María López",
      notas: "Prefiere contacto por WhatsApp",
      fecha_proxima_llamada: "",
      fecha_proxima_visita: "2025-09-12 09:00:00",
      fecha_proxima_reunion: "",
    },
    {
      nombre: "Carlos Gómez",
      telefono: "",
      email: "",
      ruc: "",
      razon_social: "",
      representante: "",
      notas: "Cliente potencial, necesita más información",
      fecha_proxima_llamada: "2025-09-11 15:30:00",
      fecha_proxima_visita: "",
      fecha_proxima_reunion: "",
    },
    {
      nombre: "",
      telefono: "",
      email: "ana.torres@example.com",
      ruc: "45678912345",
      razon_social: "Torres Consulting",
      representante: "Ana Torres",
      notas: "",
      fecha_proxima_llamada: "",
      fecha_proxima_visita: "2025-09-13 11:00:00",
      fecha_proxima_reunion: "2025-09-20 16:00:00",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

  worksheet['!cols'] = [
    { wch: 20 }, // nombre
    { wch: 15 }, // telefono
    { wch: 25 }, // email
    { wch: 15 }, // ruc
    { wch: 20 }, // razon_social
    { wch: 20 }, // representante
    { wch: 30 }, // notas
    { wch: 20 }, // fecha_proxima_llamada
    { wch: 20 }, // fecha_proxima_visita
    { wch: 20 }, // fecha_proxima_reunion
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'clientes_ejemplo.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default Clientes;