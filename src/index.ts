import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { cors } from 'hono/cors'

// 初始化Prisma客户端
const prisma = new PrismaClient()

// 初始化Hono应用
const app = new Hono()

// 中间件
app.use(cors()) // 允许跨域请求

// 健康检查接口
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 用户相关接口
app.get('/users', async (c) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return c.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

app.get('/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

app.post('/users', async (c) => {
  try {
    const data = await c.req.json()
    
    // 验证必要字段
    if (!data.name || !data.email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }
    
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        pwd: data.pwd,
        bio: data.bio
      }
    })
    
    return c.json(user, 201)
  } catch (error) {
    console.error('Error creating user:', error)
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

app.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        pwd: data.pwd,
        bio: data.bio
      }
    })
    
    return c.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

app.delete('/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await prisma.user.delete({
      where: { id }
    })
    
    return c.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

// 粉丝相关接口
app.post('/users/:userId/follow/:followerId', async (c) => {
  try {
    const { userId, followerId } = c.req.param()
    
    // 不能关注自己
    if (userId === followerId) {
      return c.json({ error: 'You cannot follow yourself' }, 400)
    }
    
    // 检查用户是否存在
    const [user, follower] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: followerId } })
    ])
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    if (!follower) {
      return c.json({ error: 'Follower user not found' }, 404)
    }
    
    // 检查是否已经关注
    if (user.followers.includes(followerId)) {
      return c.json({ error: 'Already following this user' }, 400)
    }
    
    // 添加关注
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        followers: {
          push: followerId
        }
      }
    })
    
    return c.json(updatedUser)
  } catch (error) {
    console.error('Error following user:', error)
    return c.json({ error: 'Failed to follow user' }, 500)
  }
})

app.post('/users/:userId/unfollow/:followerId', async (c) => {
  try {
    const { userId, followerId } = c.req.param()
    
    // 检查用户是否存在
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // 检查是否已经关注
    if (!user.followers.includes(followerId)) {
      return c.json({ error: 'Not following this user' }, 400)
    }
    
    // 取消关注
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        followers: {
          set: user.followers.filter(id => id !== followerId)
        }
      }
    })
    
    return c.json(updatedUser)
  } catch (error) {
    console.error('Error unfollowing user:', error)
    return c.json({ error: 'Failed to unfollow user' }, 500)
  }
})

app.get('/users/:userId/followers', async (c) => {
  try {
    const { userId } = c.req.param()
    
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { followers: true }
    })
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // 获取粉丝详细信息
    const followers = await prisma.user.findMany({
      where: {
        id: { in: user.followers }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return c.json({
      count: followers.length,
      followers
    })
  } catch (error) {
    console.error('Error fetching followers:', error)
    return c.json({ error: 'Failed to fetch followers' }, 500)
  }
})

// 启动服务器
const port = parseInt(process.env.PORT || '3000')
console.log(`Server is running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch
}
    