const snmp = require('snmp-native');
const logger = require('../utils/logger');
const config = require('../config/config');
const whatsappService = require('./whatsapp');

class OLTMonitor {
  constructor() {
    this.session = null;
    this.isMonitoring = false;
    this.lastStatus = {};
    this.alertSent = {};
  }

  initialize() {
    try {
      this.session = new snmp.Session({
        host: config.olt.host,
        community: config.olt.community,
        port: config.olt.port
      });
      logger.success('OLT SNMP session initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize OLT SNMP session', error);
      return false;
    }
  }

  async getSystemInfo() {
    return new Promise((resolve, reject) => {
      const oids = {
        sysDescr: [1, 3, 6, 1, 2, 1, 1, 1, 0],
        sysUpTime: [1, 3, 6, 1, 2, 1, 1, 3, 0],
        sysName: [1, 3, 6, 1, 2, 1, 1, 5, 0],
        sysLocation: [1, 3, 6, 1, 2, 1, 1, 6, 0]
      };

      this.session.getAll({ oids: Object.values(oids) }, (error, varbinds) => {
        if (error) {
          reject(error);
          return;
        }

        const result = {
          description: varbinds[0] ? varbinds[0].value : 'N/A',
          uptime: varbinds[1] ? this.formatUptime(varbinds[1].value) : 'N/A',
          name: varbinds[2] ? varbinds[2].value : 'N/A',
          location: varbinds[3] ? varbinds[3].value : 'N/A'
        };

        resolve(result);
      });
    });
  }

  async getInterfaceStatus() {
    return new Promise((resolve, reject) => {
      const oids = {
        ifNumber: [1, 3, 6, 1, 2, 1, 2, 1, 0],
        ifDescr: [1, 3, 6, 1, 2, 1, 2, 2, 1, 2],
        ifOperStatus: [1, 3, 6, 1, 2, 1, 2, 2, 1, 8]
      };

      this.session.getSubtree({ oid: oids.ifDescr }, (error, varbinds) => {
        if (error) {
          reject(error);
          return;
        }

        const interfaces = varbinds.map(varbind => ({
          name: varbind.value,
          oid: varbind.oid
        }));

        resolve(interfaces);
      });
    });
  }

  async checkHealth() {
    try {
      const systemInfo = await this.getSystemInfo();
      const interfaces = await this.getInterfaceStatus();

      const status = {
        timestamp: new Date().toISOString(),
        online: true,
        systemInfo,
        interfaceCount: interfaces.length,
        interfaces: interfaces.slice(0, 5) // Only first 5 for summary
      };

      logger.info(`OLT Health Check: ${systemInfo.name} - ${interfaces.length} interfaces`);

      // Check if status changed significantly
      if (this.hasSignificantChange(status)) {
        await this.sendAlert(status);
      }

      this.lastStatus = status;
      return status;

    } catch (error) {
      logger.error('OLT health check failed', error);

      const status = {
        timestamp: new Date().toISOString(),
        online: false,
        error: error.message
      };

      // Send alert if OLT is down and alert not sent recently
      if (!this.alertSent.oltDown || Date.now() - this.alertSent.oltDown > 3600000) {
        await this.sendAlert(status);
        this.alertSent.oltDown = Date.now();
      }

      return status;
    }
  }

  hasSignificantChange(newStatus) {
    if (!this.lastStatus.online && newStatus.online) {
      return true; // OLT came back online
    }
    return false;
  }

  async sendAlert(status) {
    try {
      let message = '🚨 *ALERT: OLT Monitoring*\n\n';

      if (status.online) {
        message += `✅ *Status:* Online\n`;
        message += `📍 *Location:* ${status.systemInfo.location}\n`;
        message += `🔧 *Device:* ${status.systemInfo.name}\n`;
        message += `⏱️ *Uptime:* ${status.systemInfo.uptime}\n`;
        message += `🔌 *Interfaces:* ${status.interfaceCount}\n`;
        message += `⏰ *Time:* ${new Date().toLocaleString('id-ID')}`;
      } else {
        message += `❌ *Status:* OFFLINE\n`;
        message += `⚠️ *Error:* ${status.error}\n`;
        message += `⏰ *Time:* ${new Date().toLocaleString('id-ID')}\n\n`;
        message += `Mohon segera dicek!`;
      }

      await whatsappService.sendMessage(config.monitoring.alertPhoneNumber, message);
      logger.success('OLT alert sent via WhatsApp');

    } catch (error) {
      logger.error('Failed to send OLT alert', error);
    }
  }

  formatUptime(timeticks) {
    const seconds = Math.floor(timeticks / 100);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('OLT monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.success('OLT monitoring started');

    // Initial check
    this.checkHealth();

    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkHealth();
    }, config.olt.checkInterval);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
      logger.info('OLT monitoring stopped');
    }
  }
}

module.exports = new OLTMonitor();
