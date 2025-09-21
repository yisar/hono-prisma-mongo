import { Hono } from 'hono'
import { cors } from 'hono/cors'
import userRoutes from './routes/user'
import messageRoutes from './routes/message'
import { auth } from './routes/user'
import postRoutes from './routes/post'

const app = new Hono()

// 中间件
app.use(cors())

// 根路由
app.get('/', (c) => {
  return c.text('hello side')
})

// 需要认证的路由
app
  .route('/user', userRoutes)
app
  .use(auth)
  .route('/msg', messageRoutes)

app
  .route('/qa', postRoutes)

export default app