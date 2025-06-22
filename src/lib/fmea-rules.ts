
import type { FmeaApiResponse, ApiResponseType, FmeaNode } from '@/types/fmea';

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
  groupId: 'structure' | 'linking' | 'completeness';
  remark?: string;
  check: (data: FmeaApiResponse, type: ApiResponseType | null) => Pick<RuleItem, 'status' | 'details'>;
}

const ruleGroupDefs = {
  structure: { title: '结构骨架约束' },
  linking: { title: '元素挂载与层级约束' },
  completeness: { title: '完整性与必填项约束' },
};

const rules: FmeaRule[] = [
  {
    id: '02-1-0-01',
    description: '必须有且仅有一个 `system` 类型的根节点。',
    groupId: 'structure',
    check: (data, type) => {
       if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const systemNodes = data.nodes.filter(n => n.nodeType === 'system');
      if (systemNodes.length !== 1) {
        return { status: 'error', details: `失败详情：发现 ${systemNodes.length} 个 system 节点，应为 1 个。` };
      }
      if (systemNodes[0].parentId.toString() !== '-1') {
        return { status: 'error', details: `失败详情：system 节点 (UUID: ${systemNodes[0].uuid}) 不是根节点。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-02',
    description: '`system` 根节点下有且仅有一个 `subsystem` 类型的直接子节点。',
    remark: '此规则严格对齐 AIAG-VDA FMEA 方法论中的“结构分析”步骤，确保了分析的规范性。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const systemNodes = data.nodes.filter(n => n.nodeType === 'system' && n.parentId.toString() === '-1');
      if (systemNodes.length !== 1) {
        return { status: 'info', details: '无法确定唯一的 system 根节点。' };
      }
      const systemNode = systemNodes[0];
      const directSubsystems = data.nodes.filter(n => n.parentId === systemNode.uuid && n.nodeType === 'subsystem');

      if (directSubsystems.length !== 1) {
        return { status: 'error', details: `失败详情：system 节点 (UUID: ${systemNode.uuid}) 下发现 ${directSubsystems.length} 个 subsystem 子节点，应为 1 个。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-03',
    description: '所有节点必须拥有唯一的 UUID。',
    groupId: 'structure',
    check: (data) => {
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const uuids = new Set<string>();
      const duplicates = new Set<string>();
      data.nodes.forEach(node => {
        const uuidStr = node.uuid.toString();
        if (uuids.has(uuidStr)) {
          duplicates.add(uuidStr);
        }
        uuids.add(uuidStr);
      });

      if (duplicates.size > 0) {
        return { status: 'error', details: `失败详情：发现重复的 UUID: ${Array.from(duplicates).join(', ')}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-04',
    description: "所有 `parentId` 必须指向一个存在的节点或为 '-1'。",
    groupId: 'structure',
    check: (data) => {
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const nodeUuids = new Set(data.nodes.map(n => n.uuid.toString()));
      const invalidParentIds = new Set<string>();

      data.nodes.forEach(node => {
        const parentIdStr = node.parentId.toString();
        if (parentIdStr !== '-1' && !nodeUuids.has(parentIdStr)) {
          invalidParentIds.add(parentIdStr);
        }
      });

      if (invalidParentIds.size > 0) {
        return { status: 'error', details: `失败详情：发现无效的 parentId: ${Array.from(invalidParentIds).join(', ')}` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-01',
    description: '每个 `failure` 节点应至少有一个 `action` 子节点。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA/PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      
      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      if (failureNodes.length === 0) {
        return { status: 'info', details: '未发现 failure 节点。' };
      }
      
      const failuresWithoutActions = failureNodes.filter(failureNode => {
        const childActions = data.nodes.filter(n => n.parentId === failureNode.uuid && n.nodeType === 'action');
        return childActions.length === 0;
      });

      if (failuresWithoutActions.length > 0) {
        const details = `警告详情：发现 ${failuresWithoutActions.length} 个 failure 节点缺少 action 子节点 (UUIDs: ${failuresWithoutActions.map(n => n.uuid.toString()).slice(0,3).join(', ')}${failuresWithoutActions.length > 3 ? '...' : ''})。`;
        return { status: 'warning', details };
      }
      
      return { status: 'success' };
    },
  },
  {
    id: '02-1-2-01',
    description: 'DFMEA/PFMEA 中的 `failure` 节点应有 `severity` 评级。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA/PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }

      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      if (failureNodes.length === 0) {
        return { status: 'info', details: '未发现 failure 节点。' };
      }
      
      const failuresWithoutSeverity = failureNodes.filter(node => 
        !node.extra || typeof node.extra.severity !== 'number'
      );

      if (failuresWithoutSeverity.length > 0) {
        const details = `警告详情：发现 ${failuresWithoutSeverity.length} 个 failure 节点缺少 severity 评级 (UUIDs: ${failuresWithoutSeverity.map(n => n.uuid.toString()).slice(0,3).join(', ')}${failuresWithoutSeverity.length > 3 ? '...' : ''})。`;
        return { status: 'warning', details };
      }
      
      return { status: 'success' };
    },
  },
];

export function runAllRules(data: FmeaApiResponse, type: ApiResponseType | null): RuleGroup[] {
  type TempRuleItem = RuleItem & { groupId: string };

  const allRuleItems: TempRuleItem[] = rules.map(rule => {
    const { status, details } = rule.check(data, type);
    return {
      id: rule.id,
      description: rule.description,
      remark: rule.remark || null,
      status,
      details,
      groupId: rule.groupId, // temporary property to help with grouping
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

  const result: RuleGroup[] = Object.keys(grouped).map(groupId => {
    const itemsInGroup = grouped[groupId]!;
    
    let overallStatus: RuleItemStatus = 'success';
    const summary = itemsInGroup.reduce((acc, item) => {
      const currentStatus = item.status === 'info' ? 'success' : item.status;
      acc[currentStatus] = (acc[currentStatus] || 0) + 1;
      
      if (statusPriority[item.status] > statusPriority[overallStatus]) {
        overallStatus = item.status;
      }
      return acc;
    }, { success: 0, warning: 0, error: 0 } as Record<'success' | 'warning' | 'error', number>);

    return {
      groupTitle: ruleGroupDefs[groupId as keyof typeof ruleGroupDefs].title,
      overallStatus,
      summary,
      rules: itemsInGroup,
    };
  });

  return result;
}
