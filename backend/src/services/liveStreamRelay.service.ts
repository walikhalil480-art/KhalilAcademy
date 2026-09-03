import { Response } from 'express';

interface ClientConnection {
  id: string;
  sessionId: string;
  res: Response;
  userId?: string;
  role?: string;
}

export class LiveStreamRelayService {
  private static clients: Map<string, Set<ClientConnection>> = new Map();
  private static sessionState: Map<string, any> = new Map();

  public static addClient(sessionId: string, client: ClientConnection) {
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, new Set());
    }
    this.clients.get(sessionId)!.add(client);

    // Send latest cached host state if exists
    const cachedState = this.sessionState.get(sessionId);
    if (cachedState) {
      try {
        client.res.write(`event: HOST_STATE_SYNC\ndata: ${JSON.stringify(cachedState)}\n\n`);
      } catch (e) {}
    }
  }

  public static removeClient(sessionId: string, client: ClientConnection) {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      sessionClients.delete(client);
      if (sessionClients.size === 0) {
        this.clients.delete(sessionId);
      }
    }
  }

  public static broadcastEvent(
    sessionId: string,
    eventType: string,
    payload: any,
    excludeClientId?: string
  ) {
    if (eventType === 'HOST_STATE_SYNC') {
      this.sessionState.set(sessionId, payload);
    }

    const sessionClients = this.clients.get(sessionId);
    if (!sessionClients || sessionClients.size === 0) return;

    const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;

    sessionClients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;
      try {
        client.res.write(message);
      } catch (err) {
        this.removeClient(sessionId, client);
      }
    });
  }
}
