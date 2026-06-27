const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

let mainWindow
let server

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn('npx', ['next', 'start', '-p', '3456'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    server.stdout.on('data', (data) => {
      const text = data.toString()
      if (text.includes('started') || text.includes('ready')) resolve()
    })

    server.stderr.on('data', (data) => {
      const text = data.toString()
      if (text.includes('started') || text.includes('ready')) resolve()
    })

    setTimeout(() => resolve(), 10000)
  })
}

async function createWindow() {
  await startServer()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL('http://localhost:3456')
  mainWindow.setTitle('AhorrApp')

  mainWindow.on('closed', () => {
    mainWindow = null
    if (server) server.kill()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (server) server.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
