const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config/config');
const logger = require('./utils/logger');
const apiRoutes = require('./routes/api');
const whatsappService = require('./services/whatsapp');
const oltMonitor = require('./services/olt-monitor');
const mikrotikMonitor = require('./services/mikrotik-monitor');

class WhatsAppGateway {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Request logger
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'WhatsApp Gateway RT RW Net',
        version: '1.0.0',
        description: 'WhatsApp Gateway with OLT & MikroTik Network Monitoring',
        endpoints: {
          health: '/api/health',
          whatsapp: {
            status: '/api/whatsapp/status',
            send: 'POST /api/whatsapp/send',
            broadcast: 'POST /api/whatsapp/broadcast'
          },
          monitoring: {
            dashboard: '/api/monitoring/dashboard',
            olt: {
              status: '/api/monitoring/olt',
              start: 'POST /api/monitoring/olt/start',
              stop: 'POST /api/monitoring/olt/stop'
            },
            mikrotik: {
              status: '/api/monitoring/mikrotik',
              start: 'POST /api/monitoring/mikrotik/start',
              stop: 'POST /api/monitoring/mikrotik/stop'
            }
          }
        }
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      logger.error('Express error', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  async initialize() {
    try {
      logger.info('='.repeat(50));
      logger.info('WhatsApp Gateway RT RW Net - Starting...');
      logger.info('='.repeat(50));

      // Initialize WhatsApp client
      logger.info('Step 1/4: Initializing WhatsApp client...');
      await whatsappService.initialize();

      // Initialize OLT monitoring
      logger.info('Step 2/4: Initializing OLT monitoring...');
      const oltInitialized = oltMonitor.initialize();
      if (oltInitialized) {
        // Auto-start OLT monitoring
        oltMonitor.startMonitoring();
      } else {
        logger.warn('OLT monitoring initialization failed - will be available via API');
      }

      // Initialize MikroTik monitoring
      logger.info('Step 3/4: Initializing MikroTik monitoring...');
      // We don't connect immediately, will connect on first health check
      mikrotikMonitor.startMonitoring();

      // Start Express server
      logger.info('Step 4/4: Starting Express server...');
      this.server = this.app.listen(config.server.port, () => {
        logger.success(`\nServer is running on port ${config.server.port}`);
        logger.success(`Environment: ${config.server.nodeEnv}`);
        logger.info('='.repeat(50));
        logger.info('API Documentation:');
        logger.info(`- Health Check: http://localhost:${config.server.port}/api/health`);
        logger.info(`- Send Message: POST http://localhost:${config.server.port}/api/whatsapp/send`);
        logger.info(`- Broadcast: POST http://localhost:${config.server.port}/api/whatsapp/broadcast`);
        logger.info(`- Dashboard: http://localhost:${config.server.port}/api/monitoring/dashboard`);
        logger.info('='.repeat(50));
      });

    } catch (error) {
      logger.error('Failed to initialize application', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down gracefully...');

    // Stop monitoring
    oltMonitor.stopMonitoring();
    mikrotikMonitor.stopMonitoring();

    // Destroy WhatsApp client
    await whatsappService.destroy();

    // Close server
    if (this.server) {
      this.server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    }
  }
}

// Create and start application
const gateway = new WhatsAppGateway();
gateway.initialize();

// Handle shutdown signals
process.on('SIGINT', () => gateway.shutdown());
process.on('SIGTERM', () => gateway.shutdown());

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  gateway.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', new Error(reason));
});

module.exports = gateway;
