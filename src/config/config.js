require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './session'
  },

  olt: {
    host: process.env.OLT_HOST || '192.168.1.1',
    community: process.env.OLT_COMMUNITY || 'public',
    port: parseInt(process.env.OLT_PORT) || 161,
    checkInterval: parseInt(process.env.OLT_CHECK_INTERVAL) || 300000 // 5 minutes
  },

  mikrotik: {
    host: process.env.MIKROTIK_HOST || '192.168.1.2',
    user: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || 'password',
    port: parseInt(process.env.MIKROTIK_PORT) || 8728,
    checkInterval: parseInt(process.env.MIKROTIK_CHECK_INTERVAL) || 300000 // 5 minutes
  },

  monitoring: {
    alertPhoneNumber: process.env.ALERT_PHONE_NUMBER || '6281234567890',
    cpuThreshold: parseInt(process.env.CPU_THRESHOLD) || 80,
    memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD) || 85,
    interfaceDownAlert: process.env.INTERFACE_DOWN_ALERT === 'true'
  },

  broadcast: {
    delay: parseInt(process.env.BROADCAST_DELAY) || 1000 // 1 second between messages
  }
};
