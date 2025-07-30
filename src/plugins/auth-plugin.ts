import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyPlugin from "fastify-plugin";

interface AuthenticatedRequest extends FastifyRequest {
  authenticated?: boolean;
}

const authPlugin = async (fastify: FastifyInstance) => {
  const apiKey = process.env.API_KEY;
  
  fastify.log.info(`Auth plugin loaded. API_KEY configured: ${!!apiKey}`);

  const authenticate = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!apiKey) {
      fastify.log.warn("API_KEY not configured - authentication disabled, allowing request");
      return;
    }
    
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        reply.status(401).send({ 
          error: 'Unauthorized',
          message: 'Missing Authorization header'
        });
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (token !== apiKey) {
        fastify.log.warn('Invalid API key', token, apiKey);
        reply.status(401).send({ 
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
        return;
      }

      request.authenticated = true;
    } catch (error) {
      fastify.log.error('Authentication error:', error);
      reply.status(500).send({ 
        error: 'Internal Server Error',
        message: 'Authentication failed'
      });
    }
  };

  fastify.decorate('authenticate', authenticate);

  fastify.decorate('optionalAuth', async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    
    if (authHeader && apiKey) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
      
      if (token === apiKey) {
        request.authenticated = true;
      }
    }
  });
};

export default fastifyPlugin(authPlugin);