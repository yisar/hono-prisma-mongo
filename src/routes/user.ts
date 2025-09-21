import { Hono } from 'hono'
import md5 from 'md5'
import { jwt, sign } from 'hono/jwt'

import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())
const userRoutes = new Hono()
const JWT_KEY = process.env.JWT_KEY || 'your-secret-key-change-in-production'

// JWT认证中间件
export const auth = jwt({
  secret: JWT_KEY
})

// 用户注册
userRoutes.post('/register', async (c) => {
  try {
    const { email, pwd, name } = await c.req.json()

    // 验证输入
    if (!email || !pwd) {
      return c.json({ message: '邮箱和密码不能不填' }, 400)
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return c.json({ message: '用户已存在' }, 409)
    }

    // 密码加密
    const hashedpwd = md5(md5(pwd) + 'clicli2333?side.cc')

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        pwd: hashedpwd,
        name
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    return c.json({ message: '注册成功', user }, 201)
  } catch (error) {
    console.error(`报错 ${error}`, error)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

// 用户登录
userRoutes.post('/login', async (c) => {
  try {
    const { email, pwd } = await c.req.json()
    const JWT_KEY = process.env.JWT_KEY || 'your-secret-key-change-in-production'

    // 验证输入
    if (!email || !pwd) {
      return c.json({ message: '邮箱和密码必须' }, 400)
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return c.json({ message: 'token失效' }, 401)
    }

    // 验证密码
    const hashedpwd = md5(md5(pwd) + 'clicli2333?side.cc')
    const ispwdValid = hashedpwd === user.pwd
    if (!ispwdValid) {
      return c.json({ message: '用户名或密码不存在' }, 401)
    }

    // 生成JWT
    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 48 // 24小时有效期
      },
      JWT_KEY
    )

    return c.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    console.error(`报错 ${error}`)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

// 获取当前登录用户信息
userRoutes.get('/me', auth, async (c) => {
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
      return c.json({ message: '用户存在' }, 404)
    }

    return c.json(user)
  } catch (error) {
    console.error(`报错 ${error}`)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

// 获取所有用户
userRoutes.get('/', auth, async (c) => {
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
    console.error(`报错 ${error}`)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

// 获取单个用户
userRoutes.get('/:id', auth, async (c) => {
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
      return c.json({ message: '用户不存在' }, 404)
    }

    return c.json(user)
  } catch (error) {
    console.error(`报错 ${error}`)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

// 更新用户
userRoutes.put('/:id', auth, async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const id = c.req.param('id')

    // 检查权限 - 只能更新自己的信息
    if (userId !== id) {
      return c.json({ message: '用户没有权限' }, 403)
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
    console.error(`报错 ${error}`)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

// 删除用户
userRoutes.delete('/:id', auth, async (c) => {
  try {
    const userId = c.get('jwtPayload').sub
    const id = c.req.param('id')

    // 检查权限 - 只能删除自己的账户
    if (userId !== id) {
      return c.json({ message: '没有权限' }, 403)
    }

    await prisma.user.delete({
      where: { id }
    })

    return c.json({ message: '删除成功' })
  } catch (error) {
    console.error(`报错 ${error}`)
    return c.json({ message: `报错 ${error}` }, 500)
  }
})

export default userRoutes
