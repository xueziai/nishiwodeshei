// script.js

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // 函数：添加消息到聊天框
    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        // 滚动到底部
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 函数：发送消息到后端
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = ''; // 清空输入框

        try {
            // 向后端服务器发送请求
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let aiMessage = '';

            // 循环读取流数据
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                // 解码并处理每一块数据
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.reply) {
                                aiMessage += data.reply;
                                // 更新或添加AI消息
                                if (chatBox.lastChild && chatBox.lastChild.classList.contains('ai')) {
                                    chatBox.lastChild.textContent = aiMessage;
                                } else {
                                    addMessage('ai', aiMessage);
                                }
                                chatBox.scrollTop = chatBox.scrollHeight; // 滚动到底部
                            }
                        } catch (e) {
                            console.error('Error parsing JSON from stream:', e);
                        }
                    }
                }
            }

            // 确保最后一条消息是完整的
            if (aiMessage === '') {
                addMessage('ai', '抱歉，AI教练没有返回任何内容。');
            }

        } catch (error) {
            console.error('发送消息失败:', error);
            addMessage('ai', '抱歉，AI教练暂时无法回应。请稍后再试。');
        }
    }

    // 绑定发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);

    // 绑定回车键发送事件
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // 初始欢迎消息
    addMessage('ai', '你好！我是你的AI教练，有什么可以帮助你的吗？');
});