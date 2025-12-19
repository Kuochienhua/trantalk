const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const isDev = !app.isPackaged;
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple apps/prototypes; consider changing for security in prod
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    // electron-builder will package the 'dist' folder
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  const { session, systemPreferences, shell, dialog } = require('electron');

  // ★★★ 加入這段程式碼來處理權限請求 ★★★
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // 檢查請求的權限是否為 'media' (包含麥克風與攝影機)
    // 為了安全，您也可以加上檢查 webContents.getURL() 來確認來源
    if (permission === 'media') {
      // callback(true) 代表同意授權
      console.log('已自動允許麥克風/攝影機權限')
      callback(true)
    } else {
      // 其他權限依舊拒絕或依照預設處理
      console.log(`[Main Process] Permission denied: ${permission}`)
      callback(false)
    }
  })

  createWindow();

  // 2. 檢查 Windows 系統層級的麥克風權限狀態
  checkSystemMicPermission(systemPreferences, shell, dialog);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

async function checkSystemMicPermission(systemPreferences, shell, dialog) {
  // getMediaAccessStatus 支援 Windows 10/11 與 macOS
  const status = systemPreferences.getMediaAccessStatus('microphone')

  console.log('目前系統麥克風權限狀態:', status)

  if (status === 'not-determined') {
    // Windows 通常不會是這個狀態，macOS 比較常見
  } else if (status === 'denied' || status === 'restricted') {
    // ★★★ 如果系統權限被拒，這裡應該彈窗通知使用者 ★★★
    console.log('麥克風被 Windows 系統封鎖！')

    // 您可以使用 dialog 模組提示使用者，並提供按鈕讓他們打開設定
    const choice = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['開啟系統設定', '取消'],
      title: '麥克風權限受阻',
      message: '您的 Windows 隱私權設定封鎖了麥克風存取，請手動開啟。',
      detail: '請前往「隱私權與安全性 > 麥克風」開啟權限。'
    })

    if (choice.response === 0) {
      // 直接幫使用者打開 Windows 的麥克風設定頁面
      await shell.openExternal('ms-settings:privacy-microphone')
    }
  } else {
    console.log('Windows 系統允許存取麥克風，可以開始錄音。')
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
