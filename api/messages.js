// 修复服务器内部错误的后端API
// 路径：api/messages.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// 关键修改：使用Vercel允许写入的临时目录/tmp
// 注意：/tmp目录在函数冷启动时可能被清空，但对小型应用影响不大
const MESSAGES_FILE = join('/tmp', 'messages.json');

// 初始化文件（确保文件存在）
try {
  if (!existsSync(MESSAGES_FILE)) {
    // 首次运行时创建文件
    writeFileSync(MESSAGES_FILE, JSON.stringify([]), 'utf8');
    console.log('在/tmp目录创建了messages.json');
  }
} catch (error) {
  console.error('初始化文件失败:', error);
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
    // 读取消息
    const readMessages = () => {
      try {
        if (!existsSync(MESSAGES_FILE)) {
          // 如果文件不存在（冷启动后），返回空数组
          return [];
        }
        const data = readFileSync(MESSAGES_FILE, 'utf8');
        return Array.isArray(JSON.parse(data)) ? JSON.parse(data) : [];
      } catch (err) {
        console.error('读取文件错误:', err);
        throw new Error('读取消息失败：' + err.message);
      }
    };

    // GET请求：返回消息
    if (req.method === 'GET') {
      const messages = readMessages();
      return res.status(200).json(messages);
    }

    // POST请求：保存消息（重点修复部分）
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

      // 读取现有消息
      const messages = readMessages();
      messages.unshift(newMessage);
      if (messages.length > 1000) messages.pop(); // 限制数量

      // 写入临时目录（关键修改：这里之前可能因权限失败）
      writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
      console.log('消息写入成功，当前数量：', messages.length);

      return res.status(200).json({ status: 'success' });
    }

    return res.status(405).json({ error: '不支持的请求方法' });

  } catch (error) {
    // 捕获所有错误并返回详细信息
    console.error('API处理错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误', 
      details: error.message,
      file: MESSAGES_FILE // 输出文件路径帮助排查
    });
  }
}
