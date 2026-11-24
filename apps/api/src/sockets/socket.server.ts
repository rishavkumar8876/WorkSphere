import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticatedUserPayload } from '@worksphere/shared-types';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUserPayload;
  organizationId?: string;
}

export class SocketServer {
  private static instance: SocketServer;
  private io: SocketIOServer | null = null;

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }
    return SocketServer.instance;
  }

  public init(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.corsOrigin,
        credentials: true,
      },
      path: '/socket.io',
    });

    // Handshake Authentication Middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        logger.warn('Socket connection rejected: No token provided');
        return next(new Error('Authentication error: Token required'));
      }

      try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as AuthenticatedUserPayload;
        socket.user = decoded;
        socket.organizationId = decoded.organizationId || undefined;
        next();
      } catch (err) {
        logger.warn('Socket connection rejected: Invalid token');
        next(new Error('Authentication error: Invalid or expired token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.user!;
      const orgId = socket.organizationId;
      logger.info(`User connected to Socket.IO: ${user.email} (${user.userId}) in Org: ${orgId}`);

      // Auto-join tenant room
      if (orgId) {
        const orgRoom = `org:${orgId}`;
        socket.join(orgRoom);
        logger.debug(`Socket ${socket.id} joined room ${orgRoom}`);
      }

      // Auto-join personal notifications room
      socket.join(`user:${user.userId}`);

      // Client can join a specific project room when viewing a project board
      socket.on('join:project', (projectId: string) => {
        const projectRoom = `org:${orgId}:project:${projectId}`;
        socket.join(projectRoom);
        logger.debug(`User ${user.email} joined project room: ${projectRoom}`);
      });

      socket.on('leave:project', (projectId: string) => {
        const projectRoom = `org:${orgId}:project:${projectId}`;
        socket.leave(projectRoom);
        logger.debug(`User ${user.email} left project room: ${projectRoom}`);
      });

      socket.on('disconnect', () => {
        logger.debug(`Socket disconnected: ${socket.id} (User: ${user.email})`);
      });
    });

    return this.io;
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcast real-time task update to all members viewing the project.
   */
  public emitTaskUpdated(organizationId: string, projectId: string, task: unknown) {
    if (!this.io) return;
    const room = `org:${organizationId}:project:${projectId}`;
    this.io.to(room).emit('task:updated', task);
    logger.debug(`Emitted 'task:updated' to room ${room}`);
  }

  /**
   * Broadcast real-time task creation
   */
  public emitTaskCreated(organizationId: string, projectId: string, task: unknown) {
    if (!this.io) return;
    const room = `org:${organizationId}:project:${projectId}`;
    this.io.to(room).emit('task:created', task);
  }

  /**
   * Direct real-time notification to a specific user
   */
  public emitNotification(userId: string, notification: unknown) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('notification:received', notification);
  }
}

export const socketServer = SocketServer.getInstance();
export default socketServer;
