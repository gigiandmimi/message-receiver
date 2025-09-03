<// 后端API：处理留言的存储和读取
// 路径：api/guestbook.js

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 设置响应头，允许跨域和指定内容类型
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ status: 'ok' });
    }

    try {
        // 获取所有留言 (GET请求)
        if (req.method === 'GET') {
            // 从KV存储获取所有留言ID
            const noteIds = await kv.zrange('guestbook:notes', 0, -1, {
                rev: true // 按时间倒序排列（最新的在前）
            });

            // 获取每条留言的详细内容
            const notes = [];
            for (const id of noteIds) {
                const note = await kv.get(`guestbook:note:${id}`);
                if (note) {
                    notes.push(note);
                }
            }

            return res.status(200).json(notes);
        }

        // 发布新留言 (POST请求)
        if (req.method === 'POST') {
            // 验证请求数据
            if (!req.body || !req.body.author || !req.body.content) {
                return res.status(400).json({ error: '请提供昵称和留言内容' });
            }

            // 清理和验证输入
            const author = req.body.author.trim().substring(0, 20); // 限制昵称长度
            const content = req.body.content.trim().substring(0, 500); // 限制内容长度

            if (author.length === 0 || content.length === 0) {
                return res.status(400).json({ error: '昵称和留言内容不能为空' });
            }

            // 创建留言对象
            const noteId = Date.now().toString(); // 使用时间戳作为ID
            const note = {
                id: noteId,
                author: author,
                content: content,
                timestamp: new Date().toISOString() // 存储ISO格式时间戳
            };

            // 存储留言：
            // 1. 存储到有序集合，用于排序和获取列表
            await kv.zadd('guestbook:notes', {
                score: parseInt(noteId), // 使用时间戳作为分数，用于排序
                member: noteId
            });

            // 2. 存储留言详细内容
            await kv.set(`guestbook:note:${noteId}`, note);

            // 3. 限制最多存储1000条留言
            await kv.zremrangebyrank('guestbook:notes', 0, -1001);

            return res.status(200).json({ status: 'success', noteId: noteId });
        }

        // 不支持的请求方法
        return res.status(405).json({ error: '不支持的请求方法' });

    } catch (error) {
        console.error('API错误:', error);
        return res.status(500).json({ error: '服务器内部错误', details: error.message });
    }
}
    
