\set ON_ERROR_STOP on
BEGIN;
-- Source: the published Findhoo 200 workbench variable-library JSON export.
ALTER TABLE script_lab.rules DROP CONSTRAINT IF EXISTS rules_code_check;
ALTER TABLE script_lab.rules ADD CONSTRAINT rules_code_check CHECK (length(btrim(code)) BETWEEN 1 AND 80 AND code !~ '[[:cntrl:]]');
ALTER TABLE script_lab.rules ADD COLUMN IF NOT EXISTS status text;
UPDATE script_lab.rules SET status = CASE WHEN enabled THEN 'enabled' ELSE 'disabled' END WHERE status IS NULL;
ALTER TABLE script_lab.rules ALTER COLUMN status SET DEFAULT 'enabled', ALTER COLUMN status SET NOT NULL;
ALTER TABLE script_lab.rules DROP CONSTRAINT IF EXISTS rules_status_check;
ALTER TABLE script_lab.rules ADD CONSTRAINT rules_status_check CHECK (status IN ('enabled','caution','phase-two','disabled','unverified'));
ALTER TABLE script_lab.rules ADD COLUMN IF NOT EXISTS default_selected boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS fields jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

INSERT INTO script_lab.rule_dimensions (code, layer) VALUES
  ('MKT', 'strategy'),
  ('FUN', 'strategy'),
  ('AUD', 'strategy'),
  ('PAIN', 'strategy'),
  ('BEN', 'strategy'),
  ('HK', 'creative'),
  ('SCN', 'creative'),
  ('NAR', 'creative'),
  ('EVD', 'creative'),
  ('DIR', 'creative'),
  ('CAST', 'execution'),
  ('STY', 'execution'),
  ('LEN', 'execution'),
  ('PLT', 'execution'),
  ('CTA', 'execution'),
  ('TONE', 'execution'),
  ('MOOD', 'execution'),
  ('AGE', 'execution'),
  ('BAN', 'constraints'),
  ('RULE', 'constraints'),
  ('BEV', 'constraints'),
  ('FORBID', 'constraints'),
  ('ROUND', 'single-variable'),
  ('BASE', 'single-variable'),
  ('VARY', 'single-variable'),
  ('LANG', 'multilingual'),
  ('WAVE', 'multilingual')
ON CONFLICT (code) DO UPDATE SET layer = excluded.layer;

