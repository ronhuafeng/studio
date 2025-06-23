
import type { FmeaApiResponse, ApiResponseType, FmeaNode, DFMEAAnalysisResponse, PFMEAAnalysisResponse, BaseApiNode } from '@/types/fmea';
import { parseJsonWithBigInt } from './bigint-utils';

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
  check: (responseData: FmeaApiResponse, type: ApiResponseType | null, requestData?: any) => Pick<RuleItem, 'status' | 'details'>;
}

const ruleGroupDefs = {
  jsonValidation: { title: 'JSON 格式验证' },
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
    description: '在 `scope="full_doc"` 的场景下，Agent 返回的 `nodes` 列表绝不能修改从 `modifiedStructure` 中接收到的节点的 `parentId`。',
    groupId: 'structureStability',
    remark: '这是保证用户编辑内容不被 AI 覆盖的核心规则，是系统数据一致性的基石。',
    check: (responseData, type, requestData) => {
      if (!requestData || !requestData.modifiedStructure || !Array.isArray(requestData.modifiedStructure.nodes)) {
        return { status: 'info', details: '未提供可用于比较的请求数据 (modifiedStructure)，跳过此检查。' };
      }
      if (requestData.scope !== 'full_doc') {
        return { status: 'success', details: `请求的 scope 为 "${requestData.scope}"，此规则不适用。` };
      }
      
      const requestNodes = requestData.modifiedStructure.nodes;
      const responseNodeMap = new Map(responseData.nodes.map(n => [n.uuid.toString(), n]));
      
      const modifiedNodes: string[] = [];

      for (const reqNode of requestNodes) {
        const resNode = responseNodeMap.get(reqNode.uuid.toString());
        if (resNode) {
          if (resNode.parentId.toString() !== reqNode.parentId.toString()) {
            modifiedNodes.push(reqNode.uuid.toString());
          }
        }
        // Deletion is handled by rule 00-1-0-08
      }

      if (modifiedNodes.length > 0) {
        return { status: 'error', details: `响应修改了 ${modifiedNodes.length} 个节点的 parentId。违规节点 UUID: ${modifiedNodes.join(', ')}` };
      }
      
      return { status: 'success' };
    },
  },
  {
    id: '00-1-0-08',
    description: 'Agent 只能在现有结构上添加新节点。',
    groupId: 'structureStability',
    remark: '这意味着 Agent 不能从 modifiedStructure 中删除任何节点。',
    check: (responseData, type, requestData) => {
      if (!requestData || !requestData.modifiedStructure || !Array.isArray(requestData.modifiedStructure.nodes)) {
        return { status: 'info', details: '未提供可用于比较的请求数据 (modifiedStructure)，跳过此检查。' };
      }
      if (requestData.scope !== 'full_doc') {
        return { status: 'success', details: `请求的 scope 为 "${requestData.scope}"，此规则不适用。` };
      }
      
      const requestNodeUuids = new Set(requestData.modifiedStructure.nodes.map((n: FmeaNode) => n.uuid.toString()));
      const responseNodeUuids = new Set(responseData.nodes.map(n => n.uuid.toString()));
      
      const deletedUuids: string[] = [];
      requestNodeUuids.forEach(uuid => {
        if (!responseNodeUuids.has(uuid)) {
          deletedUuids.push(uuid);
        }
      });
      
      if (deletedUuids.length > 0) {
        return { status: 'error', details: `响应删除了 ${deletedUuids.length} 个在请求中存在的节点。被删除的节点 UUID: ${deletedUuids.join(', ')}` };
      }

      return { status: 'success' };
    },
  },
  {
    id: '00-1-1-10',
    description: '(需求分析特定) 响应中 `nodes` 数组的长度上限为 100。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'requirements') return { status: 'success', details: '该规则仅适用于需求分析。' };
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
      if (type !== 'requirements') return { status: 'success', details: '该规则仅适用于需求分析。' };
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
      if (type !== 'requirements') return { status: 'success', details: '该规则仅适用于需求分析。' };
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
      if (type !== 'requirements') return { status: 'success', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const chaNodesWithChildren = data.nodes.filter(n => n.nodeType === 'cha' && data.nodes.some(child => child.parentId === n.uuid));
      if (chaNodesWithChildren.length > 0) {
        const uuids = chaNodesWithChildren.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${chaNodesWithChildren.length} 个 'cha' 节点拥有子节点。违规 cha 节点 UUID: ${uuids}` };
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
      if (type !== 'requirements') return { status: 'success', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const roots = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (roots.length !== 1) return { status: 'info', details: '无法确定唯一根节点，跳过此检查。' };
      const root = roots[0];
      const directChildren = data.nodes.filter(n => n.parentId === root.uuid);
      const invalidChildren = directChildren.filter(c => c.nodeType === 'func' || c.nodeType === 'cha');
      if (invalidChildren.length > 0) {
        const uuids = invalidChildren.map(n => `${n.uuid}(${n.nodeType})`).join(', ');
        return { status: 'warning', details: `根节点下不应直接挂载 func 或 cha 节点。发现 ${invalidChildren.length} 个违规节点: ${uuids}` };
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
      if (type !== 'requirements') return { status: 'success', details: '该规则仅适用于需求分析。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const parentFuncs = data.nodes.filter(n => n.nodeType === 'func' && data.nodes.some(child => child.parentId === n.uuid && child.nodeType === 'func'));

      if (parentFuncs.length > 0) {
        const uuids = parentFuncs.map(n => n.uuid.toString()).join(', ');
        return { status: 'warning', details: `func 节点不应有 func 子节点。发现 ${parentFuncs.length} 个违规的父节点 UUID: ${uuids}` };
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
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
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
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const systemRoot = data.nodes.find(n => n.parentId.toString() === '-1' && n.nodeType === 'system');
      if (!systemRoot) return { status: 'info', details: '未找到 system 根节点，跳过此检查。' };
      const directSubsystems = data.nodes.filter(n => n.parentId === systemRoot.uuid && n.nodeType === 'subsystem');
      if (directSubsystems.length !== 1) {
        let details = `system 根节点 (UUID: ${systemRoot.uuid}) 下发现 ${directSubsystems.length} 个 subsystem 直接子节点，应为 1 个。`;
        if (directSubsystems.length > 1) {
          details += ` 节点 UUIDs: ${directSubsystems.map(n => n.uuid).join(', ')}`;
        }
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-03',
    description: '所有在 `subsystem` 节点之下的结构性节点，其类型必须是 `component`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      
      const parentMap = new Map<string, BaseApiNode[]>();
      data.nodes.forEach(n => {
        const parentId = n.parentId.toString();
        if (!parentMap.has(parentId)) parentMap.set(parentId, []);
        parentMap.get(parentId)!.push(n);
      });

      const getAllDescendants = (nodeId: bigint): BaseApiNode[] => {
          const children = parentMap.get(nodeId.toString()) || [];
          let descendants = [...children];
          children.forEach(child => {
              descendants = [...descendants, ...getAllDescendants(child.uuid)];
          });
          return descendants;
      };

      const structuralTypes = ['system', 'subsystem', 'component'];
      const subsystemNodes = data.nodes.filter(n => n.nodeType === 'subsystem');
      const invalidNodes: BaseApiNode[] = [];

      subsystemNodes.forEach(subsystem => {
          const descendants = getAllDescendants(subsystem.uuid);
          descendants.forEach(descendant => {
              if (structuralTypes.includes(descendant.nodeType) && descendant.nodeType !== 'component') {
                  invalidNodes.push(descendant);
              }
          });
      });
      
      if (invalidNodes.length > 0) {
        const uuids = invalidNodes.map(n => `${n.uuid}(${n.nodeType})`).join(', ');
        return { status: 'error', details: `subsystem 节点下发现 ${invalidNodes.length} 个非 component 类型的结构性后代节点。违规节点 (UUID/类型): ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-04',
    description: '`func` (功能) 节点只能被挂载在 `system`、`subsystem` 或 `component` 节点下。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const invalidFuncs = funcNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || !['system', 'subsystem', 'component'].includes(parent.nodeType);
      });
      if (invalidFuncs.length > 0) {
        const uuids = invalidFuncs.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidFuncs.length} 个 func 节点的父节点类型错误。违规 func 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-05',
    description: '`cha` (特性) 的父节点必须是 `func`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      const invalidChas = chaNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || parent.nodeType !== 'func';
      });
      if (invalidChas.length > 0) {
        const uuids = invalidChas.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidChas.length} 个 cha 节点的父节点类型不为 'func'。违规 cha 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-06',
    description: '`failure` (失效) 的父节点必须是 `func` 或 `cha`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      const invalidFailures = failureNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || !['func', 'cha'].includes(parent.nodeType);
      });
      if (invalidFailures.length > 0) {
        const uuids = invalidFailures.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidFailures.length} 个 failure 节点的父节点类型错误。违规 failure 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-07',
    description: '`detection` 字段仅在 `category` 为 `2` (日常探测控制) 时才有效且必需。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const actions = data.nodes.filter(n => n.nodeType === 'action');
      const invalidActions = actions.filter(n => {
        const extra = n.extra || {};
        const hasDetection = extra.detection !== undefined && extra.detection !== null;
        return (extra.category === 2 && !hasDetection) || (extra.category !== 2 && hasDetection);
      });
      if (invalidActions.length > 0) {
        const uuids = invalidActions.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidActions.length} 个 action 节点的 detection 字段与 category 不匹配。违规 action 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-14',
    description: 'DFMEA 的 Action 的 Extra 的 category 只能是 1 或者 2。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const actions = data.nodes.filter(n => n.nodeType === 'action');
      const invalidActions = actions.filter(n => {
        const category = n.extra?.category;
        return category !== 1 && category !== 2;
      });
      if (invalidActions.length > 0) {
        const uuids = invalidActions.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidActions.length} 个 action 节点的 category 值无效 (必须是 1 或 2)。违规 action 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-08',
    description: '`featureNet` 用于连接 `func` 类型的节点；`failureNet` 用于连接 `failure` 类型的节点。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const dfmeaData = data as DFMEAAnalysisResponse;
      const errors = [];
      if (dfmeaData.featureNet) {
        const invalidLinks = dfmeaData.featureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || fromNode.nodeType !== 'func' || !toNode || toNode.nodeType !== 'func';
        });
        if (invalidLinks.length > 0) {
          const linkDetails = invalidLinks.map(l => `${l.from}->${l.to}`).join('; ');
          errors.push(`featureNet 中包含 ${invalidLinks.length} 个非 func 节点间的连接: ${linkDetails}`);
        }
      }
      if (dfmeaData.failureNet) {
        const invalidLinks = dfmeaData.failureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || fromNode.nodeType !== 'failure' || !toNode || toNode.nodeType !== 'failure';
        });
        if (invalidLinks.length > 0) {
          const linkDetails = invalidLinks.map(l => `${l.from}->${l.to}`).join('; ');
          errors.push(`failureNet 中包含 ${invalidLinks.length} 个非 failure 节点间的连接: ${linkDetails}`);
        }
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
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      const dfmeaData = data as DFMEAAnalysisResponse;
      if (!dfmeaData.interface) return { status: 'success' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidInterfaces = dfmeaData.interface.filter(i => {
        const startNode = nodeMap.get(i.startId.toString());
        const endNode = nodeMap.get(i.endId.toString());
        return !startNode || startNode.nodeType !== 'component' || !endNode || endNode.nodeType !== 'component';
      });
      if (invalidInterfaces.length > 0) {
        const details = invalidInterfaces.map(i => `${i.startId}->${i.endId}`).join('; ');
        return { status: 'error', details: `发现 ${invalidInterfaces.length} 个 interface 未在 component 节点之间建立。违规连接: ${details}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-10',
    description: '`interface` 的 `structureId` 必须是 `startId` 和 `endId` 的共同父节点的 `uuid`。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
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
        const details = invalidInterfaces.map(i => `(structureId: ${i.structureId}, startId: ${i.startId}, endId: ${i.endId})`).join('; ');
        return { status: 'error', details: `发现 ${invalidInterfaces.length} 个 interface 的 structureId 与 start/end 节点的父ID不匹配。违规项: ${details}` };
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
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const invalidFuncs = funcNodes.filter(f => {
        const children = data.nodes.filter(c => c.parentId === f.uuid);
        const hasCha = children.some(c => c.nodeType === 'cha');
        const hasFailure = children.some(c => c.nodeType === 'failure');
        return hasCha && hasFailure;
      });
      if (invalidFuncs.length > 0) {
        const uuids = invalidFuncs.map(n => n.uuid.toString()).join(', ');
        return { status: 'warning', details: `func 节点同时拥有 cha 和 failure 子节点。违规 func 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-12',
    description: '如果响应中存在 `failureNet`，那么 `featureNet` 也应一并返回，反之亦然。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') return { status: 'success', details: '该规则仅适用于DFMEA/PFMEA。' };
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
      if (type !== 'dfmea') return { status: 'success', details: '该规则仅适用于DFMEA。' };
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
        const details = invalidLinks.map(l => `${l.from}->${l.to}`).join('; ');
        return { status: 'warning', details: `发现 ${invalidLinks.length} 个网络连接建立在同级节点之间。违规连接: ${details}` };
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
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
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
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidChas = data.nodes.filter(n => {
        if (n.nodeType !== 'cha') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent?.nodeType === 'item' && n.extra?.type !== 'product';
      });
      if (invalidChas.length > 0) {
        const uuids = invalidChas.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `cha 节点的父节点是 item，但其 extra.type 不为 'product'。违规 cha 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-03',
    description: '若 `cha` 的父节点是 `elem`，则 `cha.extra.type` 必须是 `process`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const invalidChas = data.nodes.filter(n => {
        if (n.nodeType !== 'cha') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent?.nodeType === 'elem' && n.extra?.type !== 'process';
      });
      if (invalidChas.length > 0) {
        const uuids = invalidChas.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `cha 节点的父节点是 elem，但其 extra.type 不为 'process'。违规 cha 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-04',
    description: '`func` 节点只能被挂载在 `item`, `step`, `step2`, 或 `elem` 节点下。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const invalidFuncs = funcNodes.filter(n => {
        const parent = nodeMap.get(n.parentId.toString());
        return !parent || !['item', 'step', 'step2', 'elem'].includes(parent.nodeType);
      });
      if (invalidFuncs.length > 0) {
        const uuids = invalidFuncs.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidFuncs.length} 个 func 节点的父节点类型错误。违规 func 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-05',
    description: '`detection` 字段仅在 `category` 为 `2` (日常探测控制) 时才有效且必需。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const actions = data.nodes.filter(n => n.nodeType === 'action');
      const invalidActions = actions.filter(n => {
        const extra = n.extra || {};
        const hasDetection = extra.detection !== undefined && extra.detection !== null;
        // For PFMEA, detection is only for category 2 (日常探测控制)
        return (extra.category === 2 && !hasDetection) || (extra.category !== 2 && hasDetection);
      });
      if (invalidActions.length > 0) {
        const uuids = invalidActions.map(n => n.uuid.toString()).join(', ');
        return { status: 'error', details: `发现 ${invalidActions.length} 个 action 节点的 detection 字段与 category 不匹配。违规 action 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-06',
    description: '`featureNet` 用于连接结构性节点；`failureNet` 用于连接 `mode` 类型的节点。',
    groupId: 'network',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      const pfmeaData = data as PFMEAAnalysisResponse;
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const errors = [];
      const structuralNodeTypes = new Set(['item', 'step', 'step2', 'elem', 'func', 'cha']);

      if (pfmeaData.featureNet) {
        const invalidLinks = pfmeaData.featureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          return !fromNode || !toNode || !structuralNodeTypes.has(fromNode.nodeType) || !structuralNodeTypes.has(toNode.nodeType);
        });
        if (invalidLinks.length > 0) {
          const linkDetails = invalidLinks.map(l => `${l.from}(${nodeMap.get(l.from.toString())?.nodeType})->${l.to}(${nodeMap.get(l.to.toString())?.nodeType})`).join('; ');
          errors.push(`featureNet 中包含 ${invalidLinks.length} 个非结构性节点间的连接: ${linkDetails}`);
        }
      }

      if (pfmeaData.failureNet) {
        const invalidLinks = pfmeaData.failureNet.filter(link => {
          const fromNode = nodeMap.get(link.from.toString());
          const toNode = nodeMap.get(link.to.toString());
          // In PFMEA, failureNet connects 'mode', 'effect', 'cause'
          const failureTypes = ['mode', 'effect', 'cause'];
          return !fromNode || !toNode || !failureTypes.includes(fromNode.nodeType) || !failureTypes.includes(toNode.nodeType);
        });
        if (invalidLinks.length > 0) {
          const linkDetails = invalidLinks.map(l => `${l.from}(${nodeMap.get(l.from.toString())?.nodeType})->${l.to}(${nodeMap.get(l.to.toString())?.nodeType})`).join('; ');
          errors.push(`failureNet 中 ${invalidLinks.length} 个连接不完全在失效节点（mode, effect, cause）之间: ${linkDetails}`);
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
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      const nodeMap = new Map(data.nodes.map(n => [n.uuid.toString(), n]));
      const structuralNodeTypes = ['item', 'step', 'step2', 'elem'];
      const invalidChas = data.nodes.filter(n => {
        if (n.nodeType !== 'cha') return false;
        const parent = nodeMap.get(n.parentId.toString());
        return parent && structuralNodeTypes.includes(parent.nodeType);
      });
      if (invalidChas.length > 0) {
        const uuids = invalidChas.map(n => n.uuid.toString()).join(', ');
        return { status: 'warning', details: `发现 ${invalidChas.length} 个 cha 节点直接挂在结构节点下，建议挂在 func 节点下。违规 cha 节点 UUID: ${uuids}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-2-09',
    description: '推荐的结构层级为 `item` → `step` → `step2` → `elem`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'pfmea') return { status: 'success', details: '该规则仅适用于PFMEA。' };
      if (!data.nodes) return { status: 'info', details: '无节点可供检查。' };
      return { status: 'success', details: '此为建议性规则，暂不进行强制检查。' };
    },
  },
];

