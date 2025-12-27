// 全局变量
let supabaseClient = null;
let apiConfig = null;
let chatHistory = [];

// DOM 元素
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loading = document.getElementById('loading');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await initSupabase();
    await loadConfig();
    setupEventListeners();
});

// 初始化 Supabase（用户会自己配置 publishable key 和 project url）
async function initSupabase() {
    // 从 localStorage 获取 Supabase 配置
    const supabaseUrl = localStorage.getItem('supabaseUrl');
    const supabaseKey = localStorage.getItem('supabaseKey');
    
    if (supabaseUrl && supabaseKey) {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    }
}

// 设置事件监听器
function setupEventListeners() {
    settingsBtn.addEventListener('click', () => {
        showSettingsPanel();
    });
    
    cancelBtn.addEventListener('click', () => {
        hideSettingsPanel();
    });
    
    saveBtn.addEventListener('click', async () => {
        await saveConfig();
    });
    
    sendBtn.addEventListener('click', async () => {
        await sendMessage();
    });
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 点击设置面板外部关闭
    settingsPanel.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
            hideSettingsPanel();
        }
    });
}

// 显示设置面板
function showSettingsPanel() {
    // 如果还没有配置 API，显示所有输入框
    if (!apiConfig) {
        document.getElementById('apiUrl').value = '';
        document.getElementById('apiKey').value = '';
        document.getElementById('modelName').value = '';
    } else {
        // 如果已配置，隐藏 API 配置输入框
        const apiConfigFields = document.querySelectorAll('#apiUrl, #apiKey, #modelName');
        const apiConfigLabels = document.querySelectorAll('.form-group label[for="apiUrl"], .form-group label[for="apiKey"], .form-group label[for="modelName"]');
        
        apiConfigFields.forEach(field => {
            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.style.display = 'none';
            }
        });
    }
    
    // 填充 Supabase 配置
    const supabaseUrl = localStorage.getItem('supabaseUrl') || '';
    const supabaseKey = localStorage.getItem('supabaseKey') || '';
    
    document.getElementById('supabaseUrl').value = supabaseUrl;
    document.getElementById('supabaseKey').value = supabaseKey;
    
    settingsPanel.classList.add('active');
}

// 隐藏设置面板
function hideSettingsPanel() {
    settingsPanel.classList.remove('active');
    
    // 恢复所有表单字段的显示
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach(group => {
        group.style.display = 'block';
    });
}

// 加载配置
async function loadConfig() {
    if (!supabaseClient) {
        // 如果没有 Supabase 配置，显示设置面板
        showSettingsPanel();
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('api_config')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
            console.error('加载配置错误:', error);
            showSettingsPanel();
            return;
        }
        
        if (data) {
            apiConfig = {
                apiUrl: data.api_url,
                apiKey: data.api_key,
                modelName: data.model_name
            };
            // 配置已存在，不显示设置面板
            hideSettingsPanel();
        } else {
            // 没有配置，显示设置面板
            showSettingsPanel();
        }
    } catch (error) {
        console.error('加载配置异常:', error);
        showSettingsPanel();
    }
}

// 保存配置
async function saveConfig() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const modelName = document.getElementById('modelName').value.trim();
    const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
    const supabaseKey = document.getElementById('supabaseKey').value.trim();
    
    // 如果还没有配置 API，验证必填字段
    if (!apiConfig && (!apiUrl || !apiKey || !modelName)) {
        alert('请填写完整的 API 配置信息！');
        return;
    }
    
    // 保存 Supabase 配置到 localStorage
    if (supabaseUrl && supabaseKey) {
        localStorage.setItem('supabaseUrl', supabaseUrl);
        localStorage.setItem('supabaseKey', supabaseKey);
        
        // 重新初始化 Supabase
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    }
    
    if (!supabaseClient) {
        alert('请先配置 Supabase 信息！');
        return;
    }
    
    showLoading();
    
    try {
        // 如果还没有配置 API，保存 API 配置
        if (!apiConfig && apiUrl && apiKey && modelName) {
            // 检查是否已有配置
            const { data: existingConfig } = await supabaseClient
                .from('api_config')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            let result;
            if (existingConfig) {
                // 更新现有配置
                result = await supabaseClient
                    .from('api_config')
                    .update({
                        api_url: apiUrl,
                        api_key: apiKey,
                        model_name: modelName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingConfig.id);
            } else {
                // 插入新配置
                result = await supabaseClient
                    .from('api_config')
                    .insert({
                        api_url: apiUrl,
                        api_key: apiKey,
                        model_name: modelName
                    });
            }
            
            if (result.error) {
                throw result.error;
            }
            
            // 保存到本地变量
            apiConfig = {
                apiUrl,
                apiKey,
                modelName
            };
        }
        
        hideSettingsPanel();
        alert('配置保存成功！🎄');
        
    } catch (error) {
        console.error('保存配置错误:', error);
        alert('保存配置失败: ' + (error.message || '未知错误'));
    } finally {
        hideLoading();
    }
}

// 发送消息
async function sendMessage() {
    if (!apiConfig) {
        alert('请先配置 API 信息！');
        showSettingsPanel();
        return;
    }
    
    const message = messageInput.value.trim();
    if (!message) {
        return;
    }
    
    // 添加用户消息到界面
    addMessage('user', message);
    
    // 清空输入框
    messageInput.value = '';
    
    // 添加到历史记录
    chatHistory.push({ role: 'user', content: message });
    
    // 显示加载动画
    showLoading();
    sendBtn.disabled = true;
    
    try {
        // 调用 API
        const response = await fetch(apiConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.modelName,
                messages: chatHistory,
                stream: false
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || '抱歉，没有收到回复。';
        
        // 添加助手消息到界面
        addMessage('assistant', assistantMessage);
        
        // 添加到历史记录
        chatHistory.push({ role: 'assistant', content: assistantMessage });
        
    } catch (error) {
        console.error('发送消息错误:', error);
        addMessage('assistant', '❌ 错误: ' + error.message);
    } finally {
        hideLoading();
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// 添加消息到界面
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    // 移除欢迎消息
    const welcomeMsg = chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 显示加载动画
function showLoading() {
    loading.classList.add('active');
}

// 隐藏加载动画
function hideLoading() {
    loading.classList.remove('active');
}

