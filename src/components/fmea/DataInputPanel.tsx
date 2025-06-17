
"use client";

import type { ApiResponseType } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { parseJsonWithBigInt } from "@/lib/bigint-utils";

interface DataInputPanelProps {
  onJsonSubmit: (json: string, type: ApiResponseType) => void;
  disabled?: boolean;
}

const exampleRequirementsJson = `{
  "nodes": [
    { "uuid": 9223372036854775801, "parentId": -1, "nodeType": "requirement", "description": "The system shall adhere to safety standard ISO 26262." },
    { "uuid": 9223372036854775802, "parentId": 9223372036854775801, "nodeType": "func", "description": "Implement fault detection for critical sensors." },
    { "uuid": 9223372036854775803, "parentId": 9223372036854775802, "nodeType": "cha", "description": "Sensor diagnostic coverage > 99%." }
  ]
}`;

const exampleDfmeaJson = `{
    "baseInfo": {
        "name": "激光器 DFMEA 分析",
        "partNo": "LASER-001",
        "partName": "激光器",
        "evaluationCriteria": "AIAG-VDA"
    },
    "nodes": [
        {
            "uuid": 589738752264507392,
            "parentId": -1,
            "nodeType": "system",
            "description": "激光器系统",
            "extra": {}
        },
        {
            "uuid": 589738752264507393,
            "parentId": 589738752264507392,
            "nodeType": "subsystem",
            "description": "激光发射子系统",
            "extra": {}
        },
        {
            "uuid": 589738752264507394,
            "parentId": 589738752264507393,
            "nodeType": "component",
            "description": "激光二极管",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507395,
            "parentId": 589738752264507393,
            "nodeType": "component",
            "description": "准直透镜",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507396,
            "parentId": 589738752264507393,
            "nodeType": "component",
            "description": "散热模块",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507397,
            "parentId": 589738752264507392,
            "nodeType": "subsystem",
            "description": "电源管理子系统",
            "extra": {}
        },
        {
            "uuid": 589738752264507398,
            "parentId": 589738752264507397,
            "nodeType": "component",
            "description": "激光驱动电路",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507399,
            "parentId": 589738752264507397,
            "nodeType": "component",
            "description": "温度控制电路",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507400,
            "parentId": 589738752264507392,
            "nodeType": "subsystem",
            "description": "控制及通讯子系统",
            "extra": {}
        },
        {
            "uuid": 589738752264507401,
            "parentId": 589738752264507400,
            "nodeType": "component",
            "description": "微控制器",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507402,
            "parentId": 589738752264507400,
            "nodeType": "component",
            "description": "通讯接口",
            "extra": {
                "dr": 0
            }
        },
        {
            "uuid": 589738752264507403,
            "parentId": 589738752264507394,
            "nodeType": "func",
            "description": "产生稳定激光束",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507404,
            "parentId": 589738752264507403,
            "nodeType": "cha",
            "description": "输出功率稳定性",
            "extra": {
                "req_spe": "±5% 额定功率",
                "spe_tol": "100W ± 5W",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507405,
            "parentId": 589738752264507403,
            "nodeType": "cha",
            "description": "波长精度",
            "extra": {
                "req_spe": "±0.5 nm",
                "spe_tol": "980 nm ± 0.5 nm",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507406,
            "parentId": 589738752264507395,
            "nodeType": "func",
            "description": "将激光束准直",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507407,
            "parentId": 589738752264507406,
            "nodeType": "cha",
            "description": "光束发散角",
            "extra": {
                "req_spe": "小于 2 mrad",
                "spe_tol": "< 2 mrad",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507408,
            "parentId": 589738752264507396,
            "nodeType": "func",
            "description": "有效散发激光二极管热量",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507409,
            "parentId": 589738752264507408,
            "nodeType": "cha",
            "description": "热阻",
            "extra": {
                "req_spe": "小于 0.5 °C/W",
                "spe_tol": "< 0.5 °C/W",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507410,
            "parentId": 589738752264507398,
            "nodeType": "func",
            "description": "为激光二极管提供稳定电流",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507411,
            "parentId": 589738752264507410,
            "nodeType": "cha",
            "description": "电流稳定性",
            "extra": {
                "req_spe": "纹波小于 2%",
                "spe_tol": "< 2% 纹波",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507412,
            "parentId": 589738752264507399,
            "nodeType": "func",
            "description": "控制激光二极管温度",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507413,
            "parentId": 589738752264507412,
            "nodeType": "cha",
            "description": "温度控制精度",
            "extra": {
                "req_spe": "±0.1 °C",
                "spe_tol": "25 ± 0.1 °C",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507414,
            "parentId": 589738752264507401,
            "nodeType": "func",
            "description": "执行激光器控制逻辑",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507415,
            "parentId": 589738752264507414,
            "nodeType": "cha",
            "description": "指令响应时间",
            "extra": {
                "req_spe": "小于 10 ms",
                "spe_tol": "< 10 ms",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507416,
            "parentId": 589738752264507402,
            "nodeType": "func",
            "description": "实现外部系统通讯",
            "extra": {
                "category": 0
            }
        },
        {
            "uuid": 589738752264507417,
            "parentId": 589738752264507416,
            "nodeType": "cha",
            "description": "通讯速率",
            "extra": {
                "req_spe": "115200 bps",
                "spe_tol": "115200 bps",
                "classification": "QCC"
            }
        },
        {
            "uuid": 589738752264507418,
            "parentId": 589738752264507404,
            "nodeType": "failure",
            "description": "输出功率不稳定",
            "extra": {
                "failureType": 1,
                "severity": 8
            }
        },
        {
            "uuid": 589738752264507419,
            "parentId": 589738752264507405,
            "nodeType": "failure",
            "description": "波长漂移",
            "extra": {
                "failureType": 1,
                "severity": 7
            }
        },
        {
            "uuid": 589738752264507420,
            "parentId": 589738752264507407,
            "nodeType": "failure",
            "description": "光束发散角过大",
            "extra": {
                "failureType": 1,
                "severity": 6
            }
        },
        {
            "uuid": 589738752264507421,
            "parentId": 589738752264507409,
            "nodeType": "failure",
            "description": "散热不良导致过热",
            "extra": {
                "failureType": 1,
                "severity": 9
            }
        },
        {
            "uuid": 589738752264507422,
            "parentId": 589738752264507411,
            "nodeType": "failure",
            "description": "激光驱动电流波动",
            "extra": {
                "failureType": 1,
                "severity": 8
            }
        },
        {
            "uuid": 589738752264507423,
            "parentId": 589738752264507413,
            "nodeType": "failure",
            "description": "温度控制失准",
            "extra": {
                "failureType": 1,
                "severity": 7
            }
        },
        {
            "uuid": 589738752264507424,
            "parentId": 589738752264507415,
            "nodeType": "failure",
            "description": "控制指令响应延迟",
            "extra": {
                "failureType": 1,
                "severity": 5
            }
        },
        {
            "uuid": 589738752264507425,
            "parentId": 589738752264507417,
            "nodeType": "failure",
            "description": "通讯中断",
            "extra": {
                "failureType": 1,
                "severity": 6
            }
        },
        {
            "uuid": 589738752264507426,
            "parentId": 589738752264507418,
            "nodeType": "action",
            "description": "激光二极管老化测试",
            "extra": {
                "category": 1,
                "detection": 7,
                "occurrence": 5
            }
        },
        {
            "uuid": 589738752264507427,
            "parentId": 589738752264507418,
            "nodeType": "action",
            "description": "输出功率闭环反馈控制",
            "extra": {
                "category": 2,
                "detection": 9,
                "occurrence": 3
            }
        },
        {
            "uuid": 589738752264507428,
            "parentId": 589738752264507419,
            "nodeType": "action",
            "description": "激光二极管选型验证",
            "extra": {
                "category": 1,
                "detection": 7,
                "occurrence": 4
            }
        },
        {
            "uuid": 589738752264507429,
            "parentId": 589738752264507419,
            "nodeType": "action",
            "description": "精确温度控制",
            "extra": {
                "category": 2,
                "detection": 8,
                "occurrence": 3
            }
        },
        {
            "uuid": 589738752264507430,
            "parentId": 589738752264507420,
            "nodeType": "action",
            "description": "透镜光学性能测试",
            "extra": {
                "category": 1,
                "detection": 8,
                "occurrence": 3
            }
        },
        {
            "uuid": 589738752264507431,
            "parentId": 589738752264507420,
            "nodeType": "action",
            "description": "光路对准工艺控制",
            "extra": {
                "category": 2,
                "detection": 7,
                "occurrence": 2
            }
        },
        {
            "uuid": 589738752264507432,
            "parentId": 589738752264507421,
            "nodeType": "action",
            "description": "散热模块热设计验证",
            "extra": {
                "category": 1,
                "detection": 7,
                "occurrence": 4
            }
        },
        {
            "uuid": 589738752264507433,
            "parentId": 589738752264507421,
            "nodeType": "action",
            "description": "温度传感器实时监控",
            "extra": {
                "category": 2,
                "detection": 9,
                "occurrence": 2
            }
        },
        {
            "uuid": 589738752264507434,
            "parentId": 589738752264507422,
            "nodeType": "action",
            "description": "激光驱动电路稳定性测试",
            "extra": {
                "category": 1,
                "detection": 7,
                "occurrence": 5
            }
        },
        {
            "uuid": 589738752264507435,
            "parentId": 589738752264507422,
            "nodeType": "action",
            "description": "电源滤波设计优化",
            "extra": {
                "category": 2,
                "detection": 8,
                "occurrence": 3
            }
        },
        {
            "uuid": 589738752264507436,
            "parentId": 589738752264507423,
            "nodeType": "action",
            "description": "温度传感器校准",
            "extra": {
                "category": 1,
                "detection": 8,
                "occurrence": 4
            }
        },
        {
            "uuid": 589738752264507437,
            "parentId": 589738752264507423,
            "nodeType": "action",
            "description": "PID控制参数优化",
            "extra": {
                "category": 2,
                "detection": 8,
                "occurrence": 2
            }
        },
        {
            "uuid": 589738752264507438,
            "parentId": 589738752264507424,
            "nodeType": "action",
            "description": "软件代码审查",
            "extra": {
                "category": 1,
                "detection": 7,
                "occurrence": 3
            }
        },
        {
            "uuid": 589738752264507439,
            "parentId": 589738752264507424,
            "nodeType": "action",
            "description": "实时操作系统任务调度优化",
            "extra": {
                "category": 2,
                "detection": 6,
                "occurrence": 2
            }
        },
        {
            "uuid": 589738752264507440,
            "parentId": 589738752264507425,
            "nodeType": "action",
            "description": "通讯协议测试",
            "extra": {
                "category": 1,
                "detection": 8,
                "occurrence": 3
            }
        },
        {
            "uuid": 589738752264507441,
            "parentId": 589738752264507425,
            "nodeType": "action",
            "description": "通讯链路冗余设计",
            "extra": {
                "category": 2,
                "detection": 7,
                "occurrence": 1
            }
        }
    ],
    "failureNet": [
        {
            "from": 589738752264507423,
            "to": 589738752264507419,
            "type": 1
        },
        {
            "from": 589738752264507423,
            "to": 589738752264507418,
            "type": 1
        },
        {
            "from": 589738752264507423,
            "to": 589738752264507421,
            "type": 2
        }
    ],
    "interface": [
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507395,
            "type": 1,
            "interaction": 0,
            "effect": 0,
            "description": "激光二极管与准直透镜之间的物理连接，以光学对准产生激光束。",
            "virtualParts": "光学路径连接"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507395,
            "type": 2,
            "interaction": 0,
            "effect": 0,
            "description": "激光二极管向准直透镜发出光能（激光束）。",
            "virtualParts": "激光束传输"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507396,
            "type": 1,
            "interaction": 1,
            "effect": 0,
            "description": "激光二极管与散热模块之间的物理接触，用于热量传导。",
            "virtualParts": "导热界面"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507396,
            "type": 2,
            "interaction": 0,
            "effect": 0,
            "description": "激光二极管向散热模块传输其产生的热能。",
            "virtualParts": "热量传导路径"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507398,
            "type": 1,
            "interaction": 1,
            "effect": 0,
            "description": "激光二极管与激光驱动电路之间的电气连接，用于供电和接收驱动信号。",
            "virtualParts": "电源连接线"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507398,
            "endId": 589738752264507394,
            "type": 2,
            "interaction": 0,
            "effect": 0,
            "description": "激光驱动电路向激光二极管提供稳定的电流驱动其发光。",
            "virtualParts": "电流驱动"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507399,
            "type": 1,
            "interaction": 1,
            "effect": 0,
            "description": "激光二极管与温度控制电路之间的传感器连接，用于温度反馈。",
            "virtualParts": "温度传感器线"
        },
        {
            "structureId": 589738752264507393,
            "startId": 589738752264507394,
            "endId": 589738752264507399,
            "type": 6,
            "interaction": 0,
            "effect": 0,
            "description": "激光二极管（通过传感器）向温度控制电路传输温度信息。",
            "virtualParts": "温度信号反馈"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507398,
            "endId": 589738752264507401,
            "type": 1,
            "interaction": 1,
            "effect": 0,
            "description": "激光驱动电路与微控制器之间的电气连接，用于控制信号传输和状态反馈。",
            "virtualParts": "控制信号线"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507401,
            "endId": 589738752264507398,
            "type": 6,
            "interaction": 0,
            "effect": 0,
            "description": "微控制器向激光驱动电路发送指令，控制激光二极管的启停和功率。",
            "virtualParts": "功率控制指令"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507398,
            "endId": 589738752264507401,
            "type": 6,
            "interaction": 0,
            "effect": 0,
            "description": "激光驱动电路向微控制器反馈驱动状态信息（如电流、电压）。",
            "virtualParts": "驱动状态反馈"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507399,
            "endId": 589738752264507401,
            "type": 1,
            "interaction": 1,
            "effect": 0,
            "description": "温度控制电路与微控制器之间的电气连接，用于控制信号传输和温度反馈。",
            "virtualParts": "温度控制信号线"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507401,
            "endId": 589738752264507399,
            "type": 6,
            "interaction": 0,
            "effect": 0,
            "description": "微控制器向温度控制电路发送设定温度指令。",
            "virtualParts": "温度设定指令"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507399,
            "endId": 589738752264507401,
            "type": 6,
            "interaction": 0,
            "effect": 0,
            "description": "温度控制电路向微控制器反馈实时温度读数。",
            "virtualParts": "温度值反馈"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507401,
            "endId": 589738752264507402,
            "type": 1,
            "interaction": 1,
            "effect": 0,
            "description": "微控制器与通讯接口之间的电气连接，用于数据交换。",
            "virtualParts": "数据总线"
        },
        {
            "structureId": 589738752264507392,
            "startId": 589738752264507401,
            "endId": 589738752264507402,
            "type": 6,
            "interaction": 1,
            "effect": 0,
            "description": "微控制器通过通讯接口与外部系统交换指令和状态数据。",
            "virtualParts": "数据通讯流"
        }
    ],
    "featureNet": [
        {
            "from": 589738752264507403,
            "to": 589738752264507404,
            "type": 2
        },
        {
            "from": 589738752264507403,
            "to": 589738752264507405,
            "type": 2
        },
        {
            "from": 589738752264507406,
            "to": 589738752264507407,
            "type": 2
        },
        {
            "from": 589738752264507408,
            "to": 589738752264507409,
            "type": 2
        },
        {
            "from": 589738752264507410,
            "to": 589738752264507411,
            "type": 2
        },
        {
            "from": 589738752264507412,
            "to": 589738752264507413,
            "type": 2
        },
        {
            "from": 589738752264507414,
            "to": 589738752264507415,
            "type": 2
        },
        {
            "from": 589738752264507416,
            "to": 589738752264507417,
            "type": 2
        }
    ]
}`;

