import { Hono } from 'hono'
import md5 from 'md5'
import { sign } from 'hono/jwt'

import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())
const userRoutes = new Hono()

// 用户注册
userRoutes.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json()

    // 验证输入
    if (!email || !password) {
      return c.json({ message: 'Email and password are required' }, 400)
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return c.json({ message: 'User already exists' }, 409)
    }

    // 密码加密
    const hashedPassword = md5(md5(password)+'clicli2333?side.cc')

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    return c.json({ message: 'User registered successfully', user }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ message: 'Registration failed' }, 500)
  }
})

// 用户登录
userRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    const JWT_KEY = process.env.JWT_KEY || 'your-secret-key-change-in-production'

    // 验证输入
    if (!email || !password) {
      return c.json({ message: 'Email and password are required' }, 400)
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return c.json({ message: 'Invalid credentials' }, 401)
    }

    // 验证密码
    const hashedPassword = md5(md5(password)+'clicli2333?side.cc')
    const isPasswordValid = hashedPassword === user.password
    if (!isPasswordValid) {
      return c.json({ message: 'Invalid credentials' }, 401)
    }

    // 生成JWT
    const token = await sign(
      { 
        sub: user.id, 
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24小时有效期
      }, 
      JWT_KEY
    )

    return c.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ message: 'Login failed' }, 500)
  }
})

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
