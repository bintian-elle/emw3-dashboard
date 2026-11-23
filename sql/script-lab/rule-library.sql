\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS script_lab.rule_dimensions (
  code text PRIMARY KEY,
  layer text NOT NULL CHECK (layer IN ('strategy','creative','execution','constraints','single-variable','multilingual'))
);
CREATE TABLE IF NOT EXISTS script_lab.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug text NOT NULL REFERENCES script_lab.projects(slug),
  dimension text NOT NULL REFERENCES script_lab.rule_dimensions(code),
  code text NOT NULL CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{0,31}$'),
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 160),
  label_en text NOT NULL DEFAULT '' CHECK (length(label_en) <= 160),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 1200),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1000,
  revision integer NOT NULL DEFAULT 1,
  UNIQUE (project_slug, dimension, code)
);
CREATE TABLE IF NOT EXISTS script_lab.rule_imports (
  version text PRIMARY KEY
);

INSERT INTO script_lab.rule_dimensions (code, layer) VALUES
  ('MKT', 'strategy'),
  ('FUN', 'strategy'),
  ('AUD', 'strategy'),
  ('PAIN', 'strategy'),
  ('BEN', 'strategy'),
  ('HK', 'creative'),
  ('SCN', 'creative'),
  ('NAR', 'creative'),
  ('CAST', 'execution'),
  ('STY', 'execution'),
  ('LEN', 'execution'),
  ('PLT', 'execution'),
  ('CTA', 'execution'),
  ('LANG', 'multilingual'),
  ('DIR', 'creative'),
  ('AGE', 'execution'),
  ('EVD', 'creative'),
  ('MOOD', 'execution'),
  ('MATCH', 'constraints'),
  ('ROUND', 'single-variable'),
  ('WAVE', 'multilingual')
ON CONFLICT (code) DO NOTHING;

