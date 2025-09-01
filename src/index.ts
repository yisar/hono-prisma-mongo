import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import userRoutes from './routes/user.routes'
import messageRoutes from './routes/message.routes'

const app = new Hono()

// 根路由
app.get('/', (c) => {
  return c.json({ 
    message: 'Welcome to Hono + Prisma + MongoDB API',
    endpoints: {
      users: '/api/users',
      messages: '/api/messages'
    }
  })
})

// API路由
app.route('/api/users', userRoutes)
app.route('/api/messages', messageRoutes)

// 启动服务器
const port = parseInt(process.env.PORT || '3000')
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