const examplePfmeaJson = `{
  "baseInfo": {
    "name": "Sample PFMEA Project - Battery Assembly Line",
    "partNo": "BAT-ASSY-PROC-001",
    "partName": "Battery Module Assembly Process",
    "evaluationCriteria": "IATF 16949 Manufacturing Standards"
  },
  "nodes": [
    { "uuid": "590066152953221201", "parentId": "-1", "nodeType": "item", "description": "Battery Cell Stacking Station" },
    { "uuid": "590066152953221202", "parentId": "590066152953221201", "nodeType": "step", "description": "Pick and place cell" },
    { "uuid": "590066152953221203", "parentId": "590066152953221202", "nodeType": "elem", "description": "Robot Gripper", "extra": { "em": 1 } },
    { "uuid": "590066152953221204", "parentId": "590066152953221203", "nodeType": "func", "description": "Securely hold cell during transfer" },
    { "uuid": "590066152953221205", "parentId": "590066152953221204", "nodeType": "cha", "description": "Gripping force between 5N-7N", "extra": { "type": "process" } },
    { "uuid": "590066152953221206", "parentId": "590066152953221204", "nodeType": "mode", "description": "Cell dropped or misaligned" },
    { "uuid": "590066152953221207", "parentId": "590066152953221206", "nodeType": "effect", "description": "Damaged cell, potential short circuit", "extra": { "category": 1, "severity": 10 } },
    { "uuid": "590066152953221208", "parentId": "590066152953221206", "nodeType": "cause", "description": "Incorrect gripper pressure", "extra": { "occurrence": 4 } },
    { "uuid": "590066152953221209", "parentId": "590066152953221208", "nodeType": "action", "description": "Calibrate gripper pressure sensor daily", "extra": { "category": 1, "detection": 3 } }
  ],
  "featureNet": [
    { "from": "590066152953221204", "to": "590066152953221205", "type": 1 }
  ],
  "failureNet": [
    { "from": "590066152953221206", "to": "590066152953221207", "type": 3 }
  ]
}`;

