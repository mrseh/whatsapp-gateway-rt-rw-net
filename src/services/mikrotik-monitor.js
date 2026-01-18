const RouterOSClient = require('routeros-client').RouterOSClient;
const logger = require('../utils/logger');
const config = require('../config/config');
const whatsappService = require('./whatsapp');

class MikroTikMonitor {
  constructor() {
    this.client = null;
    this.isMonitoring = false;
    this.lastStatus = {};
    this.alertSent = {};
  }

  async connect() {
    try {
      this.client = new RouterOSClient({
        host: config.mikrotik.host,
        user: config.mikrotik.user,
        password: config.mikrotik.password,
        port: config.mikrotik.port,
        timeout: 10
      });

      await this.client.connect();
      logger.success('MikroTik RouterOS connected');
      return true;

    } catch (error) {
      logger.error('Failed to connect to MikroTik', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        logger.info('MikroTik connection closed');
      } catch (error) {
        logger.error('Error closing MikroTik connection', error);
      }
    }
  }

  async getSystemResources() {
    try {
      const resources = await this.client.write('/system/resource/print');
      return resources[0];
    } catch (error) {
      throw new Error(`Failed to get system resources: ${error.message}`);
    }
  }

  async getInterfaces() {
    try {
      const interfaces = await this.client.write('/interface/print', ['=stats']);
      return interfaces;
    } catch (error) {
      throw new Error(`Failed to get interfaces: ${error.message}`);
    }
  }

  async getActiveUsers() {
    try {
      const users = await this.client.write('/ip/hotspot/active/print');
      return users;
    } catch (error) {
      // Hotspot might not be enabled, return empty array
      return [];
    }
  }

  async checkHealth() {
    let connected = false;

    try {
      // Try to connect if not connected
      if (!this.client) {
        connected = await this.connect();
        if (!connected) {
          throw new Error('Cannot connect to MikroTik');
        }
      }

      const resources = await this.getSystemResources();
      const interfaces = await this.getInterfaces();
      const activeUsers = await this.getActiveUsers();

      // Calculate percentages
      const cpuLoad = parseInt(resources['cpu-load']) || 0;
      const totalMemory = parseInt(resources['total-memory']) || 1;
      const freeMemory = parseInt(resources['free-memory']) || 0;
      const memoryUsage = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);

      // Count interface statuses
      const interfaceStatus = {
        total: interfaces.length,
        running: interfaces.filter(i => i.running === 'true').length,
        disabled: interfaces.filter(i => i.disabled === 'true').length
      };

      const status = {
        timestamp: new Date().toISOString(),
        online: true,
        resources: {
          cpuLoad,
          memoryUsage,
          uptime: resources.uptime,
          version: resources.version,
          boardName: resources['board-name']
        },
        interfaces: interfaceStatus,
        activeUsers: activeUsers.length
      };

      logger.info(`MikroTik Health: CPU ${cpuLoad}%, Memory ${memoryUsage}%, Users: ${activeUsers.length}`);

      // Check thresholds and send alerts
      await this.checkThresholds(status);

      this.lastStatus = status;
      return status;

    } catch (error) {
      logger.error('MikroTik health check failed', error);

      const status = {
        timestamp: new Date().toISOString(),
        online: false,
        error: error.message
      };

      // Send alert if MikroTik is down and alert not sent recently (1 hour)
      if (!this.alertSent.mikrotikDown || Date.now() - this.alertSent.mikrotikDown > 3600000) {
        await this.sendAlert(status, 'DOWN');
        this.alertSent.mikrotikDown = Date.now();
      }

      return status;

    } finally {
      // Disconnect after health check to avoid connection timeout
      if (connected) {
        await this.disconnect();
      }
    }
  }

  async checkThresholds(status) {
    const alerts = [];

    // Check CPU threshold
    if (status.resources.cpuLoad > config.monitoring.cpuThreshold) {
      if (!this.alertSent.highCpu || Date.now() - this.alertSent.highCpu > 1800000) {
        alerts.push({
          type: 'HIGH_CPU',
          message: `CPU usage is ${status.resources.cpuLoad}% (threshold: ${config.monitoring.cpuThreshold}%)`
        });
        this.alertSent.highCpu = Date.now();
      }
    }

    // Check Memory threshold
    if (status.resources.memoryUsage > config.monitoring.memoryThreshold) {
      if (!this.alertSent.highMemory || Date.now() - this.alertSent.highMemory > 1800000) {
        alerts.push({
          type: 'HIGH_MEMORY',
          message: `Memory usage is ${status.resources.memoryUsage}% (threshold: ${config.monitoring.memoryThreshold}%)`
        });
        this.alertSent.highMemory = Date.now();
      }
    }

    // Check interface status
    const downInterfaces = status.interfaces.total - status.interfaces.running - status.interfaces.disabled;
    if (downInterfaces > 0 && config.monitoring.interfaceDownAlert) {
      if (!this.alertSent.interfaceDown || Date.now() - this.alertSent.interfaceDown > 1800000) {
        alerts.push({
          type: 'INTERFACE_DOWN',
          message: `${downInterfaces} interface(s) are down`
        });
        this.alertSent.interfaceDown = Date.now();
      }
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(status, alert.type, alert.message);
    }
  }

  async sendAlert(status, alertType, alertMessage = null) {
    try {
      let message = '🚨 *ALERT: MikroTik Monitoring*\n\n';

      if (status.online) {
        message += `✅ *Status:* Online\n`;
        message += `🔧 *Device:* ${status.resources.boardName}\n`;
        message += `📊 *Version:* ${status.resources.version}\n`;
        message += `⏱️ *Uptime:* ${status.resources.uptime}\n\n`;

        message += `*Resources:*\n`;
        message += `🖥️ CPU: ${status.resources.cpuLoad}%\n`;
        message += `💾 Memory: ${status.resources.memoryUsage}%\n\n`;

        message += `*Network:*\n`;
        message += `🔌 Interfaces: ${status.interfaces.running}/${status.interfaces.total} running\n`;
        message += `👥 Active Users: ${status.activeUsers}\n\n`;

        if (alertMessage) {
          message += `⚠️ *Warning:*\n${alertMessage}\n\n`;
        }

        message += `⏰ *Time:* ${new Date().toLocaleString('id-ID')}`;

      } else {
        message += `❌ *Status:* OFFLINE\n`;
        message += `⚠️ *Error:* ${status.error}\n`;
        message += `⏰ *Time:* ${new Date().toLocaleString('id-ID')}\n\n`;
        message += `Mohon segera dicek!`;
      }

      await whatsappService.sendMessage(config.monitoring.alertPhoneNumber, message);
      logger.success(`MikroTik ${alertType} alert sent via WhatsApp`);

    } catch (error) {
      logger.error('Failed to send MikroTik alert', error);
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('MikroTik monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.success('MikroTik monitoring started');

    // Initial check
    this.checkHealth();

    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkHealth();
    }, config.mikrotik.checkInterval);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
      logger.info('MikroTik monitoring stopped');
    }

    this.disconnect();
  }
}

module.exports = new MikroTikMonitor();