export function runAllRules(fmeaJson: string, type: ApiResponseType | null, requestJson?: string): RuleGroup[] {
  let responseData: FmeaApiResponse;
  let requestData: any | undefined;

  try {
    responseData = parseJsonWithBigInt(fmeaJson);
  } catch (error) {
    return [{
      groupTitle: ruleGroupDefs.jsonValidation.title,
      overallStatus: 'error',
      summary: { error: 1 },
      rules: [{
        id: '00-1-0-09',
        description: '响应必须是结构完整的 JSON 对象。',
        status: 'error',
        details: `JSON 解析失败: ${(error as Error).message}`,
        remark: '格式错误将导致整个响应无法被平台解析。',
      }]
    }];
  }
  
  if (requestJson) {
    try {
      requestData = parseJsonWithBigInt(requestJson);
    } catch (e) {
      console.warn("Could not parse request payload JSON for rule validation:", e);
      requestData = undefined;
    }
  }


  type TempRuleItem = RuleItem & { groupId: keyof typeof ruleGroupDefs };

  const allRuleItems: TempRuleItem[] = rules.map(rule => {
    const { status, details } = rule.check(responseData, type, requestData);
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
      // Don't count 'info' in the summary totals shown in the header
      if (item.status !== 'info') {
        acc[item.status] = (acc[item.status] || 0) + 1;
      }
      
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
