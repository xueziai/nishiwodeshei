// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000; // 后端服务器端口

// 允许所有CORS请求
app.use(cors());
app.use(express.json());

// DeepSeek R1 API 配置
const DEEPSEEK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DEEPSEEK_API_KEY = '89f04210-338c-4f8d-8e0a-9d05098173f4'; // 请替换为你的实际API Key

// API 路由
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const response = await axios.post(DEEPSEEK_API_URL, {
            model: "deepseek-r1-250120",
            messages: [
                {"role": "system", "content": "你是一个AI教练，通过和用户的对话，给用户提供建议，帮助用户成长。"},
                {"role": "user", "content": userMessage}
            ],
            stream: true, // 开启流式输出
            temperature: 0.6 // 温度设置为0.6
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            timeout: 60000, // 请求超时设置为60秒 (60000毫秒)
            responseType: 'stream' // 接收流式响应
        });

        // 设置响应头，允许跨域和流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源，解决CORS

        // 将DeepSeek API的流式响应直接转发给前端
        response.data.on('data', (chunk) => {
            // DeepSeek API的流式响应通常是SSE格式，需要解析
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataString = line.substring(6);
                    if (dataString === '[DONE]') {
                        // DeepSeek API 流结束标记，跳过解析
                        continue;
                    }
                    const data = JSON.parse(dataString);
                    if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                        // 提取AI的回复内容并发送给前端
                        res.write(`data: ${JSON.stringify({ reply: data.choices[0].delta.content })}\n\n`);
                    }
                }
            }
        });

        response.data.on('end', () => {
            res.end();
        });

        response.data.on('error', (error) => {
            console.error('DeepSeek API Stream Error:', error);
            res.status(500).write(`data: ${JSON.stringify({ error: 'DeepSeek API Stream Error' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Error calling DeepSeek API:', error.message);
        if (error.response) {
            // DeepSeek API返回的错误信息
            console.error('DeepSeek API Response Data:', error.response.data);
            console.error('DeepSeek API Response Status:', error.response.status);
            res.status(error.response.status).json({ error: error.message, details: error.response.data });
        } else if (error.request) {
            // 请求已发出但没有收到响应
            res.status(500).json({ error: 'No response received from DeepSeek API', details: error.message });
        } else {
            // 其他错误
            res.status(500).json({ error: 'Error setting up request', details: error.message });
        }
    }
});

// 提供静态文件服务 (可选，如果前端和后端在同一个服务器)
app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Frontend accessible at http://localhost:${port}/index.html`);
});