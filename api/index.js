
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'andar-secret-key-2026';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
};

// --- Auth Routes ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, rol: user.rol } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Usuarios CRUD (Admin Only) ---

app.get('/api/usuarios', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await db.prepare('SELECT id, username, rol FROM usuarios').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/usuarios', authenticateToken, isAdmin, async (req, res) => {
    const { username, password, rol } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    try {
        await db.prepare('INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)').run(username, hash, rol);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'User already exists or invalid data' });
    }
});

app.delete('/api/usuarios/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Routes
app.get('/api/alumnos', authenticateToken, async (req, res) => {
    try {
        const alumnos = await db.prepare("SELECT * FROM alumnos WHERE apellido NOT LIKE 'Referencia%' AND nombre NOT LIKE 'AUSENTE' ORDER BY apellido, nombre").all();
        res.json(alumnos);
    } catch (error) {
        console.error('Error fetching alumnos:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/asistencias', authenticateToken, async (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }
    try {
        const asistencias = await db.prepare(`
            SELECT a.*, u.username as profesor_nombre 
            FROM asistencias a 
            LEFT JOIN usuarios u ON a.usuario_id = u.id 
            WHERE a.fecha = ?
        `).all(date);
        res.json(asistencias);
    } catch (error) {
        console.error('Error fetching asistencias:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/asistencias', authenticateToken, async (req, res) => {
    const { date, asistencias } = req.body;
    
    if (!date || !Array.isArray(asistencias)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    const transactionFn = async (data) => {
        for (const item of data) {
            await db.prepare('DELETE FROM asistencias WHERE alumno_id = ? AND fecha = ?').run(item.alumno_id, date);
            await db.prepare('INSERT INTO asistencias (alumno_id, fecha, presente, usuario_id, observacion) VALUES (?, ?, ?, ?, ?)').run(
                item.alumno_id, 
                date, 
                item.presente,
                req.user.id,
                item.observacion || null
            );
        }
    };

    try {
        await db.transaction(transactionFn)(asistencias);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving asistencias:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Students CRUD ---

app.post('/api/alumnos', authenticateToken, isAdmin, async (req, res) => {
    const { nombre, apellido, grupo } = req.body;
    if (!nombre || !apellido || !grupo) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    try {
        const info = await db.prepare('INSERT INTO alumnos (nombre, apellido, grupo) VALUES (?, ?, ?) RETURNING id').run(nombre, apellido, grupo);
        res.json({ id: info.lastInsertRowid, success: true });
    } catch (error) {
        console.error('Error creating alumno:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/alumnos/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, grupo } = req.body;
    try {
        await db.prepare('UPDATE alumnos SET nombre = ?, apellido = ?, grupo = ? WHERE id = ?').run(nombre, apellido, grupo, id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating alumno:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/alumnos/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const transactionFn = async () => {
            await db.prepare('DELETE FROM asistencias WHERE alumno_id = ?').run(id);
            await db.prepare('DELETE FROM alumnos WHERE id = ?').run(id);
        };
        await db.transaction(transactionFn)();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting alumno:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Stats & Reports ---

app.get('/api/asistencias/history', authenticateToken, async (req, res) => {
    const { month, year, alumno_id } = req.query;
    
    try {
        let query = `
            SELECT 
                al.id as alumno_id, al.apellido, al.nombre, al.grupo,
                asist.fecha, asist.presente, asist.observacion,
                u.username as profesor_nombre
            FROM asistencias asist
            JOIN alumnos al ON asist.alumno_id = al.id
            LEFT JOIN usuarios u ON asist.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (month && year) {
            query += " AND CAST(asist.fecha AS TEXT) LIKE ?";
            params.push(`${year}-${month.toString().padStart(2, '0')}%`);
        }

        if (alumno_id) {
            query += " AND asist.alumno_id = ?";
            params.push(alumno_id);
        }

        query += " ORDER BY asist.fecha DESC, al.apellido ASC";
        
        const history = await db.prepare(query).all(...params);
        res.json(history.map(h => ({ ...h, alumno_id: h.id }))); // Ensure alumno_id is explicit if needed
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/stats/summary', authenticateToken, async (req, res) => {
    try {
        const totalAlumnos = (await db.prepare('SELECT count(*) as count FROM alumnos').get()).count;
        const totalPresentesHoy = (await db.prepare("SELECT count(*) as count FROM asistencias WHERE fecha = DIALECT_NOW AND presente = 1").get()).count;
        
        const statsGrupo = await db.prepare(`
            SELECT 
                al.grupo, 
                CAST(COALESCE(AVG(CASE WHEN asist.presente = 1 THEN 1 ELSE 0 END), 0) * 100 AS INTEGER) as promedio
            FROM alumnos al
            LEFT JOIN asistencias asist ON al.id = asist.alumno_id AND asist.fecha >= DIALECT_START_OF_MONTH
            GROUP BY al.grupo
        `).all();

        res.json({
            totalAlumnos,
            totalPresentesHoy,
            statsGrupo
        });
    } catch (error) {
        console.error('FATAL Error in summary stats:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats/critical', authenticateToken, isAdmin, async (req, res) => {
    try {
        const critical = await db.prepare(`
            SELECT 
                al.id, al.apellido, al.nombre, al.grupo,
                SUM(CASE WHEN asist.presente = 0 THEN 1 ELSE 0 END) as faltas
            FROM alumnos al
            JOIN asistencias asist ON al.id = asist.alumno_id
            WHERE asist.fecha >= DIALECT_START_OF_MONTH
            GROUP BY al.id
            HAVING SUM(CASE WHEN asist.presente = 0 THEN 1 ELSE 0 END) > 4
            ORDER BY faltas DESC
        `).all();
        res.json(critical);
    } catch (error) {
        console.error('Error fetching critical stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const result = await db.prepare('SELECT 1 as connected').get();
        res.json({ status: 'ok', database: 'connected', result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message, stack: error.stack });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`[L] Backend running at http://localhost:${port}`);
    });
}

export default app;
