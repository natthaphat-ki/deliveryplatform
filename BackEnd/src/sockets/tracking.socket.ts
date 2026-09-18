import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from '../types/express';

interface TrackingMessage {
  type: 'location_update' | 'order_status_update';
  orderId: number;
  payload: unknown;
}

// Rooms keyed by orderId so Customer/Admin clients watching the same order share updates.
const orderRooms = new Map<number, Set<WebSocket>>();

function joinRoom(orderId: number, socket: WebSocket): void {
  const room = orderRooms.get(orderId) ?? new Set<WebSocket>();
  room.add(socket);
  orderRooms.set(orderId, room);
}

function leaveAllRooms(socket: WebSocket): void {
  orderRooms.forEach((sockets) => sockets.delete(socket));
}

export function broadcastToOrder(orderId: number, message: TrackingMessage): void {
  const room = orderRooms.get(orderId);
  room?.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Realtime GPS/order-status channel, wired up in full during Phase 10.
export function createSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, request) => {
    const token = new URL(request.url ?? '', 'http://localhost').searchParams.get('token');

    let user: AuthTokenPayload | null = null;
    try {
      user = token ? (jwt.verify(token, env.jwt.secret) as AuthTokenPayload) : null;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    if (!user) {
      socket.close(4001, 'Missing token');
      return;
    }

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as TrackingMessage & { subscribeOrderId?: number };
        if (message.subscribeOrderId) {
          joinRoom(message.subscribeOrderId, socket);
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on('close', () => leaveAllRooms(socket));
  });

  return wss;
}
