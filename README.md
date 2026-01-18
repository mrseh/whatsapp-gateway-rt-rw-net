# WhatsApp Gateway RT RW Net

WhatsApp Gateway dengan fitur monitoring OLT dan MikroTik untuk RT RW Net. Sistem ini dapat mengirim notifikasi otomatis via WhatsApp ketika terjadi masalah pada jaringan.

## Fitur

- **WhatsApp Gateway**
  - ✅ Kirim pesan ke nomor WhatsApp
  - ✅ Broadcast pesan ke multiple nomor
  - ✅ Auto-reconnect WhatsApp session

- **Monitoring OLT (SNMP)**
  - 📊 Monitor status OLT secara real-time
  - 🔍 Cek uptime dan informasi sistem
  - 🔌 Monitor status interface
  - 🚨 Alert otomatis via WhatsApp jika OLT down

- **Monitoring MikroTik (RouterOS API)**
  - 💻 Monitor CPU dan Memory usage
  - 🌐 Monitor status interface
  - 👥 Lihat jumlah user aktif
  - ⚠️ Alert jika CPU/Memory melebihi threshold
  - 🚨 Notifikasi jika interface down

## Tech Stack

- Node.js
- Express.js
- whatsapp-web.js (WhatsApp client)
- snmp-native (SNMP untuk OLT)
- routeros-client (MikroTik API)
- node-cron (Scheduler)

## Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/mrseh/whatsapp-gateway-rt-rw-net.git
cd whatsapp-gateway-rt-rw-net
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` sesuai konfigurasi Anda:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./session

# OLT Configuration (SNMP)
OLT_HOST=192.168.1.1
OLT_COMMUNITY=public
OLT_PORT=161
OLT_CHECK_INTERVAL=300000

# MikroTik Configuration (RouterOS API)
MIKROTIK_HOST=192.168.1.2
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_password
MIKROTIK_PORT=8728
MIKROTIK_CHECK_INTERVAL=300000

# Monitoring Configuration
ALERT_PHONE_NUMBER=6281234567890
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
INTERFACE_DOWN_ALERT=true

# Broadcast Configuration
BROADCAST_DELAY=1000
```

### 4. Persiapan OLT

Pastikan SNMP sudah diaktifkan di OLT Anda dengan community string yang sesuai.

### 5. Persiapan MikroTik

Pastikan API RouterOS sudah diaktifkan di MikroTik:

```
/ip service
set api address=0.0.0.0/0 port=8728 disabled=no
```

Buat user khusus untuk monitoring (optional):

```
/user add name=monitor password=your_password group=read
```

## Menjalankan Aplikasi

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### First Run - WhatsApp Authentication

Pada saat pertama kali dijalankan, Anda akan melihat QR Code di terminal. Scan QR Code tersebut dengan WhatsApp Anda:

1. Buka WhatsApp di HP
2. Tap menu (⋮) → Linked Devices
3. Tap "Link a Device"
4. Scan QR Code yang muncul di terminal

Session akan disimpan, jadi Anda tidak perlu scan QR Code lagi di run berikutnya.

## API Endpoints

### WhatsApp API

#### Get WhatsApp Status
```http
GET /api/whatsapp/status
```

#### Send Single Message
```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "phoneNumber": "6281234567890",
  "message": "Hello from WhatsApp Gateway!"
}
```

#### Broadcast Message
```http
POST /api/whatsapp/broadcast
Content-Type: application/json

{
  "phoneNumbers": [
    "6281234567890",
    "6281234567891",
    "6281234567892"
  ],
  "message": "Pengumuman: Jaringan akan maintenance pada tanggal 20 Januari 2026"
}
```

### Monitoring API

#### Get Dashboard (All Status)
```http
GET /api/monitoring/dashboard
```

#### Get OLT Status
```http
GET /api/monitoring/olt
```

#### Start OLT Monitoring
```http
POST /api/monitoring/olt/start
```

#### Stop OLT Monitoring
```http
POST /api/monitoring/olt/stop
```

