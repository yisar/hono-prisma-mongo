import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const userRoutes = new Hono()

// 获取当前登录用户信息
userRoutes.get('/me', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return c.json({ message: 'User not found' }, 404)
    }

    return c.json(user)
  } catch (error) {
    console.error('Get current user error:', error)
    return c.json({ message: 'Failed to get user' }, 500)
  }
})

// 获取所有用户
userRoutes.get('/', async (c) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    return c.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ message: 'Failed to get users' }, 500)
  }
})

// 获取单个用户
userRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    if (!user) {
      return c.json({ message: 'User not found' }, 404)
    }

    return c.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ message: 'Failed to get user' }, 500)
  }
})

// 更新用户
userRoutes.put('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const id = c.req.param('id')
    
    // 检查权限 - 只能更新自己的信息
    if (userId !== id) {
      return c.json({ message: 'Unauthorized' }, 403)
    }

    const { name, email } = await c.req.json()
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return c.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return c.json({ message: 'Failed to update user' }, 500)
  }
})

// 删除用户
userRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const id = c.req.param('id')
    
    // 检查权限 - 只能删除自己的账户
    if (userId !== id) {
      return c.json({ message: 'Unauthorized' }, 403)
    }

    await prisma.user.delete({
      where: { id }
    })

    return c.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ message: 'Failed to delete user' }, 500)
  }
})

export default userRoutes
