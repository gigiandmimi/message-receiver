// 用于存储和读取消息的API接口
// 部署在Vercel上，路径为 /api/messages

import { kv } from '@vercel/kv'; // Vercel提供的免费KV存储服务

export default async function handler(req, res) {
  // 允许跨域请求
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. 读取所有消息（GET请求）
    if (req.method === 'GET') {
      // 从KV存储中获取所有消息（按时间倒序）
      const messages = await kv.lrange('messages', 0, -1) || [];
      // 转换为对象格式返回
      const parsedMessages = messages.map(msg => JSON.parse(msg));
      return res.status(200).json(parsedMessages);
    }

    // 2. 存储新消息（POST请求）
    if (req.method === 'POST') {
      const { message } = req.body;
      
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: '信息内容不能为空' });
      }
      
      // 创建消息对象（包含时间戳）
      const newMessage = {
        message: message.trim(),
        time: new Date().toLocaleString() // 格式：2023/10/1 12:30:45
      };
      
      // 存储到KV（添加到列表头部，确保最新的在前面）
      await kv.lpush('messages', JSON.stringify(newMessage));
      
      // 限制最多存储1000条消息（防止存储过多）
      await kv.ltrim('messages', 0, 999);
      
      return res.status(200).json({ status: 'success' });
    }

    // 其他请求方法
    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