#### Get MikroTik Status
```http
GET /api/monitoring/mikrotik
```

#### Start MikroTik Monitoring
```http
POST /api/monitoring/mikrotik/start
```

#### Stop MikroTik Monitoring
```http
POST /api/monitoring/mikrotik/stop
```

## Contoh Penggunaan dengan cURL

### Kirim Pesan

```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "6281234567890",
    "message": "Test pesan dari WhatsApp Gateway"
  }'
```

### Broadcast Pesan

```bash
curl -X POST http://localhost:3000/api/whatsapp/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["6281234567890", "6281234567891"],
    "message": "Broadcast test message"
  }'
```

### Cek Status Monitoring

```bash
curl http://localhost:3000/api/monitoring/dashboard
```

## Format Nomor WhatsApp

Nomor WhatsApp harus dalam format internasional tanpa tanda + dan spasi:

- ✅ Benar: `6281234567890`
- ❌ Salah: `+62 812-3456-7890`
- ❌ Salah: `0812-3456-7890`

## Monitoring Otomatis

Monitoring akan berjalan otomatis setiap 5 menit (default) untuk:

1. **OLT Monitoring**
   - Cek apakah OLT online/offline
   - Monitor interface status
   - Kirim alert via WhatsApp jika down

2. **MikroTik Monitoring**
   - Cek CPU usage (alert jika > 80%)
   - Cek Memory usage (alert jika > 85%)
   - Monitor interface status
   - Kirim alert via WhatsApp jika ada masalah

## Struktur Project

```
whatsapp-gateway-rt-rw-net/
├── src/
│   ├── config/
│   │   └── config.js          # Konfigurasi aplikasi
│   ├── services/
│   │   ├── whatsapp.js        # WhatsApp client handler
│   │   ├── olt-monitor.js     # OLT monitoring via SNMP
│   │   └── mikrotik-monitor.js # MikroTik monitoring via API
│   ├── routes/
│   │   └── api.js             # API routes
│   ├── utils/
│   │   └── logger.js          # Logger utility
│   └── index.js               # Entry point
├── logs/                      # Log files
├── session/                   # WhatsApp session data
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting

### WhatsApp tidak terkoneksi

1. Pastikan Anda sudah scan QR Code
2. Hapus folder `session/` dan scan QR Code lagi
3. Pastikan WhatsApp di HP tidak logout

### OLT monitoring tidak berjalan

1. Pastikan OLT_HOST bisa di ping dari server
2. Cek SNMP community string sudah benar
3. Pastikan SNMP port (161) tidak diblock firewall

### MikroTik monitoring gagal

1. Pastikan API RouterOS sudah enabled
2. Cek username dan password benar
3. Pastikan port 8728 tidak diblock firewall
4. Test koneksi dengan Winbox terlebih dahulu

### Alert tidak terkirim

1. Pastikan WhatsApp sudah terkoneksi (cek `/api/whatsapp/status`)
2. Pastikan ALERT_PHONE_NUMBER sudah benar formatnya
3. Cek logs di folder `logs/` untuk error detail

## Deployment ke Production

### Menggunakan PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start aplikasi dengan PM2
pm2 start src/index.js --name whatsapp-gateway

# Auto-start on system reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs whatsapp-gateway
```

### Menggunakan Systemd

Buat file `/etc/systemd/system/whatsapp-gateway.service`:

```ini
[Unit]
Description=WhatsApp Gateway RT RW Net
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/whatsapp-gateway-rt-rw-net
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-gateway
sudo systemctl start whatsapp-gateway
sudo systemctl status whatsapp-gateway
```

## Kontribusi

Kontribusi selalu terbuka! Silakan buat issue atau pull request.

## Lisensi

MIT License - Copyright (c) 2026 mrseh

## Kontak

Jika ada pertanyaan atau butuh bantuan, silakan buat issue di GitHub repository.

---

**Dibuat dengan ❤️ untuk RT RW Net Indonesia**
