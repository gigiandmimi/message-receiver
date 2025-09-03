// 基于原有可用版本的留言板API
// 路径：api/messages.js

// 兼容处理：如果KV未配置，提供友好错误
let kv;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.warn('Vercel KV未配置，将使用模拟数据');
  // 模拟KV存储（仅用于调试，实际部署需配置KV）
  const mockData = { notes: [], noteMap: {} };
  kv = {
    zrange: async (key, start, end, options) => {
      return [...mockData.notes].reverse(); // 模拟倒序
    },
    get: async (key) => {
      return mockData.noteMap[key.replace('guestbook:note:', '')] || null;
    },
    zadd: async (key, data) => {
      mockData.notes.push(data.member);
    },
    set: async (key, value) => {
      mockData.noteMap[value.id] = value;
    },
    zremrangebyrank: async () => {}
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    // 获取所有留言
    if (req.method === 'GET') {
      try {
        const noteIds = await kv.zrange('guestbook:notes', 0, -1, { rev: true });
        const notes = [];
        for (const id of noteIds) {
          const note = await kv.get(`guestbook:note:${id}`);
          if (note) notes.push(note);
        }
        return res.status(200).json(notes);
      } catch (error) {
        console.error('获取留言失败:', error);
        return res.status(500).json({ 
          error: '获取留言失败', 
          details: '请检查Vercel KV配置是否正确' 
        });
      }
    }

    // 发布新留言
    if (req.method === 'POST') {
      if (!req.body || !req.body.author || !req.body.content) {
        return res.status(400).json({ error: '请填写昵称和留言内容' });
      }

      const author = req.body.author.trim().substring(0, 20);
      const content = req.body.content.trim().substring(0, 500);

      if (!author || !content) {
        return res.status(400).json({ error: '昵称和留言内容不能为空' });
      }

      const noteId = Date.now().toString();
      const note = { id: noteId, author, content, timestamp: new Date().toISOString() };

      try {
        await kv.zadd('guestbook:notes', { score: parseInt(noteId), member: noteId });
        await kv.set(`guestbook:note:${noteId}`, note);
        await kv.zremrangebyrank('guestbook:notes', 0, -1001);
        return res.status(200).json({ status: 'success' });
      } catch (error) {
        console.error('保存留言失败:', error);
        return res.status(500).json({ 
          error: '发布留言失败', 
          details: '请检查Vercel KV是否已正确启用' 
        });
      }
    }

    return res.status(405).json({ error: '不支持的请求方法' });

  } catch (error) {
    console.error('服务器错误:', error);
    return res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}
