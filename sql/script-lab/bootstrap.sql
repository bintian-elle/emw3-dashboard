\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE emw3_script_lab'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'emw3_script_lab') \gexec

REVOKE ALL ON DATABASE emw3_script_lab FROM PUBLIC;
GRANT CONNECT ON DATABASE emw3_script_lab TO ubuntu;

\connect emw3_script_lab
BEGIN;
CREATE SCHEMA IF NOT EXISTS script_lab;
CREATE TABLE IF NOT EXISTS script_lab.projects (
  slug text PRIMARY KEY,
  brand text NOT NULL,
  product text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  workspace jsonb NOT NULL CHECK (jsonb_typeof(workspace) = 'object')
);
GRANT USAGE ON SCHEMA script_lab TO ubuntu;
GRANT SELECT ON script_lab.projects TO ubuntu;

INSERT INTO script_lab.projects (slug, brand, product, is_published, workspace)
VALUES ('biceek', 'Biceek', 'Findhoo 200', true, $workspace$
{
  "candidates": [
    {
      "id": "commute",
      "name": [
        "City commute",
        "城市通勤"
      ],
      "format": "9:16",
      "visual": [
        "Wide shot of a parked commuter bike",
        "广角拍摄停在路边的通勤自行车"
      ]
    },
    {
      "id": "home",
      "name": [
        "At-home install",
        "居家安装"
      ],
      "format": "9:16",
      "visual": [
        "Show a bike in a home workshop",
        "展示家中工作间里的自行车"
      ]
    },
    {
      "id": "shop",
      "name": [
        "Bike shop demo",
        "车店演示"
      ],
      "format": "16:9",
      "visual": [
        "Show a mechanic working on a bike",
        "展示车店技师检修自行车"
      ]
    },
    {
      "id": "travel",
      "name": [
        "Travel setup",
        "出行场景"
      ],
      "format": "16:9",
      "visual": [
        "Show a bike at the train station",
        "展示火车站里的自行车"
      ]
    }
  ],
  "variables": [
    {
      "name": [
        "Audience",
        "人群"
      ],
      "values": [
        [
          "Commuter",
          "通勤者"
        ],
        [
          "Bike shop mechanic",
          "车店技师"
        ]
      ]
    },
    {
      "name": [
        "Scene",
        "场景"
      ],
      "values": [
        [
          "City street",
          "城市街边"
        ],
        [
          "Bike shop",
          "自行车店"
        ]
      ]
    },
    {
      "name": [
        "Format",
        "内容风格"
      ],
      "values": [
        [
          "UGC",
          "UGC"
        ],
        [
          "Product demo",
          "产品演示"
        ]
      ]
    },
    {
      "name": [
        "Language",
        "语言"
      ],
      "values": [
        [
          "English",
          "英语"
        ],
        [
          "German",
          "德语"
        ]
      ]
    }
  ],
  "sellingPoints": [
    {
      "code": "HIDE",
      "name": "Concealed installation",
      "original": "隐蔽安装",
      "pain": [
        "External mounts are easy to spot. A practical gift for cyclists is hard to find.",
        "外挂容易被发现、想送实用骑行礼物"
      ]
    },
    {
      "code": "INST",
      "name": "Easy installation",
      "original": "安装简单",
      "pain": [
        "Installation may be difficult.",
        "担心安装麻烦"
      ]
    },
    {
      "code": "LOC",
      "name": "Easy location checks",
      "original": "定位查看简单",
      "pain": [
        "The bike is hard to find after parking.",
        "停车后难找车辆"
      ]
    },
    {
      "code": "DUAL",
      "name": "Dual-system compatibility",
      "original": "双系统兼容",
      "pain": [
        "Android users have difficulty using Find My.",
        "安卓用户难以使用 Find My"
      ]
    },
    {
      "code": "NOSUB",
      "name": "No subscription fee",
      "original": "无订阅费",
      "pain": [
        "Recurring subscription fees are unwanted.",
        "不想持续支付订阅费"
      ]
    },
    {
      "code": "DESIGN",
      "name": "Simplicity by Design",
      "original": "Simplicity by Design"
    },
    {
      "code": "MOVE",
      "name": "MOVE FREE",
      "original": "MOVE FREE"
    },
    {
      "code": "FIT",
      "name": "Broad compatibility",
      "original": "广泛适配"
    }
  ],
  "initialBatch": [
    "commute",
    "home"
  ]
}
$workspace$::jsonb)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
