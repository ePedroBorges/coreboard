const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const storageFile = () => path.join(app.getPath("userData"), "vista-storage.json");
const readStorage = () => {
  try { return JSON.parse(fs.readFileSync(storageFile(), "utf8")); }
  catch { return {}; }
};
const writeStorage = (data) => {
  const target = storageFile();
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(data), "utf8");
  fs.renameSync(temporary, target);
};
let storageWriteQueue = Promise.resolve();
const enqueueStorageWrite = (operation) => {
  storageWriteQueue = storageWriteQueue.then(operation, operation);
  return storageWriteQueue;
};

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
      preload: path.join(__dirname, "preload.cjs"),
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

app.setAppUserModelId("studio.anchorlab.coreboard");

ipcMain.handle("vista-storage:get", (_event, key) => readStorage()[key] ?? null);
ipcMain.handle("vista-storage:set", (_event, key, value) => enqueueStorageWrite(() => writeStorage({ ...readStorage(), [key]: value })));
ipcMain.handle("vista-storage:remove", (_event, key) => enqueueStorageWrite(() => {
  const data = readStorage();
  delete data[key];
  writeStorage(data);
}));

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
