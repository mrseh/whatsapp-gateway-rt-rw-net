const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const oltMonitor = require('../services/olt-monitor');
const mikrotikMonitor = require('../services/mikrotik-monitor');
const logger = require('../utils/logger');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Gateway API is running',
    timestamp: new Date().toISOString()
  });
});

// Get WhatsApp status
router.get('/whatsapp/status', async (req, res) => {
  try {
    const status = await whatsappService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get WhatsApp status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send single message
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and message are required'
      });
    }

    const result = await whatsappService.sendMessage(phoneNumber, message);

    res.json(result);
  } catch (error) {
    logger.error('Failed to send message', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Broadcast message to multiple numbers
router.post('/whatsapp/broadcast', async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumbers array is required and must not be empty'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    const result = await whatsappService.broadcast(phoneNumbers, message);

    res.json(result);
  } catch (error) {
    logger.error('Failed to broadcast message', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get OLT monitoring status
router.get('/monitoring/olt', async (req, res) => {
  try {
    const status = await oltMonitor.checkHealth();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get OLT status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start OLT monitoring
router.post('/monitoring/olt/start', (req, res) => {
  try {
    oltMonitor.startMonitoring();
    res.json({
      success: true,
      message: 'OLT monitoring started'
    });
  } catch (error) {
    logger.error('Failed to start OLT monitoring', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop OLT monitoring
router.post('/monitoring/olt/stop', (req, res) => {
  try {
    oltMonitor.stopMonitoring();
    res.json({
      success: true,
      message: 'OLT monitoring stopped'
    });
  } catch (error) {
    logger.error('Failed to stop OLT monitoring', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get MikroTik monitoring status
router.get('/monitoring/mikrotik', async (req, res) => {
  try {
    const status = await mikrotikMonitor.checkHealth();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get MikroTik status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start MikroTik monitoring
router.post('/monitoring/mikrotik/start', (req, res) => {
  try {
    mikrotikMonitor.startMonitoring();
    res.json({
      success: true,
      message: 'MikroTik monitoring started'
    });
  } catch (error) {
    logger.error('Failed to start MikroTik monitoring', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop MikroTik monitoring
router.post('/monitoring/mikrotik/stop', (req, res) => {
  try {
    mikrotikMonitor.stopMonitoring();
    res.json({
      success: true,
      message: 'MikroTik monitoring stopped'
    });
  } catch (error) {
    logger.error('Failed to stop MikroTik monitoring', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get complete monitoring dashboard
router.get('/monitoring/dashboard', async (req, res) => {
  try {
    const [oltStatus, mikrotikStatus, whatsappStatus] = await Promise.allSettled([
      oltMonitor.checkHealth(),
      mikrotikMonitor.checkHealth(),
      whatsappService.getStatus()
    ]);

    res.json({
      success: true,
      data: {
        olt: oltStatus.status === 'fulfilled' ? oltStatus.value : { error: oltStatus.reason.message },
        mikrotik: mikrotikStatus.status === 'fulfilled' ? mikrotikStatus.value : { error: mikrotikStatus.reason.message },
        whatsapp: whatsappStatus.status === 'fulfilled' ? whatsappStatus.value : { error: whatsappStatus.reason.message }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get dashboard data', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
