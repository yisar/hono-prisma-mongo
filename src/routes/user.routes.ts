import { Hono } from 'hono'
import prisma from '../lib/prisma'

const userRoutes = new Hono()

// 获取所有用户
userRoutes.get('/', async (c) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        pwd: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    return c.json(users)
  } catch (error) {
    return c.json({ error: 'Failed to fetch users' }, 500)
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
        pwd: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(user)
  } catch (error) {
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

// 创建用户
userRoutes.post('/', async (c) => {
  try {
    const { pwd, email, name } = await c.req.json()
    
    if (!pwd || !email) {
      return c.json({ error: 'pwd and email are required' }, 400)
    }
    
    const user = await prisma.user.create({
      data: {
        pwd,
        email,
        name
      },
      select: {
        id: true,
        pwd: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    return c.json(user, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

// 更新用户
userRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name, email } = await c.req.json()
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email
      },
      select: {
        id: true,
        pwd: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    return c.json(user)
  } catch (error) {
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

// 删除用户
userRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await prisma.user.delete({ where: { id } })
    return c.json({ message: 'User deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

export default userRoutes
