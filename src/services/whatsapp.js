const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../utils/logger');
const config = require('../config/config');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrGenerated = false;
  }

  async initialize() {
    try {
      logger.info('Initializing WhatsApp client...');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: config.whatsapp.sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      this.setupEventHandlers();
      await this.client.initialize();

      return true;
    } catch (error) {
      logger.error('Failed to initialize WhatsApp client', error);
      throw error;
    }
  }

  setupEventHandlers() {
    // QR Code generation
    this.client.on('qr', (qr) => {
      if (!this.qrGenerated) {
        logger.info('QR Code received! Scan with your WhatsApp:');
        qrcode.generate(qr, { small: true });
        this.qrGenerated = true;
      }
    });

    // Authentication success
    this.client.on('authenticated', () => {
      logger.success('WhatsApp authenticated successfully!');
    });

    // Client ready
    this.client.on('ready', () => {
      this.isReady = true;
      logger.success('WhatsApp client is ready!');
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      logger.warn(`WhatsApp client disconnected: ${reason}`);
    });

    // Authentication failure
    this.client.on('auth_failure', (message) => {
      logger.error('Authentication failure', new Error(message));
    });

    // Message received (for auto-reply in future)
    this.client.on('message', async (message) => {
      logger.info(`Message received from ${message.from}: ${message.body}`);
    });
  }

  async sendMessage(phoneNumber, message) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }

      // Format phone number (remove + and spaces)
      const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
      const chatId = `${formattedNumber}@c.us`;

      await this.client.sendMessage(chatId, message);
      logger.success(`Message sent to ${phoneNumber}`);

      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      logger.error(`Failed to send message to ${phoneNumber}`, error);
      return { success: false, error: error.message };
    }
  }

  async broadcast(phoneNumbers, message) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }

      const results = [];
      const delay = config.broadcast.delay;

      logger.info(`Starting broadcast to ${phoneNumbers.length} numbers...`);

      for (const phoneNumber of phoneNumbers) {
        const result = await this.sendMessage(phoneNumber, message);
        results.push({ phoneNumber, ...result });

        // Delay between messages to avoid spam detection
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const successCount = results.filter(r => r.success).length;
      logger.success(`Broadcast completed: ${successCount}/${phoneNumbers.length} messages sent`);

      return {
        success: true,
        total: phoneNumbers.length,
        successful: successCount,
        failed: phoneNumbers.length - successCount,
        results
      };
    } catch (error) {
      logger.error('Failed to broadcast messages', error);
      return { success: false, error: error.message };
    }
  }

  async getStatus() {
    return {
      ready: this.isReady,
      authenticated: this.client && this.client.info ? true : false,
      info: this.client && this.client.info ? this.client.info : null
    };
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      logger.info('WhatsApp client destroyed');
    }
  }
}

module.exports = new WhatsAppService();