const exampleJsonMap: Record<ApiResponseType, string> = {
  requirements: exampleRequirementsJson,
  dfmea: exampleDfmeaJson,
  pfmea: examplePfmeaJson,
};

const defaultApiBaseUrl = 'https://fmea-api.xixifusi.online/api/fmea/analysis/'; // Updated Base URL

const defaultApiPayloads: Record<ApiResponseType, string> = {
  requirements: `{
  "sessionId": "session_ghia17289_requirements_focus",
  "nodes": [
    {
      "uuid": "590066152953221121"
    }
  ],
  "documentIds": [
    "http://www.example.doc_std_gbt20234_abc"
  ],
  "modifiedStructure": {
    "nodes": [
      {
        "uuid": "590066152953221100",
        "parentId": "-1",
        "nodeType": "system",
        "description": "调整后的机械安全系统",
        "extra": {
          "projectCode": "XYZ-Mod"
        }
      },
      {
        "uuid": "590066152953221121",
        "parentId": "590066152953221100",
        "nodeType": "subsystem",
        "description": "调整后的挤压防护子系统",
        "extra": {}
      },
      {
        "uuid": "590066152953221122",
        "parentId": "590066152953221121",
        "nodeType": "component",
        "description": "定制化安全间距挡板",
        "extra": {}
      }
    ]
  },
  "scope": "structure_only",
  "extraPayload": "{\\"analysisScope\\": \\"critical_safety_reqs_only\\"}"
}`,
  dfmea: `{
  "sessionId": "session_dfmea_example",
  "nodes": [],
  "modifiedStructure": { "nodes": [] },
  "scope": "full_dfmea",
  "extraPayload": "{}"
}`,
  pfmea: `{
  "sessionId": "session_pfmea_example",
  "processSteps": [],
  "modifiedStructure": { "nodes": [] },
  "scope": "full_pfmea",
  "extraPayload": "{}"
}`,
};


