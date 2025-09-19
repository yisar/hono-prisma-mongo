import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import userRoutes from './routes/user.routes'
import messageRoutes from './routes/message.routes'
import authRoutes from './routes/auth.routes'

// 加载环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const app = new Hono()

// 中间件
app.use(cors())

// JWT认证中间件
const authMiddleware = jwt({
  secret: JWT_SECRET
})

// 根路由
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to Hono + Prisma + MongoDB API with Auth',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages'
    }
  })
})

// 公开路由
app.route('/api/auth', authRoutes)

// 需要认证的路由
app
  .use(authMiddleware)
  .route('/api/users', userRoutes)
app
  .use(authMiddleware)
  .route('/api/messages', messageRoutes)

export default app

// 启动服务器
// const port = parseInt(process.env.PORT || '3000')
// console.log(`Server is running on http://localhost:${port}`)

// serve({
//   fetch: app.fetch,
//   port
// })
