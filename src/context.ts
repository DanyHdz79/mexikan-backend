import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  token: any
}

export function createContext() {
  const context = async({ req, connection }: any):Promise<Context> => {
    const token = req ? req.headers.authorization : connection.authorization  
    return { prisma, token }
  }
  return context
}