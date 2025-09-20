import { Hono } from 'hono'
import md5 from 'md5'
import { sign } from 'hono/jwt'

import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())
const authRoutes = new Hono()

// 用户注册
authRoutes.post('/register', async (c) => {
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
authRoutes.post('/login', async (c) => {
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

export default authRoutes
