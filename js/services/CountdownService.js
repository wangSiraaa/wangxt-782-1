class CountdownService {
  constructor() {
    this.timers = new Map();
    this.listeners = new Map();
  }

  startCountdown(id, targetDate, onTick, onExpire) {
    this.stopCountdown(id);
    
    const tick = () => {
      const remaining = getRemainingTime(targetDate);
      if (onTick) onTick(remaining, id);
      
      if (remaining.expired) {
        this.stopCountdown(id);
        if (onExpire) onExpire(id);
        return;
      }
    };
    
    tick();
    const intervalId = setInterval(tick, 1000);
    this.timers.set(id, intervalId);
  }

  stopCountdown(id) {
    const intervalId = this.timers.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.timers.delete(id);
    }
  }

  stopAll() {
    this.timers.forEach((intervalId, id) => {
      clearInterval(intervalId);
    });
    this.timers.clear();
  }

  addListener(id, callback) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, []);
    }
    this.listeners.get(id).push(callback);
  }

  removeListener(id, callback) {
    const callbacks = this.listeners.get(id);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(id, data) {
    const callbacks = this.listeners.get(id);
    if (callbacks) {
      callbacks.forEach(cb => cb(data, id));
    }
  }

  static formatRemaining(remaining) {
    return formatCountdown(remaining);
  }
}

const countdownService = new CountdownService();
