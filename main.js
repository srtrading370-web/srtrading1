const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

// A fixed localhost port keeps the same origin, so saved login/data persists between launches.
// "localhost" is an authorized domain in Firebase by default.
const PORT = 38417;
const ROOT = path.join(__dirname, 'www');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', () => resolve(false));
    server.listen(PORT, 'localhost', () => resolve(true));
  });
}

async function createWindow() {
  const ok = await startServer();
  const win = new BrowserWindow({
    width: 1280, height: 800, autoHideMenuBar: true,
    icon: path.join(ROOT, 'icons', 'icon-512.png'),
    webPreferences: { contextIsolation: true }
  });
  // Invoice/print windows (window.open) open inside the app; external links open in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(`http://localhost:${PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  if (ok) win.loadURL(`http://localhost:${PORT}/index.html`);
  else win.loadFile(path.join(ROOT, 'index.html'));
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
