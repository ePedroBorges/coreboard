const path = require("node:path");
const { app, BrowserWindow, shell } = require("electron");

const isExternalUrl = (url) => /^(https?:|mailto:)/i.test(url);

function openExternal(url) {
  if (!isExternalUrl(url)) return;
  void shell.openExternal(url);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: "#090e17",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "public", "favicon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file:")) return;
    event.preventDefault();
    openExternal(url);
  });

  void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.setAppUserModelId("studio.anchorlab.vistataskcontrol");

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
