-- 创建 API 配置表
-- 用于存储用户的 API 配置信息（API 地址、密钥、模型名称）

CREATE TABLE IF NOT EXISTS api_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_api_config_created_at ON api_config(created_at DESC);

-- 添加注释
COMMENT ON TABLE api_config IS '存储用户的 API 配置信息';
COMMENT ON COLUMN api_config.api_url IS 'API 接口地址';
COMMENT ON COLUMN api_config.api_key IS 'API 密钥';
COMMENT ON COLUMN api_config.model_name IS '模型名称';
COMMENT ON COLUMN api_config.created_at IS '创建时间';
COMMENT ON COLUMN api_config.updated_at IS '更新时间';

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，自动更新 updated_at 字段
CREATE TRIGGER update_api_config_updated_at
    BEFORE UPDATE ON api_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (RLS)
ALTER TABLE api_config ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取和写入（根据实际需求可以调整）
-- 注意：在生产环境中，应该根据实际需求设置更严格的策略
CREATE POLICY "允许所有用户访问 api_config"
    ON api_config
    FOR ALL
    USING (true)
    WITH CHECK (true);

