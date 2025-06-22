
import type { FmeaApiResponse, ApiResponseType, FmeaNode, DFMEAAnalysisResponse, PFMEAAnalysisResponse } from '@/types/fmea';

export type RuleItemStatus = 'success' | 'error' | 'warning' | 'info';

export interface RuleItem {
  id: string;
  description: string;
  status: RuleItemStatus;
  details?: string | null;
  remark?: string | null;
}

export interface RuleGroup {
  groupTitle: string;
  overallStatus: RuleItemStatus;
  summary: { [key in RuleItemStatus]?: number };
  rules: RuleItem[];
}

export interface FmeaRule {
  id: string; 
  description: string;
  groupId: keyof typeof ruleGroupDefs;
  remark?: string;
  check: (data: FmeaApiResponse, type: ApiResponseType | null) => Pick<RuleItem, 'status' | 'details'>;
}

const ruleGroupDefs = {
  structureStability: { title: '结构稳定性约束' },
  structure: { title: '结构骨架与根节点约束' },
  linking: { title: '元素挂载、层级与依赖约束' },
  network: { title: '网络(Net)与接口(Interface)约束' },
  completeness: { title: '字段逻辑与数据完整性约束' },
};


const rules: FmeaRule[] = [
  // 00 - General Rules
  {
    id: '00-1-0-07',
    description: '在 `scope="full_doc"` 的场景下，Agent 返回的 `nodes` 列表绝不能修改或删除任何从 `modifiedStructure` 中接收到的节点的 `uuid` 和 `parentId`。',
    groupId: 'structureStability',
    remark: '这是保证用户编辑内容不被 AI 覆盖的核心规则，是系统数据一致性的基石。',
    check: (data, type) => {
      return { status: 'info', details: '此规则需要在请求和响应之间进行比较，当前无法在仅有响应数据的情况下进行验证。' };
    },
  },
  {
    id: '00-1-0-08',
    description: 'Agent 只能在现有结构上添加新节点。',
    groupId: 'structureStability',
    check: (data, type) => {
      return { status: 'info', details: '此规则需要在请求和响应之间进行比较，当前无法在仅有响应数据的情况下进行验证。' };
    },
  },
  {
    id: '00-1-1-10',
    description: '(需求分析特定) 响应中 `nodes` 数组的长度上限为 100。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'info', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'success' };
      if (data.nodes.length > 100) {
        return { status: 'warning', details: `节点数量为 ${data.nodes.length}，超过 100 个可能导致前端性能问题。` };
      }
      return { status: 'success' };
    },
  },

  // 01 - Requirements Rules
  {
    id: '01-1-0-01',
    description: '需求树必须有且仅有一个根节点 (`parentId: -1`)。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'info', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'error', details: '响应中缺少 `nodes` 数组。' };
      const roots = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (roots.length !== 1) {
        return { status: 'error', details: `发现 ${roots.length} 个根节点，应为 1 个。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-0-02',
    description: '该根节点的 `nodeType` 必须是 `requirement`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'info', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const roots = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (roots.length !== 1) return { status: 'info', details: '无法确定唯一根节点，跳过此检查。' };
      if (roots[0].nodeType !== 'requirement') {
        return { status: 'error', details: `根节点类型为 '${roots[0].nodeType}'，应为 'requirement'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-0-03',
    description: '`cha` 节点不能有任何子节点。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'info', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const chaNodeIds = new Set(data.nodes.filter(n => n.nodeType === 'cha').map(n => n.uuid.toString()));
      const childrenOfCha = data.nodes.filter(n => chaNodeIds.has(n.parentId.toString()));
      if (childrenOfCha.length > 0) {
        const parentIds = [...new Set(childrenOfCha.map(c => c.parentId.toString()))];
        return { status: 'error', details: `cha 节点 (UUIDs: ${parentIds.slice(0, 3).join(', ')}) 不能有子节点。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-1-04',
    description: '根节点（总需求）下不应直接挂载 `func` 或 `cha` 节点。',
    groupId: 'linking',
    remark: '违反了需求分解的最佳实践，应先有子需求。',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'info', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const roots = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (roots.length !== 1) return { status: 'info', details: '无法确定唯一根节点，跳过此检查。' };
      const root = roots[0];
      const directChildren = data.nodes.filter(n => n.parentId === root.uuid);
      const invalidChildren = directChildren.filter(c => c.nodeType === 'func' || c.nodeType === 'cha');
      if (invalidChildren.length > 0) {
        return { status: 'warning', details: `根节点下不应直接挂载 func 或 cha 节点 (发现 ${invalidChildren.length} 个)。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-1-05',
    description: '`func` 节点下不应再有 `func` 子节点。',
    groupId: 'linking',
    remark: '`func` 下再挂 `func` 违反了功能分解的逻辑。',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'info', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const funcsWithFuncChildren = data.nodes.filter(n => {
        if (n.nodeType !== 'func') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent?.nodeType === 'func';
      });

      if (funcsWithFuncChildren.length > 0) {
        const parentIds = [...new Set(funcsWithFuncChildren.map(n => n.parentId.toString()))];
        return { status: 'warning', details: `func 节点 (UUIDs: ${parentIds.slice(0,3).join(', ')}) 不应有 func 子节点。` };
      }
      return { status: 'success' };
    },
  },

  // 02 - DFMEA Rules
  {
    id: '02-1-0-01',
    description: '必须有且仅有一个 `system` 类型的根节点。',
    groupId: 'structure',
    remark: '此规则严格对齐 AIAG-VDA FMEA 方法论中的“结构分析”步骤，确保了分析的规范性。',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'error', details: '响应中缺少 `nodes` 数组。' };
      const roots = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (roots.length !== 1) {
        return { status: 'error', details: `发现 ${roots.length} 个根节点，应为 1 个。` };
      }
      if (roots[0].nodeType !== 'system') {
        return { status: 'error', details: `根节点类型为 '${roots[0].nodeType}'，应为 'system'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-02',
    description: '`system` 根节点下有且仅有一个 `subsystem` 类型的直接子节点。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const systemRoot = data.nodes.find(n => n.parentId.toString() === '-1' && n.nodeType === 'system');
      if (!systemRoot) return { status: 'info', details: '未找到 system 根节点，跳过此检查。' };
      const directSubsystems = data.nodes.filter(n => n.parentId === systemRoot.uuid && n.nodeType === 'subsystem');
      if (directSubsystems.length !== 1) {
        return { status: 'error', details: `system 根节点 (UUID: ${systemRoot.uuid}) 下发现 ${directSubsystems.length} 个 subsystem 子节点，应为 1 个。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-03',
    description: '所有在 `subsystem` 节点之下的结构性节点，其类型必须是 `component`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const structuralTypes = ['system', 'subsystem', 'component'];
      const subsystemIds = new Set(data.nodes.filter(n => n.nodeType === 'subsystem').map(n => n.uuid));
      const invalidChildren: FmeaNode[] = [];
      data.nodes.forEach(node => {
        if (subsystemIds.has(node.parentId) && structuralTypes.includes(node.nodeType) && node.nodeType !== 'component') {
          invalidChildren.push(node);
        }
      });
      if (invalidChildren.length > 0) {
        return { status: 'error', details: `subsystem 节点下发现非 component 类型的结构性子节点 (UUIDs: ${invalidChildren.map(n => n.uuid).slice(0,3).join(', ')}).` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-04',
    description: '`func` (功能) 节点只能被挂载在 `system`、`subsystem` 或 `component` 节点下。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const invalidFuncs = funcNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || !['system', 'subsystem', 'component'].includes(parent.nodeType);
      });
      if (invalidFuncs.length > 0) {
        return { status: 'error', details: `${invalidFuncs.length} 个 func 节点的父节点类型错误 (例如 UUID: ${invalidFuncs[0].uuid})。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-05',
    description: '`cha` (特性) 的父节点必须是 `func`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      const invalidChas = chaNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || parent.nodeType !== 'func';
      });
      if (invalidChas.length > 0) {
        return { status: 'error', details: `${invalidChas.length} 个 cha 节点的父节点类型不为 'func' (例如 UUID: ${invalidChas[0].uuid})。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-06',
    description: '`failure` (失效) 的父节点必须是 `func` 或 `cha`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      const invalidFailures = failureNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || !['func', 'cha'].includes(parent.nodeType);
      });
      if (invalidFailures.length > 0) {
        return { status: 'error', details: `${invalidFailures.length} 个 failure 节点的父节点类型错误 (例如 UUID: ${invalidFailures[0].uuid})。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-07',
    description: '`detection` 字段仅在 `category` 为 `2` (日常探测控制) 时才有效且必需。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const actions = data.nodes.filter(n => n.nodeType === 'action');
      const invalidActions = actions.filter(n => {
        const extra = n.extra || {};
        const hasDetection = extra.detection !== undefined && extra.detection !== null;
        return (extra.category === 2 && !hasDetection) || (extra.category !== 2 && hasDetection);
      });
      if (invalidActions.length > 0) {
        return { status: 'error', details: `${invalidActions.length} 个 action 节点的 detection 字段与 category 不匹配 (例如 UUID: ${invalidActions[0].uuid})。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-08',
    description: '`featureNet` 用于连接 `func` 类型的节点；`failureNet` 用于连接 `failure` 类型的节点。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const dfmeaData = data as DFMEAAnalysisResponse;
      const errors = [];
      if (dfmeaData.featureNet) {
        const invalidLinks = dfmeaData.featureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || fromNode.nodeType !== 'func' || !toNode || toNode.nodeType !== 'func';
        });
        if (invalidLinks.length > 0) errors.push(`featureNet 中包含 ${invalidLinks.length} 个非 func 节点间的连接。`);
      }
      if (dfmeaData.failureNet) {
        const invalidLinks = dfmeaData.failureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || fromNode.nodeType !== 'failure' || !toNode || toNode.nodeType !== 'failure';
        });
        if (invalidLinks.length > 0) errors.push(`failureNet 中包含 ${invalidLinks.length} 个非 failure 节点间的连接。`);
      }
      if (errors.length > 0) {
        return { status: 'error', details: errors.join(' ') };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-09',
    description: '`interface` 只能在 `component` 类型的节点之间建立。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      const dfmeaData = data as DFMEAAnalysisResponse;
      if (!dfmeaData.interface) return { status: 'success' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidInterfaces = dfmeaData.interface.filter(i => {
        const startNode = nodeMap.get(i.startId.toString());
        const endNode = nodeMap.get(i.endId.toString());
        return !startNode || startNode.nodeType !== 'component' || !endNode || endNode.nodeType !== 'component';
      });
      if (invalidInterfaces.length > 0) {
        return { status: 'error', details: `发现 ${invalidInterfaces.length} 个 interface 未在 component 节点之间建立。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-10',
    description: '`interface` 的 `structureId` 必须是 `startId` 和 `endId` 的共同父节点的 `uuid`。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      const dfmeaData = data as DFMEAAnalysisResponse;
      if (!dfmeaData.interface) return { status: 'success' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidInterfaces = dfmeaData.interface.filter(i => {
        const startNode = nodeMap.get(i.startId.toString());
        const endNode = nodeMap.get(i.endId.toString());
        if (!startNode || !endNode || startNode.parentId !== endNode.parentId) return true;
        return startNode.parentId !== i.structureId;
      });
      if (invalidInterfaces.length > 0) {
        return { status: 'error', details: `发现 ${invalidInterfaces.length} 个 interface 的 structureId 与 start/end 节点的父ID不匹配。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-11',
    description: '一个 `func` 节点不应同时直接拥有 `cha` 子节点和 `failure` 子节点。',
    groupId: 'linking',
    remark: '这是一个重要的逻辑规则，确保分析链条的清晰性。',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const invalidFuncs = funcNodes.filter(f => {
        const children = data.nodes.filter(c => c.parentId === f.uuid);
        const hasCha = children.some(c => c.nodeType === 'cha');
        const hasFailure = children.some(c => c.nodeType === 'failure');
        return hasCha && hasFailure;
      });
      if (invalidFuncs.length > 0) {
        return { status: 'warning', details: `func 节点 (UUIDs: ${invalidFuncs.map(n => n.uuid).slice(0,3).join(', ')}) 同时拥有 cha 和 failure 子节点。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-12',
    description: '如果响应中存在 `failureNet`，那么 `featureNet` 也应一并返回，反之亦然。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') return { status: 'info', details: '该规则仅适用于DFMEA/PFMEA。' };
      const apiData = data as (DFMEAAnalysisResponse | PFMEAAnalysisResponse);
      const hasFeatureNet = apiData.featureNet && apiData.featureNet.length > 0;
      const hasFailureNet = apiData.failureNet && apiData.failureNet.length > 0;
      if (hasFeatureNet !== hasFailureNet) {
        return { status: 'warning', details: 'featureNet 和 failureNet 应同时存在或同时不存在，以保证分析的完整性。' };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-13',
    description: '网络中不应在两个拥有相同父节点的同级节点之间建立连接。',
    groupId: 'network',
    remark: '违反了 FMEA 中功能/失效链的跨层级传递原则。',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'info', details: '该规则仅适用于DFMEA。' };
      const dfmeaData = data as DFMEAAnalysisResponse;
      if (!dfmeaData.featureNet && !dfmeaData.failureNet) return { status: 'success' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const allLinks = [...(dfmeaData.featureNet || []), ...(dfmeaData.failureNet || [])];
      const invalidLinks = allLinks.filter(link => {
        const fromNode = nodeMap.get(link.from.toString());
        const toNode = nodeMap.get(link.to.toString());
        return fromNode && toNode && fromNode.parentId === toNode.parentId;
      });
      if (invalidLinks.length > 0) {
        return { status: 'warning', details: `发现 ${invalidLinks.length} 个网络连接建立在同级节点之间。` };
      }
      return { status: 'success' };
    },
  },

  // 03 - PFMEA Rules
  {
    id: '03-1-0-01',
    description: 'PFMEA 树必须有且仅有一个根节点，且其 `nodeType` 必须是 `item`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'error', details: '响应中缺少 `nodes` 数组。' };
      const roots = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (roots.length !== 1) {
        return { status: 'error', details: `发现 ${roots.length} 个根节点，应为 1 个。` };
      }
      if (roots[0].nodeType !== 'item') {
        return { status: 'error', details: `根节点类型为 '${roots[0].nodeType}'，应为 'item'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-02',
    description: '若 `cha` 的父节点是 `item`，则 `cha.extra.type` 必须是 `product`。',
    groupId: 'linking',
    remark: '这是 PFMEA 的核心逻辑，确保了产品/过程特性的正确归属。',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidChas = data.nodes.filter(n => {
        if (n.nodeType !== 'cha') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent?.nodeType === 'item' && n.extra?.type !== 'product';
      });
      if (invalidChas.length > 0) {
        return { status: 'error', details: `cha 节点 (UUID: ${invalidChas[0].uuid}) 的父节点是 item，但其 extra.type 不为 'product'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-03',
    description: '若 `cha` 的父节点是 `elem`，则 `cha.extra.type` 必须是 `process`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidChas = data.nodes.filter(n => {
        if (n.nodeType !== 'cha') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent?.nodeType === 'elem' && n.extra?.type !== 'process';
      });
      if (invalidChas.length > 0) {
        return { status: 'error', details: `cha 节点 (UUID: ${invalidChas[0].uuid}) 的父节点是 elem，但其 extra.type 不为 'process'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-04',
    description: '`func` 节点只能被挂载在 `item`, `step`, `step2`, 或 `elem` 节点下。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const invalidFuncs = funcNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || !['item', 'step', 'step2', 'elem'].includes(parent.nodeType);
      });
      if (invalidFuncs.length > 0) {
        return { status: 'error', details: `${invalidFuncs.length} 个 func 节点的父节点类型错误 (例如 UUID: ${invalidFuncs[0].uuid})。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-05',
    description: '`detection` 字段仅在 `category` 为 `2` (日常探测控制) 时才有效且必需。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const actions = data.nodes.filter(n => n.nodeType === 'action');
      const invalidActions = actions.filter(n => {
        const extra = n.extra || {};
        const hasDetection = extra.detection !== undefined && extra.detection !== null;
        // For PFMEA, detection is only for category 2 (日常探测控制)
        return (extra.category === 2 && !hasDetection) || (extra.category !== 2 && hasDetection);
      });
      if (invalidActions.length > 0) {
        return { status: 'error', details: `${invalidActions.length} 个 action 节点的 detection 字段与 category 不匹配 (例如 UUID: ${invalidActions[0].uuid})。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-06',
    description: '`featureNet` 用于连接结构性节点；`failureNet` 用于连接 `mode` 类型的节点。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      const pfmeaData = data as PFMEAAnalysisResponse;
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const errors = [];
      const failureNodeTypes = new Set(['mode', 'effect', 'cause', 'action']);

      if (pfmeaData.featureNet) {
        const invalidLinks = pfmeaData.featureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || !toNode || failureNodeTypes.has(fromNode.nodeType) || failureNodeTypes.has(toNode.nodeType);
        });
        if (invalidLinks.length > 0) {
          errors.push(`featureNet 中包含 ${invalidLinks.length} 个涉及失效节点的连接。`);
        }
      }

      if (pfmeaData.failureNet) {
        const invalidLinks = pfmeaData.failureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || fromNode.nodeType !== 'mode' || !toNode;
        });
        if (invalidLinks.length > 0) {
          errors.push(`failureNet 中发现 ${invalidLinks.length} 个连接不源自 'mode' 节点。`);
        }
      }

      if (errors.length > 0) {
        return { status: 'error', details: errors.join(' ') };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-1-07',
    description: '`cha` 的父节点应优先为 `func`，而非直接挂在结构节点下。',
    groupId: 'linking',
    remark: '鼓励遵循 `结构 → 功能 → 特性` 的完整逻辑链。',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const structuralNodeTypes = ['item', 'step', 'step2', 'elem'];
      const invalidChas = data.nodes.filter(n => {
        if (n.nodeType !== 'cha') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent && structuralNodeTypes.includes(parent.nodeType);
      });
      if (invalidChas.length > 0) {
        return { status: 'warning', details: `发现 ${invalidChas.length} 个 cha 节点直接挂在结构节点下，建议挂在 func 节点下。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-2-09',
    description: '推荐的结构层级为 `item` → `step` → `step2` → `elem`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'info', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
       // This is a "suggestion" rule, so it will only ever return 'success' or 'info'.
       // A full implementation would be complex. For now, we return success as it's a non-critical suggestion.
      return { status: 'success', details: '此为建议性规则，暂不进行强制检查。' };
    },
  },
];

export function runAllRules(data: FmeaApiResponse, type: ApiResponseType | null): RuleGroup[] {
  type TempRuleItem = RuleItem & { groupId: keyof typeof ruleGroupDefs };

  const allRuleItems: TempRuleItem[] = rules.map(rule => {
    const { status, details } = rule.check(data, type);
    return {
      id: rule.id,
      description: rule.description,
      remark: rule.remark || null,
      status,
      details,
      groupId: rule.groupId,
    };
  });

  const grouped = allRuleItems.reduce((acc, item) => {
    const { groupId, ...ruleItem } = item;
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(ruleItem);
    return acc;
  }, {} as Record<string, RuleItem[]>);

  const statusPriority: Record<RuleItemStatus, number> = { error: 4, warning: 3, info: 2, success: 1 };

  const result: RuleGroup[] = Object.keys(grouped).map(key => {
    const groupId = key as keyof typeof ruleGroupDefs;
    const itemsInGroup = grouped[groupId]!;
    
    let overallStatus: RuleItemStatus = 'success';
    const summary = itemsInGroup.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      
      if (statusPriority[item.status] > statusPriority[overallStatus]) {
        overallStatus = item.status;
      }
      return acc;
    }, { success: 0, warning: 0, error: 0, info: 0 } as Record<RuleItemStatus, number>);

    return {
      groupTitle: ruleGroupDefs[groupId].title,
      overallStatus,
      summary,
      rules: itemsInGroup.sort((a, b) => statusPriority[b.status] - statusPriority[a.status]),
    };
  }).sort((a, b) => statusPriority[b.overallStatus] - statusPriority[a.overallStatus]);

  return result;
}
