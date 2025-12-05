# Quick Remote Setup Guide

## 🌍 Connect Students from Different Networks

Your extension works with **any URL**, so you can use tunneling services to make your local server accessible from anywhere!

## 🚀 Fastest Method: ngrok (2 minutes)

### Step 1: Install ngrok
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

### Step 2: Start Your Teaching Session
1. In VSCode, start teaching session
2. Note the port (default: 8765)

### Step 3: Create Tunnel
```bash
ngrok http 8765
```

### Step 4: Share the URL
- Copy the HTTPS URL shown (e.g., `https://abc123.ngrok.io`)
- Students can use this from anywhere!

### Students Connect:
- **Browser:** `https://abc123.ngrok.io`
- **WebSocket (VSCode):** `wss://abc123.ngrok.io`

## 📋 Alternative: localtunnel (No signup)

```bash
# Install
npm install -g localtunnel

# After starting teaching session
lt --port 8765

# Share the URL shown
```

## ✅ It Just Works!

The extension accepts **any valid URL**, so:
- ✅ Local network URLs work automatically
- ✅ ngrok URLs work automatically  
- ✅ localtunnel URLs work automatically
- ✅ VPN IPs work automatically
- ✅ Port-forwarded URLs work automatically

Just share the URL with students and they can connect!

## 🔒 Security Tips

- Use HTTPS/WSS when possible (ngrok provides this)
- Enable authentication in settings
- Don't share URLs publicly
- Stop server when done

## 📚 Full Guide

See [REMOTE_CONNECTION_GUIDE.md](./REMOTE_CONNECTION_GUIDE.md) for detailed instructions and all options.