WITH import AS (
  INSERT INTO script_lab.rule_imports (version)
  VALUES ('biceek-variable-pool-v1') ON CONFLICT DO NOTHING RETURNING version
)
INSERT INTO script_lab.rules (project_slug, dimension, code, label, enabled, sort_order)
SELECT 'biceek', seed.dimension, seed.code, seed.label, seed.enabled, seed.sort_order
FROM import CROSS JOIN (VALUES
  ('MKT', 'DE', '德国', true, 1),
  ('MKT', 'CH', '瑞士', true, 2),
  ('MKT', 'NL', '荷兰', true, 3),
  ('MKT', 'ES', '西班牙', true, 4),
  ('MKT', 'FR', '法国', true, 5),
  ('MKT', 'IT', '意大利', true, 6),
  ('MKT', 'EN', '英语母版', true, 7),
  ('FUN', 'AW', '认知', true, 1),
  ('FUN', 'CON', '考虑', true, 2),
  ('FUN', 'CV', '转化', true, 3),
  ('AUD', 'COMM', '日常通勤者', true, 1),
  ('AUD', 'ROAD', '公路车骑行者', true, 2),
  ('AUD', 'EBIKE', '电助力车用户', true, 3),
  ('AUD', 'URBAN', '城市年轻上班族', false, 4),
  ('AUD', 'NEW', '骑行新手', true, 5),
  ('AUD', 'TECH', '自行车店技师', false, 6),
  ('AUD', 'GIFT', '伴侣/送礼者', true, 7),
  ('AUD', 'TRIP', '旅行骑行者', true, 8),
  ('AUD', 'REVIEW', '科技产品测评者', false, 9),
  ('PAIN', 'VIS', '外挂容易被发现', true, 1),
  ('PAIN', 'LOST', '停车后难找车辆', true, 2),
  ('PAIN', 'SUB', '不想持续支付订阅费', true, 3),
  ('PAIN', 'INSTX', '担心安装麻烦', true, 4),
  ('PAIN', 'ANDR', '安卓用户难以使用 Find My', true, 5),
  ('PAIN', 'GIFTM', '想送实用骑行礼物', true, 6),
  ('BEN', 'HIDE', '隐蔽安装', true, 1),
  ('BEN', 'INST', '安装简单', true, 2),
  ('BEN', 'LOC', '定位查看简单', true, 3),
  ('BEN', 'DUAL', '双系统兼容', true, 4),
  ('BEN', 'NOSUB', '无订阅费', true, 5),
  ('BEN', 'DESIGN', 'Simplicity by Design', false, 6),
  ('BEN', 'MOVE', 'MOVE FREE', false, 7),
  ('BEN', 'FIT', '广泛适配', false, 8),
  ('HK', 'H01', '倒数', true, 1),
  ('HK', 'H02', '反转', true, 2),
  ('HK', 'H03', '开箱', true, 3),
  ('HK', 'H04', '问题-解决', true, 4),
  ('HK', 'H05', '隐藏发现', true, 5),
  ('HK', 'H06', '清单', true, 6),
  ('HK', 'H07', '专家背书', true, 7),
  ('HK', 'H08', '互动提问', true, 8),
  ('SCN', 'AM', '早晨出门前', true, 1),
  ('SCN', 'RIDE', '城市通勤途中', true, 2),
  ('SCN', 'CAFE', '咖啡店短暂停车', true, 3),
  ('SCN', 'OFF', '办公室楼下停车', true, 4),
  ('SCN', 'NIGHT', '夜间街边停车', true, 5),
  ('SCN', 'STORE', '自行车店安装', true, 6),
  ('SCN', 'WEEK', '周末长途骑行', true, 7),
  ('SCN', 'TRAIN', '火车/旅行携车', true, 8),
  ('SCN', 'HOME', '家中首次安装', true, 9),
  ('SCN', 'GIFT', '送给骑行者', true, 10),
  ('SCN', 'POST', '骑行后查看位置', true, 11),
  ('SCN', 'CITY', '陌生城市临时停车', true, 12),
  ('NAR', 'DEMO', '产品演示', true, 1),
  ('NAR', 'PS', '问题-解决', true, 2),
  ('NAR', 'LIST', '清单', true, 3),
  ('NAR', 'LIFE', '生活植入', true, 4),
  ('NAR', 'TEST', '专业测评', true, 5),
  ('CAST', 'USER', '用户本色', true, 1),
  ('CAST', 'TECH', '技师', true, 2),
  ('CAST', 'REV', '测评者', true, 3),
  ('CAST', 'VO', '只出手部/画外音', true, 4),
  ('STY', 'UGC', '真实记录', true, 1),
  ('STY', 'POV', '第一人称', true, 2),
  ('STY', 'MINI', '极简产品广告', true, 3),
  ('STY', 'REVIEW', '专业测评', true, 4),
  ('STY', 'VLOG', '生活方式', true, 5),
  ('STY', 'CINE', '电影感', true, 6),
  ('LEN', 'L15', '10-15秒', true, 1),
  ('LEN', 'L30', '20-30秒', true, 2),
  ('LEN', 'L45', '35-45秒', true, 3),
  ('LEN', 'L60', '45-60秒', true, 4),
  ('PLT', 'TT', 'TikTok', true, 1),
  ('PLT', 'IG', 'Instagram Reels', true, 2),
  ('PLT', 'META', 'Meta Paid', true, 3),
  ('CTA', 'LM', 'Learn more', true, 1),
  ('CTA', 'SHW', 'See how it works', true, 2),
  ('CTA', 'CHK', 'Check compatibility', true, 3),
  ('CTA', 'FIND', 'Comment ‘FIND’ for details', true, 4),
  ('LANG', 'DE', 'German', true, 1),
  ('LANG', 'NL', 'Dutch', true, 2),
  ('LANG', 'ES', 'Spanish', true, 3),
  ('LANG', 'FR', 'French', true, 4),
  ('LANG', 'IT', 'Italian', true, 5),
  ('LANG', 'EN', 'English', true, 6),
  ('DIR', 'PROB', 'Fear / Problem（问题切入）', true, 1),
  ('DIR', 'CUR', 'Curiosity / Mystery（好奇悬念）', true, 2),
  ('DIR', 'DEMO', 'Product Demonstration（产品演示）', true, 3),
  ('DIR', 'REL', 'Relatable / Entertainment（共鸣娱乐）', true, 4),
  ('DIR', 'LIST', 'Proof-backed Listicle（证据清单）', true, 5),
  ('DIR', 'EDU', 'Education / Explainer（知识解释）', true, 6),
  ('DIR', 'EMO', 'Emotional Endorsement（情绪推荐）', true, 7),
  ('DIR', 'INT', 'Interactive Participation（互动参与）', true, 8),
  ('DIR', 'CARE', 'Kid Caring（亲子关心）', true, 9),
  ('AGE', 'A18', '18–24', true, 1),
  ('AGE', 'A25', '25–34', true, 2),
  ('AGE', 'A35', '35–44', true, 3),
  ('AGE', 'A45', '45–54', true, 4),
  ('AGE', 'A55', '55+', true, 5),
  ('AGE', 'ALL', '全年龄/不强调年龄', true, 6),
  ('EVD', 'INSTALL', '实际安装演示', true, 1),
  ('EVD', 'APP', 'App位置界面', true, 2),
  ('EVD', 'SIZE', '产品尺寸近景', true, 3),
  ('EVD', 'DUAL', '双系统兼容演示', true, 4),
  ('EVD', 'FEE', '无订阅费价格对比', true, 5),
  ('EVD', 'REVIEW', '用户体验/评论', true, 6),
  ('EVD', 'COMPARE', '前后对比或计时测试', true, 7),
  ('MOOD', 'CALM', '安心', true, 1),
  ('MOOD', 'FREE', '自由', true, 2),
  ('MOOD', 'SURPRISE', '惊喜', true, 3),
  ('MOOD', 'LIGHT', '轻松', true, 4),
  ('MOOD', 'URGENT', '紧迫但不恐吓', true, 5),
  ('MOOD', 'TRUST', '可信/理性', true, 6),
  ('MOOD', 'HUMOR', '幽默', true, 7)
) AS seed (dimension, code, label, enabled, sort_order)
ON CONFLICT (project_slug, dimension, code) DO NOTHING;

