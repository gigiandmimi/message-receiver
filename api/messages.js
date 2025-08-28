// 无需KV存储，使用文件存储消息
// 路径：api/messages.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// 定义存储消息的文件路径
const MESSAGES_FILE = join(process.cwd(), 'messages.json');

// 确保消息文件存在
if (!existsSync(MESSAGES_FILE)) {
  writeFileSync(MESSAGES_FILE, JSON.stringify([]), 'utf8');
}

export default async function handler(req, res) {
  // 允许跨域请求
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 读取现有消息
    const readMessages = () => {
      const data = readFileSync(MESSAGES_FILE, 'utf8');
      return JSON.parse(data) || [];
    };

    // 1. 获取所有消息（GET请求）
    if (req.method === 'GET') {
      const messages = readMessages();
      return res.status(200).json(messages);
    }

    // 2. 保存新消息（POST请求）
    if (req.method === 'POST') {
      const { message } = req.body;
      
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: '信息内容不能为空' });
      }

      // 创建新消息
      const newMessage = {
        message: message.trim(),
        time: new Date().toLocaleString()
      };

      // 读取现有消息并添加新消息
      const messages = readMessages();
      messages.unshift(newMessage); // 最新的消息放在前面

      // 限制最多存储1000条消息
      if (messages.length > 1000) {
        messages.pop(); // 移除最旧的消息
      }

      // 写入文件
      writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');

      return res.status(200).json({ status: 'success' });
    }

    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