export function DataInputPanel({ onJsonSubmit, disabled }: DataInputPanelProps) {
  const [apiType, setApiType] = useState<ApiResponseType>("requirements");
  const [jsonInput, setJsonInput] = useState<string>(exampleJsonMap[apiType]);
  
  const [apiUrl, setApiUrl] = useState<string>(`${defaultApiBaseUrl}${apiType}`);
  const [apiPayload, setApiPayload] = useState<string>(defaultApiPayloads[apiType]);
  const [isFetchingApiData, setIsFetchingApiData] = useState<boolean>(false);
  const [apiFetchError, setApiFetchError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setJsonInput(exampleJsonMap[apiType]);
    setApiUrl(`${defaultApiBaseUrl}${apiType}`);
    setApiPayload(defaultApiPayloads[apiType]);
    setApiFetchError(null);
  }, [apiType]);

  const handleSubmit = () => {
    onJsonSubmit(jsonInput, apiType);
  };

  const handleApiTypeChange = (value: string) => {
    setApiType(value as ApiResponseType);
  };

  const handleFetchFromApi = async () => {
    setIsFetchingApiData(true);
    setApiFetchError(null);
    let parsedPayload;

    try {
      parsedPayload = parseJsonWithBigInt(apiPayload);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid Payload JSON",
        description: "The request payload is not valid JSON. Please correct it.",
      });
      setIsFetchingApiData(false);
      return;
    }

    let currentPayloadSnapshot = apiPayload; 

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedPayload),
        mode: 'cors', 
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check for specific CORS or network-related status codes if possible, though response.ok handles general HTTP errors.
        // A status of 0 often indicates a CORS preflight failure or network error before the server could respond with a typical HTTP status.
        if (response.status === 0) {
           throw new Error(`API request failed. This might be due to a CORS policy on the server or a network issue. Status: ${response.status}. Error: ${errorText}`);
        }
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const responseDataText = await response.text();
      try {
        parseJsonWithBigInt(responseDataText); 
        setJsonInput(responseDataText);
        toast({
          title: "API Data Fetched",
          description: "Data successfully retrieved from the API and loaded into the JSON input area.",
        });
      } catch (e) {
        setJsonInput(responseDataText); 
        toast({
          variant: "destructive",
          title: "API Response Not JSON",
          description: "The API responded, but the data is not valid JSON. It has been loaded as text.",
        });
      }
    } catch (error: any) {
      let description = error.message || "An unknown error occurred while fetching data.";
       if (error.message && (error.message.toLowerCase().includes('failed to fetch') || error.message.toLowerCase().includes('networkerror'))) {
        description = `Failed to fetch: ${error.message}. This commonly occurs due to network issues, or a CORS (Cross-Origin Resource Sharing) policy on the API server. Please check your network connection, ensure the API server at ${apiUrl} is configured to allow requests from your origin, and check the browser's developer console (Network tab) for more specific error details (e.g., preflight OPTIONS request failures).`;
      } else if (error.message && (error.message.toLowerCase().includes('ssl') || error.message.toLowerCase().includes('certificate'))) {
        description = `SSL/TLS Certificate error: ${error.message}. The API server at ${apiUrl} might be using an invalid or self-signed certificate. Ensure the server has a valid HTTPS certificate.`;
      }
      
      setApiFetchError(description); 
      
      toast({
        variant: "destructive",
        title: "API Request Error",
        description: description,
      });
      console.error("API Fetch Error:", {
        url: apiUrl,
        payloadAttempted: currentPayloadSnapshot, 
        errorDetails: error,
        errorMessage: error.message,
        advice: "If this is a CORS issue, the API server needs to be configured with appropriate Access-Control-Allow-Origin headers."
      });
    } finally {
      setIsFetchingApiData(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">FMEA Data Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="apiType" className="mb-2 block">API Response Type</Label>
          <Select
            value={apiType}
            onValueChange={handleApiTypeChange}
            disabled={disabled || isFetchingApiData}
          >
            <SelectTrigger id="apiType">
              <SelectValue placeholder="Select API type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requirements">Requirements</SelectItem>
              <SelectItem value="dfmea">DFMEA</SelectItem>
              <SelectItem value="pfmea">PFMEA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator className="my-6" />
        
        <CardDescription>Option 1: Fetch from API</CardDescription>
        <div>
          <Label htmlFor="apiUrl" className="mb-2 block">API URL</Label>
          <Input
            id="apiUrl"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="Enter API endpoint URL"
            className="font-code"
            disabled={disabled || isFetchingApiData}
          />
        </div>
        <div>
          <Label htmlFor="apiPayload" className="mb-2 block">Request Payload (JSON)</Label>
          <Textarea
            id="apiPayload"
            value={apiPayload}
            onChange={(e) => setApiPayload(e.target.value)}
            placeholder="Enter JSON payload for the API request"
            rows={8}
            className="font-code"
            disabled={disabled || isFetchingApiData}
          />
        </div>
        <Button 
          onClick={handleFetchFromApi} 
          className="w-full" 
          disabled={disabled || isFetchingApiData}
        >
          {isFetchingApiData && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Fetch Data from API
        </Button>
        {apiFetchError && !isFetchingApiData && <p className="text-sm text-destructive mt-2">{apiFetchError}</p>}
        
        <Separator className="my-6" />

        <CardDescription>Option 2: Paste JSON or Use Example</CardDescription>
        <div>
          <Label htmlFor="jsonInput" className="mb-2 block">FMEA JSON Data</Label>
          <Textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste JSON data here, or fetch from API, or use loaded example..."
            rows={15}
            className="font-code"
            disabled={disabled || isFetchingApiData}
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          disabled={disabled || isFetchingApiData || !jsonInput.trim()}
        >
          Visualize Data
        </Button>
      </CardContent>
    </Card>
  );
}

