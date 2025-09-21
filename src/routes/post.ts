import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { auth } from './user' // 导入已有的认证中间件

const prisma = new PrismaClient().$extends(withAccelerate())
const postRoutes = new Hono()

// 递归获取帖子的所有子内容（回答和评论）
const getPostWithChildren: any = async (postId: string) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })

    if (!post) return null

    // 获取直接子内容
    const children = await prisma.post.findMany({
        where: { parentId: postId },
        orderBy: { createdAt: 'desc' },
        include: {
            author: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })

    // 递归获取所有嵌套的子内容
    const childrenWithNested = await Promise.all(
        children.map(async (child) => ({
            ...child,
            children: await getPostWithChildren(child.id) || []
        }))
    )

    return {
        ...post,
        children: childrenWithNested
    }
}

// 创建问题
postRoutes.post('/questions', auth, async (c) => {
    try {
        const userId = c.get('jwtPayload').sub
        const { title, content } = await c.req.json()

        // 验证输入
        if (!title || !content) {
            return c.json({ message: '标题和内容不能为空' }, 400)
        }

        // 创建问题（类型为QUESTION，没有父级）
        const question = await prisma.post.create({
            data: {
                type: 'QUESTION',
                title,
                content,
                authorId: userId
                // parentId 默认为null
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return c.json({ message: '问题创建成功', question }, 201)
    } catch (error) {
        console.error(`创建问题报错: ${error}`)
        return c.json({ message: `创建问题失败: ${error}` }, 500)
    }
})

// 获取所有问题（支持分页）
postRoutes.get('/questions', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '10')
        const skip = (page - 1) * limit

        // 只查询类型为QUESTION的帖子
        const [questions, total] = await Promise.all([
            prisma.post.findMany({
                where: { type: 'QUESTION' },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    // 只统计一级回答数量
                    _count: {
                        select: { children: true }
                    }
                }
            }),
            prisma.post.count({ where: { type: 'QUESTION' } })
        ])

        return c.json({
            questions,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error(`获取问题列表报错: ${error}`)
        return c.json({ message: `获取问题列表失败: ${error}` }, 500)
    }
})

// 获取单个问题（包含所有回答和评论）
postRoutes.get('/questions/:id', async (c) => {
    try {
        const id = c.req.param('id')

        // 验证是否为问题
        const question = await prisma.post.findUnique({
            where: { id, type: 'QUESTION' }
        })

        if (!question) {
            return c.json({ message: '问题不存在' }, 404)
        }

        // 获取问题及其所有嵌套的回答和评论
        const questionWithAnswers = await getPostWithChildren(id)

        return c.json(questionWithAnswers)
    } catch (error) {
        console.error(`获取问题详情报错: ${error}`)
        return c.json({ message: `获取问题详情失败: ${error}` }, 500)
    }
})

// 回答问题或评论回答
postRoutes.post('/posts/:parentId/answers', auth, async (c) => {
    try {
        const userId = c.get('jwtPayload').sub
        const parentId = c.req.param('parentId')
        const { content } = await c.req.json()

        // 验证输入
        if (!content) {
            return c.json({ message: '回答内容不能为空' }, 400)
        }

        // 检查父级内容是否存在（可以是问题或回答）
        const parentPost = await prisma.post.findUnique({
            where: { id: parentId }
        })

        if (!parentPost) {
            return c.json({ message: '父级内容不存在' }, 404)
        }

        // 创建回答（类型为ANSWER，父级为指定的问题或回答）
        const answer = await prisma.post.create({
            data: {
                type: 'ANSWER',
                content,
                authorId: userId,
                parentId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return c.json({ message: '回答创建成功', answer }, 201)
    } catch (error) {
        console.error(`创建回答报错: ${error}`)
        return c.json({ message: `创建回答失败: ${error}` }, 500)
    }
})

// 更新帖子（问题或回答）
postRoutes.put('/posts/:id', auth, async (c) => {
    try {
        const userId = c.get('jwtPayload').sub
        const id = c.req.param('id')
        const { title, content } = await c.req.json()

        // 检查帖子是否存在
        const post = await prisma.post.findUnique({
            where: { id }
        })

        if (!post) {
            return c.json({ message: '内容不存在' }, 404)
        }

        // 检查权限
        if (post.authorId !== userId) {
            return c.json({ message: '没有权限修改此内容' }, 403)
        }

        // 验证输入
        if (post.type === 'QUESTION' && !title) {
            return c.json({ message: '问题标题不能为空' }, 400)
        }
        if (!content) {
            return c.json({ message: '内容不能为空' }, 400)
        }

        // 更新帖子
        const updatedPost = await prisma.post.update({
            where: { id },
            data: {
                ...(post.type === 'QUESTION' && { title }), // 只有问题才更新标题
                content
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return c.json({ message: '内容更新成功', post: updatedPost })
    } catch (error) {
        console.error(`更新内容报错: ${error}`)
        return c.json({ message: `更新内容失败: ${error}` }, 500)
    }
})

// 删除帖子（问题或回答）
postRoutes.delete('/posts/:id', auth, async (c) => {
    try {
        const userId = c.get('jwtPayload').sub
        const id = c.req.param('id')

        // 检查帖子是否存在
        const post = await prisma.post.findUnique({
            where: { id }
        })

        if (!post) {
            return c.json({ message: '内容不存在' }, 404)
        }

        // 检查权限
        if (post.authorId !== userId) {
            return c.json({ message: '没有权限删除此内容' }, 403)
        }

        // 删除帖子（会级联删除所有子内容）
        await prisma.post.delete({
            where: { id }
        })

        return c.json({ message: '内容删除成功' })
    } catch (error) {
        console.error(`删除内容报错: ${error}`)
        return c.json({ message: `删除内容失败: ${error}` }, 500)
    }
})

export default postRoutes
