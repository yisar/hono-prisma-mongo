import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import userRoutes from './routes/user.routes'
import messageRoutes from './routes/message.routes'
import authRoutes from './routes/auth.routes'

// 加载环境变量
const JWT_KEY = process.env.JWT_KEY || 'your-secret-key-change-in-production'

const app = new Hono()

// 中间件
app.use(cors())

// JWT认证中间件
const authMiddleware = jwt({
  secret: JWT_KEY
})

// 根路由
app.get('/', (c) => {
  return c.text('hello side')
})

// 公开路由
app.route('/auth', authRoutes)

// 需要认证的路由
app
  .use(authMiddleware)
  .route('/user', userRoutes)
app
  .use(authMiddleware)
  .route('/msg', messageRoutes)

export default app