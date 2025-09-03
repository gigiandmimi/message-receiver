// 精简稳定版留言板API
// 路径：api/messages.js

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 基础配置
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 获取所有留言
        if (req.method === 'GET') {
            const noteIds = await kv.zrange('guestbook:notes', 0, -1, { rev: true });
            const notes = [];
            
            for (const id of noteIds) {
                const note = await kv.get(`guestbook:note:${id}`);
                if (note) notes.push(note);
            }
            
            return res.status(200).json(notes);
        }

        // 发布新留言
        if (req.method === 'POST') {
            const { author, content } = req.body;
            
            if (!author || !content) {
                return res.status(400).json({ error: '请填写昵称和留言内容' });
            }

            const noteId = Date.now().toString();
            const note = {
                id: noteId,
                author: author.trim().substring(0, 20),
                content: content.trim().substring(0, 500),
                timestamp: new Date().toISOString()
            };

            await kv.zadd('guestbook:notes', { score: parseInt(noteId), member: noteId });
            await kv.set(`guestbook:note:${noteId}`, note);
            await kv.zremrangebyrank('guestbook:notes', 0, -1001);
            
            return res.status(200).json({ status: 'success' });
        }

        return res.status(405).json({ error: '不支持的请求方法' });

    } catch (error) {
        console.error('API错误:', error);
        return res.status(500).json({ error: '服务器错误', details: error.message });
    }
}
