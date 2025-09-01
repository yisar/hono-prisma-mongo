import { Hono } from 'hono'
import prisma from '../lib/prisma'

const messageRoutes = new Hono()

// 获取用户的所有消息（发送和接收）
messageRoutes.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    // 获取发送的消息
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: {
            id: true,
            pwd: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // 获取接收的消息
    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            pwd: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return c.json({
      sent: sentMessages,
      received: receivedMessages
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

// 获取两个用户之间的对话
messageRoutes.get('/conversation/:userId1/:userId2', async (c) => {
  try {
    const userId1 = c.req.param('userId1')
    const userId2 = c.req.param('userId2')
    
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            pwd: true,
            name: true
          }
        },
        receiver: {
          select: {
            id: true,
            pwd: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    return c.json(messages)
  } catch (error) {
    return c.json({ error: 'Failed to fetch conversation' }, 500)
  }
})

// 发送消息
messageRoutes.post('/', async (c) => {
  try {
    const { senderId, receiverId, content } = await c.req.json()
    
    if (!senderId || !receiverId || !content) {
      return c.json(
        { error: 'Sender ID, receiver ID and content are required' }, 
        400
      )
    }
    
    // 验证发送者和接收者是否存在
    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: senderId } }),
      prisma.user.findUnique({ where: { id: receiverId } })
    ])
    
    if (!sender || !receiver) {
      return c.json({ error: 'Sender or receiver not found' }, 404)
    }
    
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            pwd: true,
            name: true
          }
        },
        receiver: {
          select: {
            id: true,
            pwd: true,
            name: true
          }
        }
      }
    })
    
    return c.json(message, 201)
  } catch (error) {
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// 删除消息
messageRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await prisma.message.delete({ where: { id } })
    return c.json({ message: 'Message deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete message' }, 500)
  }
})

export default messageRoutes
