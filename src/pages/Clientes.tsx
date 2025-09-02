import { useState, useEffect } from 'react'
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, Box, IconButton, CircularProgress, Snackbar, Alert, TablePagination,
  Tabs, Tab, Chip, Tooltip, Grid, FormControl, InputLabel, Select, MenuItem, useTheme,
  createTheme, ThemeProvider

} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { es } from 'date-fns/locale'
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  WhatsApp as WhatsAppIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material'
import { supabase } from '../services/supabase'

type Cliente = {
  id: string
  nombre: string
  telefono: string
  email: string
  ruc: string
  razon_social: string
  representante: string
  notas: string
  fecha_proxima_llamada: string | null
  fecha_proxima_visita: string | null
  fecha_proxima_reunion: string | null
  created_at: string
}

const Clientes = () => {
  const theme = useTheme();
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [currentCliente, setCurrentCliente] = useState<Partial<Cliente>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [tabValue, setTabValue] = useState(0)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    fetchClientes()
  }, [filtro])

  const fetchClientes = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('clientes')
        .select('*')

      // Aplicar filtros si es necesario
      if (filtro === 'proxima_llamada') {
        query = query.not('fecha_proxima_llamada', 'is', null)
      } else if (filtro === 'proxima_visita') {
        query = query.not('fecha_proxima_visita', 'is', null)
      } else if (filtro === 'proxima_reunion') {
        query = query.not('fecha_proxima_reunion', 'is', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setClientes(data || [])
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message)
      setSnackbar({ open: true, message: `Error al cargar clientes: ${error.message}`, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setCurrentCliente(cliente)
      setIsEditing(true)
    } else {
      setCurrentCliente({})
      setIsEditing(false)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setCurrentCliente({})
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCurrentCliente({ ...currentCliente, [name]: value })
  }

  const handleDateChange = (field: string, newDate: Date | null) => {
    if (newDate) {
      setCurrentCliente({ ...currentCliente, [field]: newDate.toISOString() })
    } else {
      setCurrentCliente({ ...currentCliente, [field]: null })
    }
  }

  const handleFiltroChange = (event: SelectChangeEvent<string>) => {
    setFiltro(event.target.value as string);
  };

  const handleSaveCliente = async () => {
    try {
      if (!currentCliente.nombre || !currentCliente.telefono) {
        setSnackbar({ open: true, message: 'Nombre y teléfono son obligatorios', severity: 'error' })
        return
      }

      const clienteData = {
        id: isEditing ? currentCliente.id : crypto.randomUUID(),
        nombre: currentCliente.nombre,
        telefono: currentCliente.telefono,
        email: currentCliente.email || null,
        ruc: currentCliente.ruc || null,
        razon_social: currentCliente.razon_social || null,
        representante: currentCliente.representante || null,
        notas: currentCliente.notas || null,
        fecha_proxima_llamada: currentCliente.fecha_proxima_llamada || null,
        fecha_proxima_visita: currentCliente.fecha_proxima_visita || null,
        fecha_proxima_reunion: currentCliente.fecha_proxima_reunion || null
      }

      if (isEditing && currentCliente.id) {
        const { error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', currentCliente.id)

        if (error) throw error
        setSnackbar({ open: true, message: 'Cliente actualizado correctamente', severity: 'success' })
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([clienteData])

        if (error) throw error
        setSnackbar({ open: true, message: 'Cliente agregado correctamente', severity: 'success' })
      }

      handleCloseDialog()
      fetchClientes()
    } catch (error: any) {
      console.error('Error al guardar cliente:', error.message)
      setSnackbar({ open: true, message: `Error al guardar cliente: ${error.message}`, severity: 'error' })
    }
  }

  const handleDeleteCliente = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id)

        if (error) throw error
        setSnackbar({ open: true, message: 'Cliente eliminado correctamente', severity: 'success' })
        fetchClientes()
      } catch (error: any) {
        console.error('Error al eliminar cliente:', error.message)
        setSnackbar({ open: true, message: `Error al eliminar cliente: ${error.message}`, severity: 'error' })
      }
    }
  }

  const handleWhatsAppClick = (telefono: string) => {
    // Eliminar cualquier carácter no numérico del número de teléfono
    const numeroLimpio = telefono.replace(/\D/g, '')
    // Crear el enlace de WhatsApp
    const whatsappUrl = `https://wa.me/${numeroLimpio}`
    // Abrir en una nueva pestaña
    window.open(whatsappUrl, '_blank')
  }
  
  const handlePhoneCall = (telefono: string) => {
    // Eliminar cualquier carácter no numérico del número de teléfono
    const numeroLimpio = telefono.replace(/\D/g, '')
    // Crear el enlace para llamada telefónica
    const telUrl = `tel:${numeroLimpio}`
    // Iniciar la llamada
    window.location.href = telUrl
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const isDatePast = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    return date < new Date()
  }

  const isDateSoon = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = diffTime / (1000 * 3600 * 24)
    return diffDays > 0 && diffDays <= 3
  }

  const renderClienteInfo = (cliente: Cliente) => {
    switch (tabValue) {
      case 0: // Información general
        return (
          <TableRow key={cliente.id}>
            <TableCell>{cliente.nombre}</TableCell>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Llamar">
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={() => handlePhoneCall(cliente.telefono)}
                  >
                    <PhoneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Box 
                  component="span" 
                  onClick={() => handlePhoneCall(cliente.telefono)}
                  sx={{ 
                    cursor: 'pointer', 
                    '&:hover': { textDecoration: 'underline', color: theme.palette.primary.main } 
                  }}
                >
                  {cliente.telefono}
                </Box>
                <Tooltip title="Enviar WhatsApp">
                  <IconButton 
                    size="small" 
                    color="success" 
                    onClick={() => handleWhatsAppClick(cliente.telefono)}
                  >
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{cliente.email || '-'}</TableCell>
            <TableCell>
              {cliente.ruc && (
                <Tooltip title="RUC">
                  <Chip 
                    icon={<BusinessIcon />} 
                    label={cliente.ruc} 
                    size="small" 
                    sx={{ mr: 1, mb: 1 }} 
                  />
                </Tooltip>
              )}
            </TableCell>
            <TableCell align="center">
              <IconButton
                color="primary"
                onClick={() => handleWhatsAppClick(cliente.telefono)}
                title="Enviar WhatsApp"
              >
                <WhatsAppIcon />
              </IconButton>
              <IconButton
                color="primary"
                onClick={() => handleOpenDialog(cliente)}
                title="Editar"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                color="error"
                onClick={() => handleDeleteCliente(cliente.id)}
                title="Eliminar"
              >
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        )
      case 1: // Información empresarial
        return (
          <TableRow key={cliente.id}>
            <TableCell>{cliente.nombre}</TableCell>
            <TableCell>{cliente.razon_social || '-'}</TableCell>
            <TableCell>{cliente.representante || '-'}</TableCell>
            <TableCell>{cliente.ruc || '-'}</TableCell>
            <TableCell align="center">
              <IconButton
                color="primary"
                onClick={() => handleOpenDialog(cliente)}
                title="Editar"
              >
                <EditIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        )
      case 2: // Programación
        return (
          <TableRow key={cliente.id}>
            <TableCell>{cliente.nombre}</TableCell>
            <TableCell>
              {cliente.fecha_proxima_llamada ? (
                <Chip 
                  icon={<PhoneIcon />} 
                  label={formatDate(cliente.fecha_proxima_llamada)}
                  color={isDatePast(cliente.fecha_proxima_llamada) ? 'error' : isDateSoon(cliente.fecha_proxima_llamada) ? 'warning' : 'default'}
                  sx={{ mb: 1 }} 
                />
              ) : '-'}
            </TableCell>
            <TableCell>
              {cliente.fecha_proxima_visita ? (
                <Chip 
                  icon={<EventIcon />} 
                  label={formatDate(cliente.fecha_proxima_visita)}
                  color={isDatePast(cliente.fecha_proxima_visita) ? 'error' : isDateSoon(cliente.fecha_proxima_visita) ? 'warning' : 'default'}
                  sx={{ mb: 1 }} 
                />
              ) : '-'}
            </TableCell>
            <TableCell>
              {cliente.fecha_proxima_reunion ? (
                <Chip 
                  icon={<CalendarIcon />} 
                  label={formatDate(cliente.fecha_proxima_reunion)}
                  color={isDatePast(cliente.fecha_proxima_reunion) ? 'error' : isDateSoon(cliente.fecha_proxima_reunion) ? 'warning' : 'default'}
                  sx={{ mb: 1 }} 
                />
              ) : '-'}
            </TableCell>
            <TableCell align="center">
              <IconButton
                color="primary"
                onClick={() => handleOpenDialog(cliente)}
                title="Editar"
              >
                <EditIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        )
      default:
        return null
    }
  }

  const getTableHeaders = () => {
    switch (tabValue) {
      case 0: // Información general
        return (
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>RUC</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        )
      case 1: // Información empresarial
        return (
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Razón Social</TableCell>
            <TableCell>Representante</TableCell>
            <TableCell>RUC</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        )
      case 2: // Programación
        return (
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Próxima Llamada</TableCell>
            <TableCell>Próxima Visita</TableCell>
            <TableCell>Próxima Reunión</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        )
      default:
        return null
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gestión de Clientes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Cliente
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="client tabs" sx={{ mb: 2 }}>
          <Tab label="Información General" />
          <Tab label="Información Empresarial" />
          <Tab label="Programación" />
        </Tabs>

        {tabValue === 2 && (
          <FormControl variant="outlined" sx={{ minWidth: 200, mb: 2 }}>
            <InputLabel id="filtro-select-label">Filtrar por</InputLabel>
            <Select
              labelId="filtro-select-label"
              id="filtro-select"
              value={filtro}
              onChange={handleFiltroChange}
              label="Filtrar por"
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
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
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
                    <TableCell colSpan={5} align="center">
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
          />
        </Paper>
      )}

      {/* Diálogo para agregar/editar cliente */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="client form tabs" sx={{ mb: 2 }}>
              <Tab label="Información General" />
              <Tab label="Información Empresarial" />
              <Tab label="Programación" />
            </Tabs>

            {tabValue === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    autoFocus
                    margin="dense"
                    name="nombre"
                    label="Nombre"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.nombre || ''}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="telefono"
                    label="Teléfono"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.telefono || ''}
                    onChange={handleInputChange}
                    required
                    helperText="Incluye el código de país (ej: +51987654321)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    margin="dense"
                    name="email"
                    label="Email"
                    type="email"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.email || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    margin="dense"
                    name="notas"
                    label="Notas"
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    value={currentCliente.notas || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            )}

            {tabValue === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="ruc"
                    label="RUC"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.ruc || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="razon_social"
                    label="Razón Social"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.razon_social || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    margin="dense"
                    name="representante"
                    label="Representante Legal"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={currentCliente.representante || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            )}

            {tabValue === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Próxima Llamada
                  </Typography>
                  <DateTimePicker
                    label="Fecha y hora"
                    value={currentCliente.fecha_proxima_llamada ? new Date(currentCliente.fecha_proxima_llamada) : null}
                    onChange={(newDate) => handleDateChange('fecha_proxima_llamada', newDate)}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Próxima Visita
                  </Typography>
                  <DateTimePicker
                    label="Fecha y hora"
                    value={currentCliente.fecha_proxima_visita ? new Date(currentCliente.fecha_proxima_visita) : null}
                    onChange={(newDate) => handleDateChange('fecha_proxima_visita', newDate)}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Próxima Reunión
                  </Typography>
                  <DateTimePicker
                    label="Fecha y hora"
                    value={currentCliente.fecha_proxima_reunion ? new Date(currentCliente.fecha_proxima_reunion) : null}
                    onChange={(newDate) => handleDateChange('fecha_proxima_reunion', newDate)}
                    sx={{ width: '100%' }}
                  />
                </Grid>
              </Grid>
            )}
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveCliente} variant="contained" color="primary">
            Guardar
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default Clientes