CREATE TEMP TABLE grok_rule_seed (dimension text, code text, label text, status text, notes text, default_selected boolean, fields jsonb, sort_order integer) ON COMMIT DROP;
INSERT INTO grok_rule_seed VALUES
  ('MKT', 'DE', '德国', 'enabled', '首轮优先市场，德语', true, '{}'::jsonb, 1),
  ('MKT', 'NL', '荷兰', 'enabled', '首轮优先市场，荷兰语', false, '{}'::jsonb, 2),
  ('MKT', 'FR', '法国', 'enabled', '首轮优先市场，法语', false, '{}'::jsonb, 3),
  ('MKT', 'EN', '英语测试', 'enabled', '创意母版与跨市场前期验证', false, '{}'::jsonb, 4),
  ('MKT', 'CH', '瑞士', 'phase-two', '次轮；按区域选德语、法语或意语', false, '{}'::jsonb, 5),
  ('MKT', 'ES', '西班牙', 'phase-two', '次轮再加，避免首轮摊薄', false, '{}'::jsonb, 6),
  ('MKT', 'IT', '意大利', 'phase-two', '次轮再加，避免首轮摊薄', false, '{}'::jsonb, 7),
  ('FUN', 'AW', '认知', 'enabled', '默认 L30，CTA Learn more', true, '{}'::jsonb, 8),
  ('FUN', 'CON', '考虑', 'enabled', '默认 L30，CTA See how it works', false, '{}'::jsonb, 9),
  ('FUN', 'CV', '转化', 'enabled', '默认 L30，CTA Check compatibility', false, '{}'::jsonb, 10),
  ('AUD', 'COMM', '通勤者', 'enabled', '含原城市年轻上班族', true, '{}'::jsonb, 11),
  ('AUD', 'ROAD', '公路车骑行者', 'enabled', '弯把兼容性待确认', true, '{}'::jsonb, 12),
  ('AUD', 'EBIKE', '电助力车用户', 'enabled', '内走线车把兼容性待确认', true, '{}'::jsonb, 13),
  ('AUD', 'TRIP', '旅行骑行者', 'enabled', '', true, '{}'::jsonb, 14),
  ('AUD', 'NEW', '骑行新手', 'enabled', '', true, '{}'::jsonb, 15),
  ('AUD', 'GIFT', '送礼者', 'enabled', '指买的人，不是出镜角色', true, '{}'::jsonb, 16),
  ('AUD', 'URBAN', '城市年轻上班族', 'disabled', '已并入 COMM', false, '{}'::jsonb, 17),
  ('AUD', 'TECHAUD', '自行车店技师（作人群）', 'disabled', '改入出镜 TECH', false, '{}'::jsonb, 18),
  ('AUD', 'REVAUD', '科技产品测评者（作人群）', 'disabled', '改入出镜 REV', false, '{}'::jsonb, 19),
  ('PAIN', 'VIS', '外挂容易被发现', 'enabled', '只配 HIDE', true, '{}'::jsonb, 20),
  ('PAIN', 'LOST', '停车后难找或担心丢车', 'enabled', '只讲可定位，不保证找回', true, '{}'::jsonb, 21),
  ('PAIN', 'SUB', '不想付订阅', 'enabled', '只配 NOSUB', true, '{}'::jsonb, 22),
  ('PAIN', 'INSTX', '怕安装麻烦', 'enabled', '只配 INST', true, '{}'::jsonb, 23),
  ('PAIN', 'ANDR', '安卓用户用不了 Find My', 'enabled', '只配 DUAL，不说独有', true, '{}'::jsonb, 24),
  ('PAIN', 'GIFTM', '想送实用礼物', 'enabled', '可配 HIDE 或 NOSUB', true, '{}'::jsonb, 25),
  ('BEN', 'HIDE', '隐蔽安装', 'enabled', '必须露出隐藏位置', false, '{}'::jsonb, 26),
  ('BEN', 'INST', '安装简单', 'enabled', '必须拍到安装步骤', false, '{}'::jsonb, 27),
  ('BEN', 'LOC', '定位查看简单', 'enabled', '不说 GPS，不保证找回', false, '{}'::jsonb, 28),
  ('BEN', 'DUAL', '双系统兼容', 'enabled', '不宣称独有，写清二选一', false, '{}'::jsonb, 29),
  ('BEN', 'NOSUB', '无订阅', 'enabled', '只讲自身价值，不比竞品', false, '{}'::jsonb, 30),
  ('BEN', 'DESIGN', 'Simplicity by Design 简洁设计', 'disabled', '并入 INST，不再作主锚点', false, '{}'::jsonb, 31),
  ('BEN', 'MOVE', 'MOVE FREE 更自由地骑行', 'disabled', '改作品牌语气', false, '{}'::jsonb, 32),
  ('BEN', 'BUNDLE', 'Easy Bundle 隐藏+安装+定位', 'disabled', '拆回三个卖点，无法单变量测试', false, '{}'::jsonb, 33),
  ('BEN', 'FIT', '广泛适配', 'disabled', '易夸大，兼容范围尚未全部核实', false, '{}'::jsonb, 34),
  ('HK', 'H01', '倒数', 'enabled', '', false, '{}'::jsonb, 35),
  ('HK', 'H02', '反转', 'enabled', '', false, '{}'::jsonb, 36),
  ('HK', 'H03', '开箱', 'enabled', '', false, '{}'::jsonb, 37),
  ('HK', 'H04', '问题-解决', 'enabled', '', false, '{}'::jsonb, 38),
  ('HK', 'H05', '隐藏发现', 'enabled', '', false, '{}'::jsonb, 39),
  ('HK', 'H06', '清单', 'enabled', '', false, '{}'::jsonb, 40),
  ('HK', 'H07', '专家背书', 'enabled', '须由技师 TECH 出镜，不具名、不说推荐', false, '{}'::jsonb, 41),
  ('HK', 'H08', '互动提问', 'enabled', '不承诺奖品', false, '{}'::jsonb, 42),
  ('HK', 'FOMO', 'Run Don''t Walk / FOMO', 'disabled', '催促式话术，不符合合规底线', false, '{}'::jsonb, 43),
  ('SCN', 'AM', '早晨出门前', 'enabled', '', false, '{}'::jsonb, 44),
  ('SCN', 'RIDE', '城市通勤途中', 'enabled', '', false, '{}'::jsonb, 45),
  ('SCN', 'CAFE', '咖啡店短暂停车', 'enabled', '', false, '{}'::jsonb, 46),
  ('SCN', 'OFF', '办公室楼下停车', 'enabled', '', false, '{}'::jsonb, 47),
  ('SCN', 'NIGHT', '夜间街边停车', 'enabled', '画面保持平静，不制造恐惧', false, '{}'::jsonb, 48),
  ('SCN', 'CITY', '陌生城市临时停车', 'enabled', '', false, '{}'::jsonb, 49),
  ('SCN', 'TRAIN', '火车或旅行携车', 'enabled', '', false, '{}'::jsonb, 50),
  ('SCN', 'WEEK', '周末长途骑行', 'enabled', '', false, '{}'::jsonb, 51),
  ('SCN', 'HOME', '家中首次安装', 'enabled', '仅当卖点为 HIDE 或 INST 时使用', false, '{}'::jsonb, 52),
  ('SCN', 'STORE', '自行车店安装', 'enabled', '仅当卖点为 HIDE 或 INST 时使用', false, '{}'::jsonb, 53),
  ('SCN', 'GIFTSCN', '送给骑行者', 'disabled', '并入痛点 GIFTM，不是场景', false, '{}'::jsonb, 54),
  ('SCN', 'POST', '骑行后查看位置', 'disabled', '并入证据 APP，不是场景', false, '{}'::jsonb, 55),
  ('NAR', 'DEMO', '产品演示', 'enabled', '', false, '{}'::jsonb, 56),
  ('NAR', 'PS', '问题-解决', 'enabled', '首轮默认配 H04', false, '{}'::jsonb, 57),
  ('NAR', 'LIST', '清单', 'enabled', '首轮默认配 H06', false, '{}'::jsonb, 58),
  ('NAR', 'LIFE', '生活植入', 'enabled', '', false, '{}'::jsonb, 59),
  ('NAR', 'TEST', '专业测评', 'enabled', '首轮默认配 H07', false, '{}'::jsonb, 60),
  ('EVD', 'SIZE', '产品尺寸近景', 'enabled', 'HIDE 推荐', false, '{}'::jsonb, 61),
  ('EVD', 'INSTD', '实际安装演示', 'enabled', 'HIDE 或 INST 推荐', false, '{}'::jsonb, 62),
  ('EVD', 'APP', 'App 定位界面', 'enabled', 'LOC 必须；须用真实录屏', false, '{}'::jsonb, 63),
  ('EVD', 'DUALD', '双系统兼容演示', 'enabled', 'DUAL 必须；须用真实录屏', false, '{}'::jsonb, 64),
  ('EVD', 'VAL', '自身价值说明', 'enabled', 'NOSUB 推荐，不写价格', false, '{}'::jsonb, 65),
  ('EVD', 'COMPARE', '前后对比', 'enabled', 'INST 可用，不虚构耗时', false, '{}'::jsonb, 66),
  ('EVD', 'FEE', '无订阅费价格对比', 'caution', '须经合规确认，禁止未核实竞品比价', false, '{}'::jsonb, 67),
  ('EVD', 'REVU', '用户体验或评论', 'unverified', '核实前不得进广告', false, '{}'::jsonb, 68),
  ('DIR', 'PROB', 'Fear / Problem 问题切入', 'disabled', '整列取消，并入痛点或 Hook', false, '{}'::jsonb, 69),
  ('DIR', 'CUR', 'Curiosity 好奇悬念', 'disabled', '并入 Hook', false, '{}'::jsonb, 70),
  ('DIR', 'DEMO2', 'Product Demonstration 产品演示', 'disabled', '与叙事 DEMO 重复', false, '{}'::jsonb, 71),
  ('DIR', 'REL', 'Relatable 共鸣娱乐', 'disabled', '并入风格', false, '{}'::jsonb, 72),
  ('DIR', 'LISTDIR', 'Proof-backed Listicle 证据清单', 'disabled', '与 H06 重复', false, '{}'::jsonb, 73),
  ('DIR', 'EDU', 'Education 知识解释', 'disabled', '并入 Hook', false, '{}'::jsonb, 74),
  ('DIR', 'EMO', 'Emotional Endorsement 情绪推荐', 'disabled', '与 Hook 重复', false, '{}'::jsonb, 75),
  ('DIR', 'INT', 'Interactive 互动参与', 'disabled', '并入 H08', false, '{}'::jsonb, 76),
  ('DIR', 'CARE', 'Kid Caring 亲子关心', 'disabled', '首轮不用，禁止与恐吓搭配', false, '{}'::jsonb, 77),
  ('CAST', 'USER', '用户本色', 'enabled', '', false, '{}'::jsonb, 78),
  ('CAST', 'TECH', '技师', 'enabled', '不具名、不写头衔，H07 必须用此项', false, '{}'::jsonb, 79),
  ('CAST', 'REV', '测评者', 'enabled', '不具名，不引用评价', false, '{}'::jsonb, 80),
  ('CAST', 'VO', '只出手部或画外音', 'enabled', '', false, '{}'::jsonb, 81),
  ('STY', 'UGC', 'UGC 真实记录', 'enabled', '', false, '{}'::jsonb, 82),
  ('STY', 'POV', '第一人称', 'enabled', '', false, '{}'::jsonb, 83),
  ('STY', 'MINI', '极简产品广告', 'enabled', '', false, '{}'::jsonb, 84),
  ('STY', 'REVIEW', '专业测评', 'enabled', '', false, '{}'::jsonb, 85),
  ('STY', 'VLOG', '生活方式 Vlog', 'enabled', '', false, '{}'::jsonb, 86),
  ('STY', 'CINE', '电影感', 'enabled', '', false, '{}'::jsonb, 87),
  ('LEN', 'L15', '10–15 秒', 'enabled', '认知层可用', false, '{}'::jsonb, 88),
  ('LEN', 'L30', '20–30 秒', 'enabled', '默认', false, '{}'::jsonb, 89),
  ('LEN', 'L45', '35–45 秒', 'enabled', '仅用于转化阶段长讲解', false, '{}'::jsonb, 90),
  ('LEN', 'L60', '45–60 秒', 'enabled', '仅用于转化阶段长讲解', false, '{}'::jsonb, 91),
  ('PLT', 'TT', 'TikTok', 'enabled', '', false, '{}'::jsonb, 92),
  ('PLT', 'IG', 'IG Reels', 'enabled', '', false, '{}'::jsonb, 93),
  ('PLT', 'META', 'Meta', 'enabled', '', false, '{}'::jsonb, 94),
  ('CTA', 'LM', 'Learn more 了解更多', 'enabled', '认知层默认', false, '{}'::jsonb, 95),
  ('CTA', 'SHW', 'See how it works 看看怎么用', 'enabled', '考虑层默认', false, '{}'::jsonb, 96),
  ('CTA', 'CHK', 'Check compatibility 检查适配', 'enabled', '须有兼容说明页', false, '{}'::jsonb, 97),
  ('CTA', 'FIND', 'Comment FIND 评论关键词', 'enabled', '互动款，不承诺奖品', false, '{}'::jsonb, 98),
  ('CTA', 'MOVECTA', 'Move free with BICEEK', 'disabled', '口号不是 CTA', false, '{}'::jsonb, 99),
  ('TONE', 'MOVEFREE', 'MOVE FREE 更自由地骑行', 'enabled', '仅作品牌语气，不作主卖点', false, '{}'::jsonb, 100),
  ('MOOD', 'CALM', '安心', 'enabled', '', false, '{}'::jsonb, 101),
  ('MOOD', 'URGENT', '紧迫但不恐吓', 'caution', '易滑向 FOMO，首轮不用', false, '{}'::jsonb, 102),
  ('AGE', 'ALL', '全年龄或不强调', 'enabled', '仅用于选角和投放定向', false, '{}'::jsonb, 103),
  ('LANG', 'DE', '德语 German', 'enabled', '跟随市场 DE 或 CH', false, '{}'::jsonb, 104),
  ('LANG', 'NL', '荷兰语 Dutch', 'enabled', '跟随市场 NL', false, '{}'::jsonb, 105),
  ('LANG', 'FR', '法语 French', 'enabled', '跟随市场 FR 或 CH', false, '{}'::jsonb, 106),
  ('LANG', 'EN', '英语 English', 'enabled', '跟随市场 EN', false, '{}'::jsonb, 107),
  ('LANG', 'ES', '西语 Spanish', 'phase-two', '第二轮再加', false, '{}'::jsonb, 108),
  ('LANG', 'IT', '意语 Italian', 'phase-two', '第二轮再加', false, '{}'::jsonb, 109),
  ('WAVE', 'W1', '第一轮放大：DE、NL、FR、EN', 'enabled', '', true, '{}'::jsonb, 110),
  ('WAVE', 'W2', '第二轮放大：加 ES、IT 和 CH', 'enabled', '勾选后放行第二轮的市场和语言', false, '{}'::jsonb, 111),
  ('VARY', 'AUD', '允许替换：人群', 'enabled', '', false, '{}'::jsonb, 112),
  ('VARY', 'PAIN', '允许替换：痛点', 'enabled', '', false, '{}'::jsonb, 113),
  ('VARY', 'HK', '允许替换：Hook', 'enabled', '', false, '{}'::jsonb, 114),
  ('VARY', 'SCN', '允许替换：场景', 'enabled', '', false, '{}'::jsonb, 115),
  ('VARY', 'STY', '允许替换：风格', 'enabled', '', false, '{}'::jsonb, 116),
  ('VARY', 'CAST', '允许替换：出镜', 'enabled', '', false, '{}'::jsonb, 117),
  ('VARY', 'MKT', '允许替换：市场', 'enabled', '', false, '{}'::jsonb, 118),
  ('VARY', 'LANG', '允许替换：语言', 'enabled', '', false, '{}'::jsonb, 119),
  ('VARY', 'FUN', '允许替换：漏斗', 'enabled', '', false, '{}'::jsonb, 120),
  ('FORBID', 'F_STATUS', '禁用、未核实和慎用的变量不得进入组合', 'enabled', '', true, '{}'::jsonb, 121),
  ('FORBID', 'F_WAVE2', '第二轮市场和语言要先开启第二轮放大', 'enabled', '', true, '{}'::jsonb, 122),
  ('FORBID', 'F_H07', 'H07 专家背书必须由技师 TECH 出镜', 'enabled', '', true, '{}'::jsonb, 123),
  ('FORBID', 'F_CTA', 'CTA 与漏斗一致：AW 用 LM 或 FIND，CON 用 SHW 或 CHK，CV 用 CHK', 'enabled', '', true, '{}'::jsonb, 124),
  ('FORBID', 'F_LEN', '时长与漏斗一致：L15 只用于认知，L45 和 L60 只用于转化', 'enabled', '', true, '{}'::jsonb, 125),
  ('FORBID', 'F_HOME', '家中或车店场景只配 HIDE 或 INST', 'enabled', '', true, '{}'::jsonb, 126),
  ('FORBID', 'F_LANG', '语言跟随市场（CH 可用 DE、FR、IT）', 'enabled', '', true, '{}'::jsonb, 127),
  ('FORBID', 'F_FOMO', 'LOST 不得配 FOMO 或紧迫情绪', 'enabled', '', true, '{}'::jsonb, 128),
  ('FORBID', 'F_SINGLE', '单变量测试：每条只改一个维度，且只能改本轮允许的维度', 'enabled', '', true, '{}'::jsonb, 129),
  ('FORBID', 'F_SCRIPT', '证据镜头硬性要求：HIDE 露出隐藏位置，INST 至少 3 个安装步骤；缺模板需人工补写', 'enabled', '', true, '{}'::jsonb, 130),
  ('FORBID', 'F_BAN', '生成内容经合规词库扫描，命中即标红', 'enabled', '', true, '{}'::jsonb, 131),
  ('RULE', 'VIS', '外挂易被发现 → HIDE', 'enabled', '来自匹配规则 tab', true, '{"ben":"HIDE","ev":"SIZE,INSTD","hk":"H05,H02","scn":"CAFE,OFF,NIGHT,CITY,HOME,STORE"}'::jsonb, 132),
  ('RULE', 'LOST', '停车后难找 → LOC', 'enabled', '来自匹配规则 tab', true, '{"ben":"LOC","ev":"APP","hk":"H04,H01","scn":"AM,RIDE,CAFE,OFF,NIGHT,CITY,TRAIN,WEEK"}'::jsonb, 133),
  ('RULE', 'SUB', '不想付订阅 → NOSUB', 'enabled', '来自匹配规则 tab', true, '{"ben":"NOSUB","ev":"VAL","hk":"H06","scn":"AM,HOME,RIDE,CAFE"}'::jsonb, 134),
  ('RULE', 'INSTX', '怕安装麻烦 → INST', 'enabled', '来自匹配规则 tab', true, '{"ben":"INST","ev":"INSTD,COMPARE","hk":"H03,H04","scn":"HOME,STORE,CAFE"}'::jsonb, 135),
  ('RULE', 'ANDR', '安卓用户 → DUAL', 'enabled', '来自匹配规则 tab', true, '{"ben":"DUAL","ev":"DUALD","hk":"H07,H06","scn":"HOME,STORE,RIDE"}'::jsonb, 136),
  ('RULE', 'GIFTM', '想送实用礼物 → HIDE 或 NOSUB', 'enabled', '来自匹配规则 tab', true, '{"ben":"HIDE,NOSUB","ev":"SIZE,INSTD,VAL","hk":"H03,H08","scn":"HOME,CAFE,WEEK"}'::jsonb, 137),
  ('BEV', 'HIDE', '隐蔽安装的证据', 'enabled', '', true, '{"ev":"SIZE,INSTD"}'::jsonb, 138),
  ('BEV', 'INST', '安装简单的证据', 'enabled', '', true, '{"ev":"INSTD,COMPARE"}'::jsonb, 139),
  ('BEV', 'LOC', '定位查看的证据', 'enabled', '', true, '{"ev":"APP"}'::jsonb, 140),
  ('BEV', 'DUAL', '双系统的证据', 'enabled', '', true, '{"ev":"DUALD"}'::jsonb, 141),
  ('BEV', 'NOSUB', '无订阅的证据', 'enabled', '', true, '{"ev":"VAL,FEE"}'::jsonb, 142),
  ('BAN', 'GPS', 'GPS类', 'disabled', '', true, '{"exc":""}'::jsonb, 143),
  ('BAN', '全球定位', 'GPS类', 'disabled', '', true, '{"exc":""}'::jsonb, 144),
  ('BAN', 'GPS-Tracker', 'GPS类', 'disabled', '', true, '{"exc":""}'::jsonb, 145),
  ('BAN', 'traceur GPS', 'GPS类', 'disabled', '', true, '{"exc":""}'::jsonb, 146),
  ('BAN', '保证找回', '保证找回类', 'disabled', '', true, '{"exc":"不保证找回;不保证能找回"}'::jsonb, 147),
  ('BAN', '一定能找到', '保证找回类', 'disabled', '', true, '{"exc":""}'::jsonb, 148),
  ('BAN', '一定找回', '保证找回类', 'disabled', '', true, '{"exc":""}'::jsonb, 149),
  ('BAN', 'guaranteed to find', '保证找回类', 'disabled', '', true, '{"exc":"not guaranteed"}'::jsonb, 150),
  ('BAN', 'we will find', '保证找回类', 'disabled', '', true, '{"exc":"finding is not guaranteed"}'::jsonb, 151),
  ('BAN', 'Wiederfinden garantiert', '保证找回类', 'disabled', '', true, '{"exc":"Wiederfinden nicht garantiert;nicht garantiert"}'::jsonb, 152),
  ('BAN', 'garantiert finden', '保证找回类', 'disabled', '', true, '{"exc":"nicht garantiert"}'::jsonb, 153),
  ('BAN', 'terugvinden gegarandeerd', '保证找回类', 'disabled', '', true, '{"exc":"terugvinden niet gegarandeerd;niet gegarandeerd"}'::jsonb, 154),
  ('BAN', 'retrouver garanti', '保证找回类', 'disabled', '', true, '{"exc":"pas garanti"}'::jsonb, 155),
  ('BAN', '独有', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 156),
  ('BAN', '唯一', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 157),
  ('BAN', 'unique to us', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 158),
  ('BAN', 'einzig', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 159),
  ('BAN', 'exklusiv', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 160),
  ('BAN', 'enige', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 161),
  ('BAN', 'uniquement', '独有类', 'disabled', '', true, '{"exc":""}'::jsonb, 162),
  ('BAN', '用户评价', '评价类', 'unverified', '', true, '{"exc":""}'::jsonb, 163),
  ('BAN', '好评', '评价类', 'unverified', '', true, '{"exc":""}'::jsonb, 164),
  ('BAN', 'review', '评价类', 'unverified', '', true, '{"exc":""}'::jsonb, 165),
  ('BAN', 'Bewertung', '评价类', 'unverified', '', true, '{"exc":""}'::jsonb, 166),
  ('BAN', 'avis', '评价类', 'unverified', '', true, '{"exc":""}'::jsonb, 167),
  ('BAN', '小偷', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 168),
  ('BAN', '偷车', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 169),
  ('BAN', 'thief', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 170),
  ('BAN', 'steal', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 171),
  ('BAN', 'stolen', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 172),
  ('BAN', 'Dieb', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 173),
  ('BAN', 'gestohlen', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 174),
  ('BAN', 'dief', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 175),
  ('BAN', 'gestolen', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 176),
  ('BAN', 'voleur', '偷盗类', 'disabled', '', true, '{"exc":""}'::jsonb, 177),
  ('BAN', '马上买', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 178),
  ('BAN', '仅剩', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 179),
  ('BAN', '限时抢', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 180),
  ('BAN', 'limited time', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 181),
  ('BAN', 'last chance', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 182),
  ('BAN', 'nur noch', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 183),
  ('BAN', 'jetzt kaufen', 'FOMO类', 'caution', '', true, '{"exc":""}'::jsonb, 184),
  ('BAN', '€', '价格类', 'unverified', '', true, '{"exc":""}'::jsonb, 185),
  ('BAN', '折扣', '价格类', 'unverified', '', true, '{"exc":""}'::jsonb, 186),
  ('BAN', '划线价', '价格类', 'unverified', '', true, '{"exc":""}'::jsonb, 187),
  ('BAN', 'BLACK20', '价格类', 'unverified', '', true, '{"exc":""}'::jsonb, 188),
  ('BAN', 'AirTag', '竞品类', 'disabled', '', true, '{"exc":""}'::jsonb, 189),
  ('BAN', 'Pebblebee', '竞品类', 'disabled', '', true, '{"exc":""}'::jsonb, 190),
  ('BAN', 'LOC8', '竞品类', 'disabled', '', true, '{"exc":""}'::jsonb, 191),
  ('BAN', 'LÔC8', '竞品类', 'disabled', '', true, '{"exc":""}'::jsonb, 192),
  ('BAN', '几秒装好', '时长类', 'disabled', '', true, '{"exc":""}'::jsonb, 193),
  ('BAN', '几分钟装好', '时长类', 'disabled', '', true, '{"exc":""}'::jsonb, 194),
  ('BAN', '续航两年', '续航类', 'unverified', '', true, '{"exc":""}'::jsonb, 195),
  ('ROUND', 'R1', '第一轮：人群 × 痛点', 'enabled', '', true, '{"dims":"AUD,PAIN"}'::jsonb, 196),
  ('ROUND', 'R2', '第二轮：Hook', 'enabled', '', false, '{"dims":"HK"}'::jsonb, 197),
  ('ROUND', 'R3', '第三轮：场景、风格、出镜', 'enabled', '', false, '{"dims":"SCN,STY,CAST"}'::jsonb, 198),
  ('ROUND', 'R4', '第四轮：多语言版本', 'enabled', '', false, '{"dims":"MKT,LANG"}'::jsonb, 199),
  ('BASE', '#01', '通勤者 × 外挂容易被发现 · H05 隐藏发现（DE AW）', 'enabled', '来自首批 30 条剧本', true, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=VIS,BEN=HIDE,HK=H05,SCN=OFF,NAR=DEMO,EVD=SIZE,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 200),
  ('BASE', '#02', '公路车骑行者 × 外挂容易被发现 · H05 隐藏发现（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=ROAD,PAIN=VIS,BEN=HIDE,HK=H05,SCN=CAFE,NAR=DEMO,EVD=SIZE,CAST=USER,STY=POV,PLT=IG,CTA=LM,LEN=L30"}'::jsonb, 201),
  ('BASE', '#03', '电助力车用户 × 外挂容易被发现 · H05 隐藏发现（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=EBIKE,PAIN=VIS,BEN=HIDE,HK=H05,SCN=NIGHT,NAR=DEMO,EVD=SIZE,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 202),
  ('BASE', '#04', '通勤者 × 停车后难找或担心丢车 · H04 问题-解决（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=LOST,BEN=LOC,HK=H04,SCN=RIDE,NAR=PS,EVD=APP,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 203),
  ('BASE', '#05', '通勤者 × 不想付订阅 · H06 清单（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=SUB,BEN=NOSUB,HK=H06,SCN=AM,NAR=LIST,EVD=VAL,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 204),
  ('BASE', '#06', '通勤者 × 怕安装麻烦 · H03 开箱（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=INSTX,BEN=INST,HK=H03,SCN=HOME,NAR=DEMO,EVD=INSTD,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 205),
  ('BASE', '#07', '通勤者 × 安卓用户用不了 Find My · H07 专家背书（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=ANDR,BEN=DUAL,HK=H07,SCN=OFF,NAR=TEST,EVD=DUALD,CAST=TECH,STY=REVIEW,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 206),
  ('BASE', '#08', '通勤者 × 想送实用礼物 · H03 开箱（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=GIFTM,BEN=HIDE,HK=H03,SCN=HOME,NAR=DEMO,EVD=INSTD,CAST=USER,STY=VLOG,PLT=IG,CTA=LM,LEN=L30"}'::jsonb, 207),
  ('BASE', '#09', '通勤者 × 外挂容易被发现 · H02 反转（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=VIS,BEN=HIDE,HK=H02,SCN=OFF,NAR=LIFE,EVD=SIZE,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 208),
  ('BASE', '#10', '通勤者 × 停车后难找或担心丢车 · H01 倒数（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=LOST,BEN=LOC,HK=H01,SCN=RIDE,NAR=PS,EVD=APP,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 209),
  ('BASE', '#11', '通勤者 × 怕安装麻烦 · H04 问题-解决（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=INSTX,BEN=INST,HK=H04,SCN=HOME,NAR=PS,EVD=INSTD,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 210),
  ('BASE', '#12', '通勤者 × 安卓用户用不了 Find My · H06 清单（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=ANDR,BEN=DUAL,HK=H06,SCN=OFF,NAR=LIST,EVD=DUALD,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 211),
  ('BASE', '#13', '通勤者 × 想送实用礼物 · H08 互动提问（DE AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=AW,AUD=COMM,PAIN=GIFTM,BEN=HIDE,HK=H08,SCN=HOME,NAR=LIFE,EVD=INSTD,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 212),
  ('BASE', '#14', '通勤者 × 外挂容易被发现 · H05 隐藏发现（NL AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=NL,FUN=AW,AUD=COMM,PAIN=VIS,BEN=HIDE,HK=H05,SCN=OFF,NAR=DEMO,EVD=SIZE,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 213),
  ('BASE', '#15', '通勤者 × 停车后难找或担心丢车 · H04 问题-解决（NL AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=NL,FUN=AW,AUD=COMM,PAIN=LOST,BEN=LOC,HK=H04,SCN=RIDE,NAR=PS,EVD=APP,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 214),
  ('BASE', '#16', '通勤者 × 怕安装麻烦 · H03 开箱（NL AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=NL,FUN=AW,AUD=COMM,PAIN=INSTX,BEN=INST,HK=H03,SCN=HOME,NAR=DEMO,EVD=INSTD,CAST=USER,STY=UGC,PLT=TT,CTA=LM,LEN=L30"}'::jsonb, 215),
  ('BASE', '#17', '通勤者 × 安卓用户用不了 Find My · H07 专家背书（NL AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=NL,FUN=AW,AUD=COMM,PAIN=ANDR,BEN=DUAL,HK=H07,SCN=OFF,NAR=TEST,EVD=DUALD,CAST=TECH,STY=REVIEW,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 216),
  ('BASE', '#18', '通勤者 × 外挂容易被发现 · H05 隐藏发现（FR AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=FR,FUN=AW,AUD=COMM,PAIN=VIS,BEN=HIDE,HK=H05,SCN=OFF,NAR=DEMO,EVD=SIZE,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 217),
  ('BASE', '#19', '通勤者 × 不想付订阅 · H06 清单（FR AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=FR,FUN=AW,AUD=COMM,PAIN=SUB,BEN=NOSUB,HK=H06,SCN=AM,NAR=LIST,EVD=VAL,CAST=USER,STY=UGC,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 218),
  ('BASE', '#20', '通勤者 × 安卓用户用不了 Find My · H07 专家背书（FR AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=FR,FUN=AW,AUD=COMM,PAIN=ANDR,BEN=DUAL,HK=H07,SCN=OFF,NAR=TEST,EVD=DUALD,CAST=TECH,STY=REVIEW,PLT=META,CTA=LM,LEN=L30"}'::jsonb, 219),
  ('BASE', '#21', '通勤者 × 想送实用礼物 · H03 开箱（FR AW）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=FR,FUN=AW,AUD=COMM,PAIN=GIFTM,BEN=HIDE,HK=H03,SCN=HOME,NAR=DEMO,EVD=INSTD,CAST=USER,STY=VLOG,PLT=IG,CTA=LM,LEN=L30"}'::jsonb, 220),
  ('BASE', '#22', '骑行新手 × 怕安装麻烦 · H04 问题-解决（DE CON）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=CON,AUD=NEW,PAIN=INSTX,BEN=INST,HK=H04,SCN=HOME,NAR=PS,EVD=INSTD,CAST=USER,STY=UGC,PLT=META,CTA=CHK,LEN=L30"}'::jsonb, 221),
  ('BASE', '#23', '旅行骑行者 × 停车后难找或担心丢车 · H01 倒数（DE CON）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=CON,AUD=TRIP,PAIN=LOST,BEN=LOC,HK=H01,SCN=CITY,NAR=PS,EVD=APP,CAST=USER,STY=VLOG,PLT=IG,CTA=SHW,LEN=L30"}'::jsonb, 222),
  ('BASE', '#24', '电助力车用户 × 安卓用户用不了 Find My · H07 专家背书（DE CON）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=CON,AUD=EBIKE,PAIN=ANDR,BEN=DUAL,HK=H07,SCN=AM,NAR=TEST,EVD=DUALD,CAST=TECH,STY=REVIEW,PLT=META,CTA=CHK,LEN=L30"}'::jsonb, 223),
  ('BASE', '#25', '公路车骑行者 × 外挂容易被发现 · H02 反转（DE CON）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=CON,AUD=ROAD,PAIN=VIS,BEN=HIDE,HK=H02,SCN=WEEK,NAR=LIFE,EVD=SIZE,CAST=USER,STY=POV,PLT=IG,CTA=SHW,LEN=L30"}'::jsonb, 224),
  ('BASE', '#26', '通勤者 × 不想付订阅 · H06 清单（DE CON）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=DE,FUN=CON,AUD=COMM,PAIN=SUB,BEN=NOSUB,HK=H06,SCN=CAFE,NAR=LIST,EVD=VAL,CAST=USER,STY=UGC,PLT=META,CTA=SHW,LEN=L30"}'::jsonb, 225),
  ('BASE', '#27', '骑行新手 × 怕安装麻烦 · H03 开箱（EN CV）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=EN,FUN=CV,AUD=NEW,PAIN=INSTX,BEN=INST,HK=H03,SCN=HOME,NAR=DEMO,EVD=INSTD,CAST=USER,STY=UGC,PLT=META,CTA=CHK,LEN=L30"}'::jsonb, 226),
  ('BASE', '#28', '送礼者 × 想送实用礼物 · H08 互动提问（EN CV）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=EN,FUN=CV,AUD=GIFT,PAIN=GIFTM,BEN=NOSUB,HK=H08,SCN=AM,NAR=LIFE,EVD=VAL,CAST=USER,STY=VLOG,PLT=IG,CTA=CHK,LEN=L30"}'::jsonb, 227),
  ('BASE', '#29', '通勤者 × 安卓用户用不了 Find My · H06 清单（NL CV）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=NL,FUN=CV,AUD=COMM,PAIN=ANDR,BEN=DUAL,HK=H06,SCN=AM,NAR=LIST,EVD=DUALD,CAST=USER,STY=UGC,PLT=META,CTA=CHK,LEN=L30"}'::jsonb, 228),
  ('BASE', '#30', '旅行骑行者 × 外挂容易被发现 · H05 隐藏发现（FR CV）', 'enabled', '来自首批 30 条剧本', false, '{"vals":"MKT=FR,FUN=CV,AUD=TRIP,PAIN=VIS,BEN=HIDE,HK=H05,SCN=TRAIN,NAR=DEMO,EVD=SIZE,CAST=USER,STY=VLOG,PLT=IG,CTA=CHK,LEN=L30"}'::jsonb, 229);

-- Import once. Keep earlier spreadsheet-only rows archived and leave already-edited rows intact.
DO $seed$
BEGIN
  INSERT INTO script_lab.rule_imports (version) VALUES ('biceek-grok-aiby-v1') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE script_lab.rules AS existing SET archived = true
  WHERE existing.project_slug = 'biceek' AND existing.sort_order < 1000 AND existing.revision = 1
    AND NOT EXISTS (SELECT 1 FROM grok_rule_seed AS seed WHERE seed.dimension=existing.dimension AND seed.code=existing.code);
  INSERT INTO script_lab.rules AS existing (project_slug, dimension, code, label, status, enabled, notes, default_selected, fields, sort_order)
  SELECT 'biceek', dimension, code, label, status, status IN ('enabled','caution','phase-two'), notes, default_selected, fields, sort_order
  FROM grok_rule_seed
  ON CONFLICT (project_slug, dimension, code) DO UPDATE SET label=excluded.label, status=excluded.status,
    enabled=excluded.enabled, notes=excluded.notes, default_selected=excluded.default_selected, fields=excluded.fields,
    sort_order=excluded.sort_order, archived=false
  WHERE existing.revision=1 AND existing.sort_order < 1000;
END;
$seed$;


CREATE OR REPLACE FUNCTION script_lab.change_rule(
  operation text, scope text, email text, target_id uuid, target_revision integer, input jsonb
) RETURNS SETOF script_lab.rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, script_lab AS $body$
DECLARE
  previous script_lab.rules%ROWTYPE;
  saved script_lab.rules%ROWTYPE;
BEGIN
  IF operation NOT IN ('create','update','delete') OR scope NOT IN ('internal','customer') OR coalesce(email,'') = '' THEN
    RAISE EXCEPTION 'Invalid rule change or actor';
  END IF;

  IF operation <> 'create' THEN
    SELECT * INTO previous FROM script_lab.rules
      WHERE id = target_id AND project_slug = 'biceek' AND NOT archived AND revision = target_revision
      FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;
  END IF;

  IF operation = 'create' THEN
    INSERT INTO script_lab.rules (project_slug, dimension, code, label, label_en, notes, enabled, status, default_selected, fields)
    VALUES ('biceek', input->>'dimension', input->>'code', input->>'label', input->>'label_en',
            input->>'notes', input->>'status' IN ('enabled','caution','phase-two'), input->>'status', (input->>'default_selected')::boolean, input->'fields')
    ON CONFLICT (project_slug, dimension, code) DO UPDATE SET label=excluded.label, label_en=excluded.label_en,
      notes=excluded.notes, enabled=excluded.enabled, status=excluded.status, default_selected=excluded.default_selected,
      fields=excluded.fields, archived=false, revision=rules.revision+1
    WHERE rules.archived RETURNING * INTO saved;
    IF NOT FOUND THEN RETURN; END IF;
  ELSIF operation = 'update' THEN
    UPDATE script_lab.rules SET dimension = input->>'dimension', code = input->>'code', label = input->>'label',
      label_en = input->>'label_en', notes = input->>'notes', enabled = input->>'status' IN ('enabled','caution','phase-two'),
      status = input->>'status', default_selected = (input->>'default_selected')::boolean, fields = input->'fields',
      revision = revision + 1
    WHERE id = previous.id RETURNING * INTO saved;
  ELSE
    DELETE FROM script_lab.rules WHERE id = previous.id;
  END IF;

  INSERT INTO script_lab.rule_history (project_slug, rule_id, action, actor_scope, actor_email, before_rule, after_rule)
  VALUES ('biceek', coalesce(saved.id, previous.id), operation, scope, email,
    CASE WHEN previous.id IS NOT NULL THEN to_jsonb(previous) END,
    CASE WHEN saved.id IS NOT NULL THEN to_jsonb(saved) END);

  IF operation = 'delete' THEN
    RETURN NEXT previous;
  ELSE
    RETURN NEXT saved;
  END IF;
  RETURN;
END;
$body$;


REVOKE ALL ON FUNCTION script_lab.change_rule(text, text, text, uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION script_lab.change_rule(text, text, text, uuid, integer, jsonb) TO ubuntu;
COMMIT;