WITH import AS (
  INSERT INTO script_lab.rule_imports (version)
  VALUES ('biceek-workflow-rules-v1') ON CONFLICT DO NOTHING RETURNING version
)
INSERT INTO script_lab.rules (project_slug, dimension, code, label, label_en, notes, sort_order)
SELECT 'biceek', seed.dimension, seed.code, seed.label, seed.label_en, seed.notes, seed.sort_order
FROM import CROSS JOIN (VALUES
  ('MATCH', 'VIS', '外挂容易被发现', '', '唯一主卖点 HIDE｜隐蔽安装
合法证据 产品尺寸近景；实际安装演示
允许 Hook H05；H02
默认 Hook H05｜隐藏发现
表内默认场景 HOME｜家中安装
合规要求 必须展示隐藏安装的可见证明；不使用犯罪或威胁表达', 1),
  ('MATCH', 'LOST', '停车后难找车辆', '', '唯一主卖点 LOC｜定位查看简单
合法证据 App 位置界面
允许 Hook H04；H01
默认 Hook H04｜问题-解决
表内默认场景 CAFE｜咖啡店短暂停车
合规要求 只表达查看和查找车辆位置；不承诺最终找回，不写 GPS', 2),
  ('MATCH', 'SUB', '不想持续支付订阅费', '', '唯一主卖点 NOSUB｜无订阅费
合法证据 自身价格与长期价值说明
允许 Hook H06
默认 Hook H06｜清单
表内默认场景 RIDE｜城市通勤途中
合规要求 只讲自身价值，不攻击或虚构竞品价格', 3),
  ('MATCH', 'INSTX', '担心安装麻烦', '', '唯一主卖点 INST｜安装简单
合法证据 实际安装演示；前后对比或计时
允许 Hook H03；H04
默认 Hook H03｜开箱
表内默认场景 HOME｜家中安装
合规要求 安装步骤必须真实清楚，不宣称适配所有车型', 4),
  ('MATCH', 'ANDR', '安卓用户难以使用 Find My', '', '唯一主卖点 DUAL｜双系统兼容
合法证据 Apple / Google 真实系统界面
允许 Hook H07；H06
默认 Hook H06｜清单
表内默认场景 STORE｜自行车店安装
合规要求 只说支持两种系统选择，不说独有；明确实际兼容范围', 5),
  ('MATCH', 'GIFTM', '想送实用骑行礼物', '', '唯一主卖点 HIDE｜隐蔽安装
合法证据 产品尺寸近景；实际安装演示
允许 Hook H03；H08
默认 Hook H08｜互动提问
表内默认场景 HOME｜家中安装
合规要求 不把送礼诉求写成恐吓；只证明产品实际用途', 6),
  ('ROUND', 'R1', '第一轮：人群 × 痛点', '', '市场和漏斗先锁定；建议 6-10 条，每次只换人群或痛点中的一个。', 1),
  ('ROUND', 'R2', '第二轮：只换 Hook', '', '基于胜出脚本测试 4-6 个合法 Hook，其余字段不动。', 2),
  ('ROUND', 'R3', '第三轮：场景或执行层', '', '只测试场景、风格或出镜中的一个维度。', 3),
  ('ROUND', 'R4', '第四轮：市场语言', '', '输出德语、荷兰语、西班牙语、法语、意大利语版本；瑞士按区域选择语言。', 4),
  ('WAVE', 'W1', '第一轮放大', '', 'DE、NL、FR、EN。', 1),
  ('WAVE', 'W2', '第二轮放大', '', '在第一轮范围内增加 ES、IT 和 CH；瑞士按区域选择语言。', 2)
) AS seed (dimension, code, label, label_en, notes, sort_order)
ON CONFLICT (project_slug, dimension, code) DO NOTHING;

CREATE TABLE IF NOT EXISTS script_lab.rule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug text NOT NULL REFERENCES script_lab.projects(slug),
  rule_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  actor_scope text NOT NULL CHECK (actor_scope IN ('internal', 'customer')),
  actor_email text NOT NULL,
  before_rule jsonb,
  after_rule jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rule_history_project_time ON script_lab.rule_history (project_slug, changed_at DESC);
CREATE INDEX IF NOT EXISTS rule_history_actor_time ON script_lab.rule_history (project_slug, actor_scope, actor_email, changed_at DESC);

REVOKE INSERT, UPDATE, DELETE ON script_lab.rule_history FROM ubuntu;
GRANT SELECT ON script_lab.rule_history TO ubuntu;
GRANT SELECT ON script_lab.rule_dimensions TO ubuntu;
REVOKE INSERT, UPDATE, DELETE ON script_lab.rules FROM ubuntu;
GRANT SELECT ON script_lab.rules TO ubuntu;
COMMIT;
