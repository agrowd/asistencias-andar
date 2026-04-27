import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Loader2,
  Filter,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Download,
  History,
  LogOut,
  Lock,
  User as UserIcon,
  AlertCircle,
  TableProperties,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Alumno {
  id: number;
  apellido: string;
  nombre: string;
  grupo: string;
}

interface AsistenciaState {
  [key: number]: number; // 0: Absent, 1: Present, 2: Justified
}

interface ObservationState {
  [key: number]: string;
}
function App() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('Centro de Día');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendance, setAttendance] = useState<AsistenciaState>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'attendance' | 'reports' | 'students' | 'users' | 'history' | 'monthly'>('attendance');
  const [stats, setStats] = useState<any>(null);
  const [criticalAlumnos, setCriticalAlumnos] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [showSidebar, setShowSidebar] = useState(false);
  const [monthlyGroupFilter, setMonthlyGroupFilter] = useState('Todos');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [modal, setModal] = useState<{ type: 'student' | 'user' | 'detail' | null, data?: any }>({ type: null });
  const [studentForm, setStudentForm] = useState({ nombre: '', apellido: '', grupo: 'Centro de Día' });
  const [userForm, setUserForm] = useState({ username: '', password: '', rol: 'profe' });
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [observations, setObservations] = useState<ObservationState>({});
  const [showJustifyModal, setShowJustifyModal] = useState<{ show: boolean, alumnoId: number | null }>({ show: false, alumnoId: null });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchAlumnos();
      if (view === 'reports' || view === 'attendance') fetchStats();
      if (view === 'history') fetchHistory();
      if (view === 'users') fetchUsers();
    }
  }, [token, view, historyFilter.month, historyFilter.year]);

  useEffect(() => {
    fetchAttendanceForDate();
  }, [date, alumnos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setLoginError(data.error);
      }
    } catch (err) {
      setLoginError('Error de conexión');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('attendance');
  };

  const handleResponse = async (res: Response) => {
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  };

  const fetchStats = async () => {
    try {
      const summaryRes = await fetch('/api/stats/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const summaryData = await handleResponse(summaryRes);
      
      const criticalRes = await fetch('/api/stats/critical', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const criticalData = await handleResponse(criticalRes);

      if (summaryData) setStats(summaryData);
      if (criticalData) setCriticalAlumnos(criticalData);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchUsers = async () => {
    if (!token || user.rol !== 'admin') return;
    try {
      const res = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleResponse(res);
      if (data) setUsersList(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/asistencias/history?month=${historyFilter.month}&year=${historyFilter.year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleResponse(res);
      if (data) setHistoryData(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleAddAlumno = async () => {
    if (!studentForm.nombre || !studentForm.apellido) return;
    try {
      const isEdit = modal.data?.id;
      const url = isEdit ? `/api/alumnos/${modal.data.id}` : '/api/alumnos';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      const data = await handleResponse(res);
      if (data) {
        fetchAlumnos();
        setModal({ type: null });
        setStudentForm({ nombre: '', apellido: '', grupo: 'Centro de Día' });
      }
    } catch (err) {
      console.error('Failed to save alumno', err);
    }
  };

  const handleAddUser = async () => {
    if (!userForm.username || (!modal.data && !userForm.password)) return;
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });
      const data = await handleResponse(res);
      if (data) {
        setModal({ type: null });
        setUserForm({ username: '', password: '', rol: 'profe' });
        fetchUsers();
        alert('Usuario guardado con éxito');
      }
    } catch (err: any) {
      console.error('Failed to add user', err);
      alert('Error al guardar usuario: ' + err.message);
    }
  };

  const fetchStudentHistory = async (alumnoId: number) => {
    try {
      const res = await fetch(`/api/asistencias/history?alumno_id=${alumnoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleResponse(res);
      if (data) setStudentHistory(data);
    } catch (err) {
      console.error('Failed to fetch student history', err);
    }
  };

  const fetchAlumnos = async () => {
    try {
      const res = await fetch('/api/alumnos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleResponse(res);
      if (Array.isArray(data)) {
        setAlumnos(data);
      }
    } catch (err) {
      console.error('Failed to fetch alumnos', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async () => {
    if (alumnos.length === 0 || !token) return;
    try {
      const res = await fetch(`/api/asistencias?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleResponse(res);
      if (!data) return;

      const newState: AsistenciaState = {};
      const newObs: ObservationState = {};

      // VOLVEMOS A LOGICA INVERSA: Todos presentes por defecto (1)
      alumnos.forEach(a => {
        newState[a.id] = 1;
      });
      
      // Si hay registro en DB, sobreescribimos con la realidad guardada
      if (data && data.length > 0) {
        data.forEach((a: any) => {
          newState[a.alumno_id] = a.presente; // 0, 1, 2
          if (a.observacion) newObs[a.alumno_id] = a.observacion;
          if (a.profesor_nombre) {
            (newState as any)[`prof_${a.alumno_id}`] = a.profesor_nombre;
          }
        });
      }
      
      setAttendance(newState);
      setObservations(newObs);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  };
  const resetAttendanceToPresent = () => {
    const newState: AsistenciaState = {};
    alumnos.forEach(a => {
      newState[a.id] = 1;
    });
    setAttendance(newState);
  };

  const toggleAttendance = (id: number) => {
    setAttendance(prev => {
      // Si es undefined, asumimos que es 1 (Presente) por defecto
      const currentState = prev[id] === undefined ? 1 : prev[id];
      
      // Ciclo: 1 (Presente) -> 0 (Ausente) -> 2 (Justificado) -> 1
      let nextState = 1;
      if (currentState === 1) {
        nextState = 0; // De presente a ausente (SIN MODAL)
      } else if (currentState === 0) {
        nextState = 2; // De ausente a justificado (CON MODAL)
        setShowJustifyModal({ show: true, alumnoId: id });
      } else {
        nextState = 1; // De justificado vuelve a presente
      }
      
      return {
        ...prev,
        [id]: nextState
      };
    });
  };

  const handleSave = async () => {
    setShowConfirmModal(false);
    setSaveStatus('saving');
    try {
      const payload = {
        date,
        asistencias: Object.entries(attendance)
          .filter(([id]) => !id.startsWith('prof_'))
          .map(([id, present]) => ({
            alumno_id: parseInt(id),
            presente: present,
            observacion: observations[parseInt(id)] || null
          }))
      };

      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await handleResponse(res);
      if (data) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const filteredAlumnos = alumnos.filter(a => 
    a.grupo === selectedGroup && 
    (`${a.apellido} ${a.nombre}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exportToCSV = () => {
    const headers = ['Alumno', 'Grupo', 'Presente'];
    const rows = filteredAlumnos.map(a => [
      `${a.apellido} ${a.nombre}`,
      a.grupo,
      attendance[a.id] === 1 ? 'PRESENTE' : attendance[a.id] === 2 ? 'JUSTIFICADO' : 'AUSENTE'
    ]);
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");
    XLSX.writeFile(workbook, `asistencia_${date}_${selectedGroup}.xlsx`);
  };

  const exportToPDF = (data: any[] = filteredAlumnos, title: string = `Asistencia - ${selectedGroup}`) => {
    const doc = new (jsPDF as any)();
    
    // Header Institucional
    doc.setFillColor(99, 102, 241); // Indigo color
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ORGANIZACIÓN ANDAR", 14, 25);
    
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), 14, 34);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 48);
    doc.text(`Filtro aplicado: ${date}`, 14, 54);

    const tableData = data.map(a => {
      const state = a.presente !== undefined ? a.presente : attendance[a.id];
      const prof = a.profesor_nombre || (attendance as any)[`prof_${a.id}`] || '-';
      return [
        `${a.apellido} ${a.nombre}`,
        a.grupo,
        state === 1 ? 'PRESENTE' : state === 2 ? 'JUSTIFICADO' : 'AUSENTE',
        state !== 1 ? prof : '-'
      ];
    });

    (doc as any).autoTable({
      startY: 60,
      head: [['Nombre Completo', 'Grupo / Área', 'Estado', 'Registrado por']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 },
      alternateRowStyles: { fillColor: [245, 247, 255] }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount} - Andar CRM Asistencia`, 105, 285, { align: 'center' });
    }

    doc.save(`reporte_${date}_${selectedGroup}.pdf`);
  };

  const presentCount = filteredAlumnos.filter(a => attendance[a.id] === 1 || attendance[a.id] === undefined).length;

  if (!user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogin}
          className="glass-container" 
          style={{ width: '400px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(to bottom right, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'white' }}>
              <Lock size={32} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Andar CRM
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Inicia sesión para continuar</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Usuario</label>
            <input 
              type="text" 
              required
              className="glass-card"
              style={{ padding: '12px 16px', fontSize: '16px', outline: 'none' }}
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Contraseña</label>
            <input 
              type="password" 
              required
              className="glass-card"
              style={{ padding: '12px 16px', fontSize: '16px', outline: 'none' }}
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>

          {loginError && <p style={{ color: 'var(--danger)', fontSize: '14px', textAlign: 'center' }}>{loginError}</p>}

          <button 
            type="submit"
            style={{ 
              padding: '14px', 
              background: 'var(--accent-primary)', 
              color: 'white', 
              fontSize: '16px', 
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
            }}
          >
            Entrar al Panel
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className={`app-layout ${showSidebar ? 'sidebar-open' : ''}`} style={{ display: 'flex', height: '100vh', padding: '24px', gap: '24px', position: 'relative' }}>
      
      {/* Mobile Toggle */}
      <button 
        onClick={() => setShowSidebar(!showSidebar)}
        className="glass-card mobile-only"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 2000,
          width: '50px',
          height: '50px',
          display: 'none', // Controlled by CSS
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent-primary)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        {showSidebar ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - Navigation */}
      <aside className={`glass-container sidebar-nav ${showSidebar ? 'active' : ''}`} style={{ 
        width: '300px', 
        padding: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '32px',
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        transition: 'all 0.3s ease'
      }}>
        <header>
          <h1 style={{ fontSize: '24px', fontWeight: 700, background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
            Andar
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Control de Asistencias</p>
          <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>v1.2.2 - Ariadne v5.0</p>
        </header>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginLeft: '12px', marginBottom: '4px' }}>Módulos</p>
          {[
            { id: 'attendance', label: 'Asistencias', icon: CheckCircle2 },
            { id: 'history', label: 'Historial', icon: History },
            { id: 'monthly', label: 'Sábana Mensual', icon: TableProperties },
            user.rol === 'admin' && { id: 'reports', label: 'Reportes', icon: BarChart3 },
            user.rol === 'admin' && { id: 'students', label: 'Alumnos', icon: Users },
            user.rol === 'admin' && { id: 'users', label: 'Usuarios', icon: UserIcon },
          ].filter(Boolean).map((item: any) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id as any);
                setShowSidebar(false);
              }}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                gap: '12px',
                textAlign: 'left',
                background: view === item.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                borderColor: view === item.id ? 'var(--accent-primary)' : 'transparent',
              }}
            >
              <item.icon size={18} color={view === item.id ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              <span style={{ fontWeight: 600, color: view === item.id ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '14px' }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {view === 'attendance' && (
          <>
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)' }} />
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginLeft: '12px', marginBottom: '4px' }}>Grupos</p>
              {['Centro de Día', 'Emprendedores'].map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    gap: '12px',
                    textAlign: 'left',
                    background: selectedGroup === group ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderColor: selectedGroup === group ? 'var(--accent-primary)' : 'transparent',
                  }}
                >
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: selectedGroup === group ? 'var(--accent-primary)' : 'rgba(0,0,0,0.1)'
                  }} />
                  <span style={{ fontWeight: 500, fontSize: '14px', color: selectedGroup === group ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {group}
                  </span>
                </button>
              ))}
            </nav>
          </>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={handleLogout}
            className="glass-card" 
            style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            <LogOut size={18} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Cerrar Sesión</span>
          </button>

          <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Calendar size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Fecha de Carga</span>
          </div>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'white',
              fontFamily: 'inherit'
            }}
          />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
        
        {/* View Switcher */}
        {view === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Stats & Actions bar */}
            <div className="glass-container stats-bar" style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }} className="stats-info">
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{selectedGroup}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {presentCount} presentes / {filteredAlumnos.length} alumnos
                  </p>
                  <button 
                    onClick={resetAttendanceToPresent}
                    className="reset-button"
                    style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                  >
                    Reiniciar hoy a Presentes
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }} className="actions-group">
                <div style={{ position: 'relative', flex: 1 }} className="search-container">
                  <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar alumno..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '10px 12px 10px 36px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      background: 'rgba(255,255,255,0.8)',
                      width: '100%',
                      maxWidth: '240px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <button 
                  onClick={exportToCSV}
                  className="glass-card"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white' }}
                >
                  <Download size={18} /> Excel
                </button>

                <button 
                  onClick={() => exportToPDF()}
                  className="glass-card"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white' }}
                >
                  <Calendar size={18} /> PDF
                </button>

                <button 
                  onClick={() => setShowConfirmModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: saveStatus === 'success' ? 'var(--success)' : 'var(--accent-primary)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'success' ? 'Guardado' : 'Guardar Asistencia'}
                </button>
              </div>
            </div>

            {/* Attendance Grid */}
            <div className="glass-container" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
                  <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                  <AnimatePresence mode="popLayout">
                    {filteredAlumnos.map((alumno) => (
                      <motion.div
                        key={alumno.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="glass-card"
                        onClick={() => toggleAttendance(alumno.id)}
                        style={{
                          padding: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          cursor: 'pointer',
                          border: '2px solid transparent',
                          borderColor: (attendance[alumno.id] === 1 || attendance[alumno.id] === undefined) ? 'var(--success)' : attendance[alumno.id] === 2 ? '#f59e0b' : 'var(--danger)',
                          background: (attendance[alumno.id] === 1 || attendance[alumno.id] === undefined) ? 'rgba(34, 197, 94, 0.05)' : attendance[alumno.id] === 2 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                        }}
                      >
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '18px'
                        }}>
                          {alumno.apellido[0]}
                        </div>
                        
                        <div 
                          style={{ flex: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: 'detail', data: alumno });
                            fetchStudentHistory(alumno.id);
                          }}
                        >
                          <p style={{ fontWeight: 600, fontSize: '16px' }}>{alumno.apellido}</p>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{alumno.nombre}</p>
                          {attendance[alumno.id] !== 1 && attendance[alumno.id] !== undefined && (attendance as any)[`prof_${alumno.id}`] && (
                            <p style={{ fontSize: '11px', color: attendance[alumno.id] === 2 ? '#d97706' : 'var(--danger)', fontWeight: 600, marginTop: '4px' }}>
                              {attendance[alumno.id] === 2 ? 'Justificó:' : 'Falta:'} {(attendance as any)[`prof_${alumno.id}`]}
                            </p>
                          )}
                        </div>

                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: (attendance[alumno.id] === 1 || attendance[alumno.id] === undefined) ? 'rgba(34, 197, 94, 0.1)' : attendance[alumno.id] === 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: (attendance[alumno.id] === 1 || attendance[alumno.id] === undefined) ? 'var(--success)' : attendance[alumno.id] === 2 ? '#f59e0b' : 'var(--danger)'
                        }}>
                          {(attendance[alumno.id] === 1 || attendance[alumno.id] === undefined) ? <CheckCircle2 size={24} /> : attendance[alumno.id] === 2 ? <Calendar size={24} /> : <XCircle size={24} />}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!loading && filteredAlumnos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
                  <Users size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p>No se encontraron alumnos en este grupo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'reports' && stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div className="glass-container" style={{ padding: '24px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Alumnos</p>
                <h3 style={{ fontSize: '32px', fontWeight: 700 }}>{stats.totalAlumnos}</h3>
              </div>
              <div className="glass-container" style={{ padding: '24px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Presentes Hoy</p>
                <h3 style={{ fontSize: '32px', fontWeight: 700 }}>{stats.totalPresentesHoy}</h3>
              </div>
              {stats.statsGrupo.map((g: any) => (
                <div key={g.grupo} className="glass-container" style={{ padding: '24px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Asistencia {g.grupo}</p>
                  <h3 style={{ fontSize: '32px', fontWeight: 700 }}>{Math.round(g.promedio)}%</h3>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {['Centro de Día', 'Emprendedores'].map(groupName => {
                const groupAlumnos = criticalAlumnos.filter(a => a.grupo === groupName);
                if (groupAlumnos.length === 0) return null;
                
                return (
                  <div key={groupName} className="glass-container" style={{ padding: '32px', background: 'rgba(255,255,255,0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                      <Users size={20} color="var(--accent-primary)" />
                      <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{groupName} - Faltas Críticas</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupAlumnos.map(alumno => (
                        <div key={alumno.id} className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{alumno.apellido}, {alumno.nombre}</span>
                          </div>
                          <span style={{ color: 'var(--danger)', fontWeight: 700, background: 'rgba(239, 68, 68, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                            {alumno.faltas} inasistencias
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {criticalAlumnos.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No hay alumnos con faltas críticas este mes.</p>}
            </div>
          </>
        )}

        {view === 'students' && (
          <div className="glass-container" style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 600 }}>Gestión de Alumnos</h3>
              <button 
                onClick={() => {
                  setStudentForm({ nombre: '', apellido: '', grupo: 'Centro de Día' });
                  setModal({ type: 'student' });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--accent-primary)', color: 'white' }}
              >
                <Plus size={18} /> Agregar Alumno
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <th style={{ padding: '12px 24px' }}>Apellido y Nombre</th>
                  <th style={{ padding: '12px 24px' }}>Grupo</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map(alumno => (
                  <tr key={alumno.id} className="glass-card" style={{ marginBottom: '8px' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{alumno.apellido}, {alumno.nombre}</td>
                    <td style={{ padding: '16px 24px' }}>{alumno.grupo}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          setStudentForm({ nombre: alumno.nombre, apellido: alumno.apellido, grupo: alumno.grupo });
                          setModal({ type: 'student', data: alumno });
                        }}
                        style={{ padding: '8px', color: 'var(--accent-primary)', background: 'transparent', marginRight: '8px' }}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('¿Eliminar alumno?')) {
                            const res = await fetch(`/api/alumnos/${alumno.id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const data = await handleResponse(res);
                            if (data) fetchAlumnos();
                          }
                        }}
                        style={{ padding: '8px', color: 'var(--danger)', background: 'transparent' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'history' && (
          <div className="glass-container" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 600 }}>Registro Histórico</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Consulta de asistencias pasadas por mes y año</p>
                
                {/* Mini Dashboard de Historial */}
                <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                  <div className="glass-card" style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(34, 197, 94, 0.05)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p style={{ fontSize: '24px', fontWeight: 700 }}>{historyData.filter(r => r.presente).length}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presentes Totales</p>
                    </div>
                  </div>
                  <div className="glass-card" style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                      <XCircle size={24} />
                    </div>
                    <div>
                      <p style={{ fontSize: '24px', fontWeight: 700 }}>{historyData.filter(r => !r.presente).length}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inasistencias Totales</p>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Buscar en historial..."
                  className="glass-card"
                  style={{ padding: '8px 16px', outline: 'none', width: '200px' }}
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    // Filtro local simple para la vista actual
                    setHistoryData(prev => prev.filter(r => 
                      r.apellido.toLowerCase().includes(query) || 
                      r.nombre.toLowerCase().includes(query) ||
                      r.fecha.includes(query)
                    ));
                  }}
                />
                <button 
                  onClick={() => {
                    const headers = ['Fecha', 'Alumno', 'Grupo', 'Estado', 'Profesor'];
                    const rows = historyData.map(r => [r.fecha, `${r.apellido} ${r.nombre}`, r.grupo, r.presente ? 'P' : 'A', r.profesor_nombre || '-']);
                    const workbook = XLSX.utils.book_new();
                    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
                    XLSX.writeFile(workbook, `historial_andar.xlsx`);
                  }}
                  className="glass-card" 
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} /> Excel
                </button>
                <button 
                  onClick={() => exportToPDF(historyData, 'Reporte Histórico - Andar')}
                  className="glass-card" 
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Calendar size={16} /> PDF
                </button>
                <select 
                  className="glass-card" 
                  value={historyFilter.month}
                  onChange={e => setHistoryFilter({...historyFilter, month: parseInt(e.target.value)})}
                  style={{ padding: '8px 16px', outline: 'none' }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>
                  ))}
                </select>
                <select 
                  className="glass-card" 
                  value={historyFilter.year}
                  onChange={e => setHistoryFilter({...historyFilter, year: parseInt(e.target.value)})}
                  style={{ padding: '8px 16px', outline: 'none' }}
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={fetchHistory} style={{ background: 'var(--accent-primary)', color: 'white', padding: '8px 24px' }}>Consultar</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {['Centro de Día', 'Emprendedores'].map(groupName => {
                const groupData = historyData.filter(r => r.grupo === groupName);
                if (groupData.length === 0) return null;
                
                return (
                  <div key={groupName} className="glass-container" style={{ padding: '24px', background: 'rgba(255,255,255,0.4)' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)' }}>
                      <Users size={20} />
                      {groupName}
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            <th style={{ padding: '12px 24px' }}>Fecha</th>
                            <th style={{ padding: '12px 24px' }}>Alumno</th>
                            <th style={{ padding: '12px 24px' }}>Estado</th>
                            <th style={{ padding: '12px 24px' }}>Motivo / Profesor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupData.map((row, idx) => (
                            <tr key={idx} className="glass-card">
                              <td style={{ padding: '16px 24px' }}>{row.fecha}</td>
                              <td style={{ padding: '16px 24px', fontWeight: 600 }}>{row.apellido}, {row.nombre}</td>
                              <td style={{ padding: '16px 24px' }}>
                                <span style={{ 
                                  padding: '4px 12px', 
                                  borderRadius: '20px', 
                                  fontSize: '11px', 
                                  fontWeight: 700,
                                  background: row.presente === 1 ? 'rgba(34, 197, 94, 0.1)' : row.presente === 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: row.presente === 1 ? 'var(--success)' : row.presente === 2 ? '#f59e0b' : 'var(--danger)'
                                }}>
                                  {row.presente === 1 ? 'PRESENTE' : row.presente === 2 ? 'JUSTIFICADO' : 'AUSENTE'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {row.presente === 2 && row.observacion && (
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>
                                      "{row.observacion}"
                                    </span>
                                  )}
                                  {row.profesor_nombre && (
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                      Reg: {row.profesor_nombre}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {historyData.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No hay registros para este período.</p>}
            </div>
          </div>
        )}

        {view === 'users' && user.rol === 'admin' && (
          <div className="glass-container" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 600 }}>Administración de Profesores</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Gestión de accesos para el personal académico</p>
              </div>
              <button 
                onClick={() => {
                  setUserForm({ username: '', password: '', rol: 'profe' });
                  setModal({ type: 'user' });
                }}
                style={{ background: 'var(--accent-primary)', color: 'white', padding: '12px 24px' }}
              >
                <Plus size={18} /> Nuevo Profesor
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <th style={{ padding: '12px 24px' }}>Usuario</th>
                  <th style={{ padding: '12px 24px' }}>Rol</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} className="glass-card">
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{u.username}</td>
                    <td style={{ padding: '16px 24px' }}>{u.rol === 'admin' ? 'Administrador' : 'Profesor'}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      {u.username !== 'admin' && (
                        <button 
                          onClick={async () => {
                            if (confirm('¿Eliminar usuario?')) {
                              const res = await fetch(`/api/usuarios/${u.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              const data = await handleResponse(res);
                              if (data) fetchUsers();
                            }
                          }}
                          style={{ padding: '8px', color: 'var(--danger)', background: 'transparent' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'monthly' && (
          <div className="glass-container" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 600 }}>Planilla Mensual</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Vista de cuadrícula similar a Excel para control mensual</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select 
                  className="glass-card" 
                  value={monthlyGroupFilter}
                  onChange={e => setMonthlyGroupFilter(e.target.value)}
                  style={{ padding: '8px 16px', outline: 'none' }}
                >
                  <option value="Todos">Todos los Grupos</option>
                  <option value="Centro de Día">Centro de Día</option>
                  <option value="Emprendedores">Emprendedores</option>
                </select>
                <select 
                  className="glass-card" 
                  value={historyFilter.month}
                  onChange={e => setHistoryFilter({...historyFilter, month: parseInt(e.target.value)})}
                  style={{ padding: '8px 16px', outline: 'none' }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>
                  ))}
                </select>
                <select 
                  className="glass-card" 
                  value={historyFilter.year}
                  onChange={e => setHistoryFilter({...historyFilter, year: parseInt(e.target.value)})}
                  style={{ padding: '8px 16px', outline: 'none' }}
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button 
                  onClick={() => {
                    const daysInMonth = new Date(historyFilter.year, historyFilter.month, 0).getDate();
                    const targetAlumnos = monthlyGroupFilter === 'Todos' 
                      ? alumnos 
                      : alumnos.filter(a => a.grupo === monthlyGroupFilter);

                    const headers = ['Alumno', 'Grupo', ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                    const rows = targetAlumnos.map(a => {
                      const row: any[] = [`${a.apellido} ${a.nombre}`, a.grupo];
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${historyFilter.year}-${historyFilter.month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                        const record = historyData.find(r => r.apellido === a.apellido && r.nombre === a.nombre && r.fecha === dateStr);
                        row.push(record ? (record.presente === 1 ? 'P' : record.presente === 2 ? 'J' : 'A') : '-');
                      }
                      return row;
                    });
                    const workbook = XLSX.utils.book_new();
                    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla");
                    XLSX.writeFile(workbook, `planilla_${monthlyGroupFilter}_${historyFilter.year}_${historyFilter.month}.xlsx`);
                  }}
                  className="glass-card" 
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} /> Exportar Excel
                </button>
              </div>
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ background: 'var(--accent-primary)', color: 'white' }}>
                    <th style={{ padding: '8px', border: '1px solid rgba(255,255,255,0.2)', position: 'sticky', left: 0, background: 'var(--accent-primary)', zIndex: 10 }}>Alumno</th>
                    {Array.from({ length: new Date(historyFilter.year, historyFilter.month, 0).getDate() }, (_, i) => (
                      <th key={i} style={{ padding: '4px', border: '1px solid rgba(255,255,255,0.2)', width: '30px' }}>{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alumnos
                    .filter(a => monthlyGroupFilter === 'Todos' || a.grupo === monthlyGroupFilter)
                    .map(a => (
                    <tr key={a.id}>
                      <td style={{ padding: '8px', border: '1px solid rgba(0,0,0,0.05)', fontWeight: 600, position: 'sticky', left: 0, background: 'white', zIndex: 5, whiteSpace: 'nowrap' }}>
                        {a.apellido}, {a.nombre}
                      </td>
                      {Array.from({ length: new Date(historyFilter.year, historyFilter.month, 0).getDate() }, (_, i) => {
                        const dateStr = `${historyFilter.year}-${historyFilter.month.toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
                        const record = historyData.find(r => r.apellido === a.apellido && r.nombre === a.nombre && r.fecha === dateStr);
                        let color = 'transparent';
                        let text = '-';
                        if (record) {
                          if (record.presente === 1) { color = 'rgba(34, 197, 94, 0.1)'; text = 'P'; }
                          else if (record.presente === 2) { color = 'rgba(245, 158, 11, 0.1)'; text = 'J'; }
                          else { color = 'rgba(239, 68, 68, 0.1)'; text = 'A'; }
                        }
                        return (
                          <td key={i} style={{ padding: '4px', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center', background: color, fontWeight: text !== '-' ? 700 : 400 }}>
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      <AnimatePresence>
        {modal.type && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-container" 
              style={{ width: '100%', maxWidth: modal.type === 'detail' ? '600px' : '450px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <button onClick={() => setModal({ type: null })} style={{ position: 'absolute', top: '16px', right: '16px', padding: '8px', background: 'transparent' }}>
                <XCircle size={24} color="var(--text-secondary)" />
              </button>

              {modal.type === 'student' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 700 }}>{modal.data ? 'Editar Alumno' : 'Nuevo Alumno'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Apellido</label>
                      <input type="text" className="glass-card" style={{ padding: '12px' }} value={studentForm.apellido} onChange={e => setStudentForm({...studentForm, apellido: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Nombre</label>
                      <input type="text" className="glass-card" style={{ padding: '12px' }} value={studentForm.nombre} onChange={e => setStudentForm({...studentForm, nombre: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Grupo</label>
                      <select className="glass-card" style={{ padding: '12px' }} value={studentForm.grupo} onChange={e => setStudentForm({...studentForm, grupo: e.target.value})}>
                        <option value="Centro de Día">Centro de Día</option>
                        <option value="Emprendedores">Emprendedores</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleAddAlumno} style={{ background: 'var(--accent-primary)', color: 'white', padding: '14px' }}>Guardar Cambios</button>
                </div>
              )}

              {modal.type === 'user' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 700 }}>Nuevo Usuario</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Usuario</label>
                      <input type="text" className="glass-card" style={{ padding: '12px' }} value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Contraseña</label>
                      <input type="password" className="glass-card" style={{ padding: '12px' }} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600 }}>Rol</label>
                      <select className="glass-card" style={{ padding: '12px' }} value={userForm.rol} onChange={e => setUserForm({...userForm, rol: e.target.value})}>
                        <option value="profe">Profesor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleAddUser} style={{ background: 'var(--accent-primary)', color: 'white', padding: '14px' }}>Crear Usuario</button>
                </div>
              )}

              {modal.type === 'detail' && modal.data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 700 }}>
                      {modal.data.apellido[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '24px', fontWeight: 700 }}>{modal.data.apellido}, {modal.data.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)' }}>{modal.data.grupo}</p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '16px', padding: '20px' }}>
                    <h4 style={{ marginBottom: '16px', fontWeight: 600 }}>Historial Reciente</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {studentHistory.length > 0 ? studentHistory.map((h, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span style={{ fontSize: '14px' }}>{h.fecha}</span>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: h.presente === 1 ? 'var(--success)' : h.presente === 2 ? '#f59e0b' : 'var(--danger)' }}>
                            {h.presente === 1 ? 'Presente' : h.presente === 2 ? 'Justificado' : 'Ausente'}
                          </span>
                        </div>
                      )) : <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sin registros aún.</p>}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .app-layout {
          background-color: transparent;
        }
      `}</style>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-container" 
              style={{ width: '400px', padding: '32px', textAlign: 'center' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <AlertCircle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Confirmar Asistencia</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                ¿Estás seguro de registrar la asistencia del día <strong>{date}</strong> para <strong>{selectedGroup}</strong>?
                <br />
                <br />
                <strong>{presentCount}</strong> Presentes
                <br />
                <strong>{filteredAlumnos.length - presentCount}</strong> Inasistencias
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="glass-card" 
                  style={{ flex: 1, padding: '12px', background: 'white' }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  style={{ flex: 1, padding: '12px', background: 'var(--accent-primary)', color: 'white', fontWeight: 600 }}
                >
                  Confirmar y Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Justification Modal */}
      <AnimatePresence>
        {showJustifyModal.show && (
          <div 
            onClick={() => setShowJustifyModal({ show: false, alumnoId: null })}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-container" 
              style={{ width: '450px', padding: '32px', position: 'relative' }}
            >
              <button 
                onClick={() => setShowJustifyModal({ show: false, alumnoId: null })}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', padding: '8px' }}
              >
                <XCircle size={24} color="var(--text-secondary)" />
              </button>

              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Motivo de Justificación</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Ingresa el motivo por el cual el alumno <strong>{alumnos.find(a => a.id === showJustifyModal.alumnoId)?.apellido}</strong> tiene falta justificada:
              </p>
              <textarea 
                className="glass-card"
                style={{ width: '100%', minHeight: '100px', padding: '16px', outline: 'none', marginBottom: '24px', resize: 'none' }}
                placeholder="Ej: Certificado médico, trámite familiar..."
                value={observations[showJustifyModal.alumnoId || 0] || ''}
                onChange={(e) => setObservations({ ...observations, [showJustifyModal.alumnoId || 0]: e.target.value })}
                autoFocus
              />
              <button 
                onClick={() => setShowJustifyModal({ show: false, alumnoId: null })}
                style={{ width: '100%', padding: '14px', background: 'var(--accent-primary)', color: 'white', fontWeight: 600 }}
              >
                Confirmar Motivo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
