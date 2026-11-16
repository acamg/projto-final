'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const database = require('./database');
const dataPath = path.join(app.getPath('appData'), 'BuffetManager');
fs.mkdirSync(dataPath, { recursive: true });
app.setPath('userData', dataPath);
const sessionDir = path.join(dataPath, 'session');
fs.mkdirSync(sessionDir, { recursive: true });
app.setPath('sessionData', sessionDir);
function win() {
    const window = new BrowserWindow({ width: 1250, height: 820, minWidth: 900, minHeight: 650, title: 'Buffet Manager', backgroundColor: '#f5f7fb', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.loadFile(path.join(__dirname, 'index.html'));
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', e => e.preventDefault());
}
function register() {
    ipcMain.handle('definitions', () => database.definitions);
    ipcMain.handle('list', (_e, t) => database.list(t));
    ipcMain.handle('get', (_e, t, id) => database.get(t, id));
    ipcMain.handle('save', (_e, t, data) => database.save(t, data));
    ipcMain.handle('remove', (_e, t, id) => database.remove(t, id));
    ipcMain.handle('dashboard', () => database.dashboard());
    ipcMain.handle('quote-detail', (_e, id) => database.quoteDetail(id));
    ipcMain.handle('backup', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog({ title: 'Salvar backup do Buffet Manager', defaultPath: 'buffet-backup.sqlite', filters: [{ name: 'Banco SQLite', extensions: ['sqlite'] }] });
        if (canceled || !filePath) return null; return database.backup(filePath);
    });
    ipcMain.handle('send-email', async (_e, payload) => {
        const { to, subject, body } = payload || {};
        if (typeof to !== 'string' || to.length > 250 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw Error('E-mail do cliente inválido');
        if (typeof subject !== 'string' || subject.length > 250 || typeof body !== 'string' || body.length > 7000) throw Error('Conteúdo de e-mail inválido');
        const uri = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await shell.openExternal(uri); return true;
    });
    ipcMain.handle('weather', async (_e, location, date) => {
        if (typeof location !== 'string' || location.length > 120 || !/^[\w\sÀ-ÿ,.'-]+$/u.test(location)) throw Error('Informe a cidade do evento');
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Data inválida');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const target = new Date(date + 'T12:00:00'); const diff = Math.ceil((target - today) / 86400000);
        if (!Number.isFinite(diff) || diff < 0 || diff > 15) return { unavailable: true, message: 'Previsão disponível apenas para os próximos 16 dias (incluindo hoje).' };
        const request = async url => { const res = await fetch(url, { signal: AbortSignal.timeout(9000) }); if (!res.ok) throw Error('Serviço de clima indisponível'); return res.json(); };
        const geo = await request(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=pt&format=json`);
        if (!geo.results?.length) throw Error('Cidade não encontrada na consulta climática');
        const place = geo.results[0];
        const data = await request(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=16`);
        const i = data.daily?.time?.indexOf(date);
        if (i < 0 || i === undefined) return { unavailable: true, message: 'Previsão ainda não disponível para esta data.' };
        return { cidade: `${place.name}, ${place.country}`, data: date, max: data.daily.temperature_2m_max[i], min: data.daily.temperature_2m_min[i], chuva: data.daily.precipitation_probability_max[i], codigo: data.daily.weather_code[i] };
    });
}
app.whenReady().then(() => { database.init(dataPath); register(); win(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) win(); }); });
app.on('before-quit', () => database.close());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
