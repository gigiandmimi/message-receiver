// 后端API：处理信息的存储和读取
// 路径：api/messages.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// 定义消息存储文件的路径（项目根目录下的messages.json）
const MESSAGES_FILE = join(process.cwd(), 'messages.json');

// 确保消息文件存在，如果不存在则创建空文件
try {
  if (!existsSync(MESSAGES_FILE)) {
    writeFileSync(MESSAGES_FILE, JSON.stringify([]), 'utf8');
    console.log('创建了新的messages.json文件');
  }
} catch (error) {
  console.error('初始化文件失败:', error);
}

export default async function handler(req, res) {
  // 允许跨域请求（关键配置，缺失会导致前端无法调用API）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求（必须响应，否则POST请求会失败）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 读取消息的工具函数
    const readMessages = () => {
      try {
        const data = readFileSync(MESSAGES_FILE, 'utf8');
        // 确保返回的是数组（防止文件内容损坏）
        return Array.isArray(JSON.parse(data)) ? JSON.parse(data) : [];
      } catch (error) {
        console.error('读取文件失败:', error);
        return []; // 读取失败时返回空数组
      }
    };

    // 1. 处理GET请求：返回所有消息
    if (req.method === 'GET') {
      const messages = readMessages();
      return res.status(200).json(messages);
    }

    // 2. 处理POST请求：保存新消息
    if (req.method === 'POST') {
      // 验证请求数据
      if (!req.body || typeof req.body.message !== 'string') {
        return res.status(400).json({ error: '无效的信息格式' });
      }

      const messageContent = req.body.message.trim();
      if (!messageContent) {
        return res.status(400).json({ error: '信息内容不能为空' });
      }

      // 创建新消息对象
      const newMessage = {
        message: messageContent,
        time: new Date().toLocaleString() // 格式：2023/10/1 12:30:45
      };

      // 读取现有消息并添加新消息
      const messages = readMessages();
      messages.unshift(newMessage); // 最新的消息放在最前面

      // 限制最多存储1000条消息（防止文件过大）
      if (messages.length > 1000) {
        messages.pop(); // 移除最旧的消息
      }

      // 写入文件
      writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');

      return res.status(200).json({ status: 'success' });
    }

    // 处理不支持的请求方法
    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (error) {
    console.error('API处理错误:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
