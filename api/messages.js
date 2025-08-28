// 修复错误响应格式的后端API
// 路径：api/messages.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// 定义消息存储文件路径
const MESSAGES_FILE = join(process.cwd(), 'messages.json');

// 初始化文件（确保文件存在）
try {
  if (!existsSync(MESSAGES_FILE)) {
    writeFileSync(MESSAGES_FILE, JSON.stringify([]), 'utf8');
  }
} catch (error) {
  console.error('初始化文件失败:', error);
}

export default async function handler(req, res) {
  // 强制设置响应为JSON格式
  res.setHeader('Content-Type', 'application/json');
  
  // 跨域配置
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' }); // 确保OPTIONS请求返回JSON
  }

  try {
    // 读取消息
    const readMessages = () => {
      try {
        const data = readFileSync(MESSAGES_FILE, 'utf8');
        return Array.isArray(JSON.parse(data)) ? JSON.parse(data) : [];
      } catch (err) {
        console.error('读取文件错误:', err);
        throw new Error('读取消息失败'); // 抛出自定义错误，统一处理
      }
    };

    // GET请求：返回消息
    if (req.method === 'GET') {
      const messages = readMessages();
      return res.status(200).json(messages);
    }

    // POST请求：保存消息
    if (req.method === 'POST') {
      if (!req.body || typeof req.body.message !== 'string') {
        return res.status(400).json({ error: '无效的信息格式' });
      }

      const messageContent = req.body.message.trim();
      if (!messageContent) {
        return res.status(400).json({ error: '信息内容不能为空' });
      }

      const newMessage = {
        message: messageContent,
        time: new Date().toLocaleString()
      };

      const messages = readMessages();
      messages.unshift(newMessage);
      if (messages.length > 1000) messages.pop();

      writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
      return res.status(200).json({ status: 'success' });
    }

    return res.status(405).json({ error: '不支持的请求方法' });

  } catch (error) {
    // 关键：所有错误都返回JSON格式
    console.error('API错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误', 
      details: error.message // 包含具体错误信息，方便排查
    });
  }
}
