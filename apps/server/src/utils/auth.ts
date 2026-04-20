import { FastifyReply, FastifyRequest } from "fastify";

type JwtPayload = {
  id: string;
  username: string;
  role: "admin" | "user";
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify<JwtPayload>();
  } catch {
    reply.code(401).send({ message: "未登录或登录已过期" });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify<JwtPayload>();
    if (request.user.role !== "admin") {
      reply.code(403).send({ message: "没有管理员权限" });
    }
  } catch {
    reply.code(401).send({ message: "未登录或登录已过期" });
  }
}
