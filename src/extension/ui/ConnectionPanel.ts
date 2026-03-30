import * as vscode from 'vscode';
import * as QRCode from 'qrcode';

/**
 * Webview panel shown to the teacher with QR code, URLs, and live connection count.
 */
export class ConnectionPanel {
  private static instance: ConnectionPanel | undefined;
  private panel: vscode.WebviewPanel;
  private updateTimer?: NodeJS.Timeout;

  private constructor(
    private httpUrl: string,
    private wsUrl: string,
    private httpLocalUrl: string,
    private getConnectionCount: () => number,
    private stopServer: () => void,
    context: vscode.ExtensionContext
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'classroomConnectionInfo',
      'Classroom: Connection Info',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.onDidDispose(() => {
      ConnectionPanel.instance = undefined;
      this.dispose();
    });

    this.panel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'copyWifiUrl':
          vscode.env.clipboard.writeText(this.httpUrl);
          vscode.window.showInformationMessage('WiFi URL copied to clipboard!');
          break;
        case 'copyWsUrl':
          vscode.env.clipboard.writeText(this.wsUrl);
          vscode.window.showInformationMessage('WebSocket URL copied to clipboard!');
          break;
        case 'stopServer':
          this.stopServer();
          this.panel.dispose();
          break;
      }
    });

    this.renderPanel().then(() => {
      this.startUpdating();
    });
  }

  /**
   * Open (or reveal) the connection panel.
   */
  static async show(
    httpUrl: string,
    wsUrl: string,
    httpLocalUrl: string,
    getConnectionCount: () => number,
    stopServer: () => void,
    context: vscode.ExtensionContext
  ): Promise<ConnectionPanel> {
    if (ConnectionPanel.instance) {
      ConnectionPanel.instance.panel.reveal(vscode.ViewColumn.Beside, true);
      return ConnectionPanel.instance;
    }
    ConnectionPanel.instance = new ConnectionPanel(
      httpUrl, wsUrl, httpLocalUrl, getConnectionCount, stopServer, context
    );
    return ConnectionPanel.instance;
  }

  /**
   * Update the displayed connection count.
   */
  updateCount(count: number): void {
    if (this.panel.visible) {
      this.panel.webview.postMessage({ command: 'updateCount', count });
    }
  }

  /**
   * Reveal if hidden.
   */
  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside, true);
  }

  dispose(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    ConnectionPanel.instance = undefined;
  }

  private startUpdating(): void {
    this.updateTimer = setInterval(() => {
      const count = this.getConnectionCount();
      this.updateCount(count);
    }, 1000);
  }

  private async renderPanel(): Promise<void> {
    // Generate QR code as base64 data URL (for the WiFi URL)
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(this.httpUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (e) {
      console.error('QR code generation failed:', e);
    }

    const html = this.buildHtml(qrDataUrl);
    this.panel.webview.html = html;
  }

  private buildHtml(qrDataUrl: string): string {
    const qrSection = qrDataUrl
      ? `<img src="${qrDataUrl}" alt="QR Code" class="qr" />`
      : `<div class="qr-fallback">QR unavailable</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Info</title>
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: 13px;
      color: var(--vscode-foreground, #d4d4d4);
      background: var(--vscode-editor-background, #1e1e1e);
      padding: 20px;
      margin: 0;
    }
    h2 { color: #4ec9b0; margin: 0 0 4px; font-size: 16px; }
    .subtitle { color: #858585; font-size: 12px; margin-bottom: 20px; }
    .card {
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-editorWidget-border, #3e3e42);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #858585; margin-bottom: 8px; }
    .count-display {
      font-size: 42px;
      font-weight: 700;
      color: #4ec9b0;
      line-height: 1;
      margin-bottom: 4px;
    }
    .count-label { font-size: 12px; color: #858585; }
    .url-box {
      background: var(--vscode-input-background, #3c3c3c);
      border: 1px solid var(--vscode-input-border, #555);
      border-radius: 4px;
      padding: 8px 10px;
      font-family: 'Consolas', monospace;
      font-size: 13px;
      color: #9cdcfe;
      word-break: break-all;
      margin-bottom: 10px;
    }
    .qr-wrap { text-align: center; margin: 12px 0; }
    .qr { border-radius: 6px; border: 4px solid #fff; display: block; margin: 0 auto; }
    .qr-fallback {
      width: 220px; height: 220px;
      background: #333; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: #666; font-size: 12px; margin: 0 auto;
    }
    .qr-hint { text-align: center; font-size: 11px; color: #858585; margin-top: 6px; }
    .btn {
      display: inline-block;
      padding: 6px 14px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 8px;
      margin-top: 4px;
    }
    .btn-primary { background: #0e639c; color: #fff; }
    .btn-primary:hover { background: #1177bb; }
    .btn-secondary { background: #3c3c3c; color: #d4d4d4; border: 1px solid #555; }
    .btn-secondary:hover { background: #4a4a4a; }
    .btn-danger { background: #8b1a1a; color: #f48771; border: 1px solid #c72b2b; }
    .btn-danger:hover { background: #a52020; }
  </style>
</head>
<body>
  <h2>Classroom Session Active</h2>
  <div class="subtitle">Share the URL or QR code with your students</div>

  <div class="card">
    <div class="card-title">Students Connected</div>
    <div class="count-display" id="count">0</div>
    <div class="count-label">/ 150 max</div>
  </div>

  <div class="card">
    <div class="card-title">WiFi URL (same network)</div>
    <div class="url-box">${this.httpUrl}</div>
    <div class="qr-wrap">
      ${qrSection}
      <div class="qr-hint">Students scan this with their phone/tablet</div>
    </div>
    <button class="btn btn-primary" onclick="copy('wifi')">Copy WiFi URL</button>
    <button class="btn btn-secondary" onclick="copy('ws')">Copy WebSocket URL</button>
  </div>

  <div class="card">
    <div class="card-title">Localhost URL (this computer only)</div>
    <div class="url-box">${this.httpLocalUrl}</div>
  </div>

  <div class="card">
    <div class="card-title">WebSocket URL (VSCode student mode)</div>
    <div class="url-box">${this.wsUrl}</div>
  </div>

  <button class="btn btn-danger" onclick="stop()">Stop Session</button>

  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', e => {
      if (e.data.command === 'updateCount') {
        document.getElementById('count').textContent = e.data.count;
      }
    });
    function copy(type) {
      vscode.postMessage({ command: type === 'wifi' ? 'copyWifiUrl' : 'copyWsUrl' });
    }
    function stop() {
      vscode.postMessage({ command: 'stopServer' });
    }
  </script>
</body>
</html>`;
  }
}
