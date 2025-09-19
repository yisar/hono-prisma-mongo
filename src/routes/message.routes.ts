import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'

const prisma = new PrismaClient()
const messageRoutes = new Hono()

// 获取当前用户的所有消息
messageRoutes.get('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub

    // 获取收到的消息
    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 获取发送的消息
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return c.json({
      receivedMessages,
      sentMessages
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return c.json({ message: 'Failed to get messages' }, 500)
  }
})

// 获取与特定用户的对话
messageRoutes.get('/conversation/:otherUserId', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const otherUserId = c.req.param('otherUserId')

    // 验证对方用户是否存在
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId }
    })

    if (!otherUser) {
      return c.json({ message: 'User not found' }, 404)
    }

    // 获取双方的消息
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return c.json(messages)
  } catch (error) {
    console.error('Get conversation error:', error)
    return c.json({ message: 'Failed to get conversation' }, 500)
  }
})

// 发送消息
messageRoutes.post('/', async (c) => {
  try {
    const senderId = c.get('jwtPayload').sub
    const { receiverId, content } = await c.req.json()

    // 验证输入
    if (!receiverId || !content) {
      return c.json({ message: 'Receiver ID and content are required' }, 400)
    }

    // 验证接收者是否存在
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return c.json({ message: 'Receiver not found' }, 404)
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return c.json(message, 201)
  } catch (error) {
    console.error('Send message error:', error)
    return c.json({ message: 'Failed to send message' }, 500)
  }
})

// 删除消息
messageRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const messageId = c.req.param('id')

    // 查找消息
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return c.json({ message: 'Message not found' }, 404)
    }

    // 检查权限 - 只能删除自己发送的消息
    if (message.senderId !== userId) {
      return c.json({ message: 'Unauthorized' }, 403)
    }

    await prisma.message.delete({
      where: { id: messageId }
    })

    return c.json({ message: 'Message deleted successfully' })
  } catch (error) {
    console.error('Delete message error:', error)
    return c.json({ message: 'Failed to delete message' }, 500)
  }
})

export default messageRoutes
