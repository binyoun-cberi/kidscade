/* Patience Tower v2: room commands over HTTP, live poses over WebSocket. */
(function (root) {
  class TowerRealtime {
    constructor({ code, token, onState, onPose, onMode, onReplaced, WebSocketImpl = root.WebSocket }) {
      Object.assign(this, { code, token, onState, onPose, onMode, onReplaced, WebSocketImpl });
      this.stopped = true;
      this.ready = false;
      this.failures = 0;
      this.generation = 0;
    }

    async call(action, body = {}) {
      const response = await fetch('/api/multiplayer/tower/' + action, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + this.token
        },
        body: JSON.stringify({ code: this.code, ...body }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        const error = new Error(data.error || 'request_failed');
        error.code = data.error;
        error.data = data;
        throw error;
      }
      return data;
    }

    start() {
      this.stopped = false;
      this.connect();
    }

    stop() {
      this.stopped = true;
      this.ready = false;
      this.generation += 1;
      clearTimeout(this.retry);
      clearTimeout(this.openTimer);
      clearInterval(this.pingTimer);
      if (this.socket) {
        this.socket.onclose = null;
        this.socket.close();
      }
      this.socket = null;
    }

    sync() {
      if (this.ready) this.socket.send('sync');
    }

    sendPose(payload) {
      if (!this.ready || this.socket?.readyState !== 1) return false;
      this.socket.send(JSON.stringify({ type: 'pose', ...payload }));
      return true;
    }

    async connect() {
      if (this.stopped) return;
      const generation = ++this.generation;
      try {
        const { ticket } = await this.call('ticket');
        if (this.stopped || generation !== this.generation) return;

        const url = new URL('/api/multiplayer/tower/socket', root.location.href);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.searchParams.set('code', this.code);
        url.searchParams.set('ticket', ticket);

        const socket = this.socket = new this.WebSocketImpl(url);
        this.openTimer = setTimeout(() => socket.close(), 10000);

        socket.onmessage = event => {
          if (this.stopped || generation !== this.generation) return;
          this.lastMessage = Date.now();
          if (event.data === 'pong') return;

          let data;
          try { data = JSON.parse(event.data); } catch (_) { return; }

          if (data.type === 'state' && data.room?.code === this.code) {
            clearTimeout(this.openTimer);
            this.failures = 0;
            if (!this.ready) {
              this.ready = true;
              this.onMode?.(true);
              this.pingTimer = setInterval(() => {
                if (Date.now() - this.lastMessage > 65000) {
                  socket.close();
                  return;
                }
                if (socket.readyState === 1) socket.send('ping');
              }, 30000);
            }
            this.onState?.(data.room);
          } else if (data.type === 'pose') {
            this.onPose?.(data.player);
          }
        };

        socket.onerror = () => socket.close();
        socket.onclose = event => {
          if (this.stopped || generation !== this.generation) return;
          clearTimeout(this.openTimer);
          clearInterval(this.pingTimer);
          this.ready = false;
          this.onMode?.(false);
          if (event.code === 4001) {
            this.stop();
            this.onReplaced?.();
            return;
          }
          this.reconnect();
        };
      } catch (_) {
        if (this.stopped || generation !== this.generation) return;
        this.ready = false;
        this.onMode?.(false);
        this.reconnect();
      }
    }

    reconnect() {
      if (this.stopped) return;
      clearTimeout(this.retry);
      const delay = Math.min(30000, 1000 * 2 ** Math.min(this.failures++, 5)) + Math.random() * 500;
      this.retry = setTimeout(() => this.connect(), delay);
    }
  }

  root.TowerRealtime = TowerRealtime;
})(typeof window === 'undefined' ? globalThis : window);
