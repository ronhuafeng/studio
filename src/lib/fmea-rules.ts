
import type { FmeaApiResponse, ApiResponseType, FmeaNode } from '@/types/fmea';

export type RuleStatus = 'correct' | 'error' | 'warning' | 'info';

export interface RuleResult {
  id: string;
  description: string;
  status: RuleStatus;
  details?: string;
}

export interface FmeaRule {
  id: string;
  description: string;
  check: (data: FmeaApiResponse, type: ApiResponseType | null) => Omit<RuleResult, 'id' | 'description'>;
}

const rules: FmeaRule[] = [
  {
    id: 'unique-uuids',
    description: 'All nodes must have a unique UUID.',
    check: (data) => {
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: 'No nodes to check.' };
      }
      const uuids = new Set<string>();
      const duplicates = new Set<string>();
      data.nodes.forEach(node => {
        if (uuids.has(node.uuid)) {
          duplicates.add(node.uuid);
        }
        uuids.add(node.uuid);
      });

      if (duplicates.size > 0) {
        return { status: 'error', details: `Duplicate UUIDs found: ${Array.from(duplicates).join(', ')}` };
      }
      return { status: 'correct' };
    },
  },
  {
    id: 'valid-parent-ids',
    description: "All `parentId` references must point to an existing node's UUID (or be '-1').",
    check: (data) => {
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: 'No nodes to check.' };
      }
      const nodeUuids = new Set(data.nodes.map(n => n.uuid));
      const invalidParentIds = new Set<string>();

      data.nodes.forEach(node => {
        if (node.parentId !== '-1' && !nodeUuids.has(node.parentId)) {
          invalidParentIds.add(node.parentId);
        }
      });

      if (invalidParentIds.size > 0) {
        return { status: 'error', details: `Invalid parentIds found: ${Array.from(invalidParentIds).join(', ')}` };
      }
      return { status: 'correct' };
    },
  },
  {
    id: 'failure-has-action',
    description: 'Each `failure` node should have at least one child `action` node.',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') {
        return { status: 'info', details: 'Rule not applicable for this FMEA type.' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: 'No nodes to check.' };
      }
      
      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      if (failureNodes.length === 0) {
        return { status: 'info', details: 'No failure nodes found.' };
      }
      
      const failuresWithoutActions = failureNodes.filter(failureNode => {
        const childActions = data.nodes.filter(n => n.parentId === failureNode.uuid && n.nodeType === 'action');
        return childActions.length === 0;
      });

      if (failuresWithoutActions.length > 0) {
        const details = `Failures without actions: ${failuresWithoutActions.map(n => n.uuid).slice(0,3).join(', ')}${failuresWithoutActions.length > 3 ? '...' : ''}`;
        return { status: 'warning', details };
      }
      
      return { status: 'correct' };
    },
  },
    {
    id: 'failure-has-severity',
    description: 'For DFMEA/PFMEA, `failure` nodes should have a `severity` rating.',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') {
        return { status: 'info', details: 'Rule not applicable.' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: 'No nodes to check.' };
      }

      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      if (failureNodes.length === 0) {
        return { status: 'info', details: 'No failure nodes found.' };
      }
      
      const failuresWithoutSeverity = failureNodes.filter(node => 
        !node.extra || typeof node.extra.severity !== 'number'
      );

      if (failuresWithoutSeverity.length > 0) {
        const details = `Failures without severity: ${failuresWithoutSeverity.map(n => n.uuid).slice(0,3).join(', ')}${failuresWithoutSeverity.length > 3 ? '...' : ''}`;
        return { status: 'warning', details };
      }
      
      return { status: 'correct' };
    },
  },
  {
    id: 'system-has-func-or-cha',
    description: 'For DFMEA, `system` nodes should have at least one `func` or `cha` child.',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: 'Rule not applicable for this FMEA type.' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: 'No nodes to check.' };
      }

      const systemNodes = data.nodes.filter(n => n.nodeType === 'system');
      if (systemNodes.length === 0) {
        return { status: 'info', details: 'No system nodes found.' };
      }
      
      const parentsWithFuncOrCha = new Set<string>();
      data.nodes.forEach(node => {
          if ((node.nodeType === 'func' || node.nodeType === 'cha') && node.parentId !== '-1') {
              parentsWithFuncOrCha.add(node.parentId);
          }
      });
      
      const systemsWithoutFuncOrCha = systemNodes.filter(systemNode => {
        return !parentsWithFuncOrCha.has(systemNode.uuid);
      });

      if (systemsWithoutFuncOrCha.length > 0) {
        const details = `建议 system 也拥有功能或特性 (UUIDs: ${systemsWithoutFuncOrCha.map(n => n.uuid).join(', ')})`;
        return { status: 'warning', details };
      }
      
      return { status: 'correct' };
    },
  },
];

export function runAllRules(data: FmeaApiResponse, type: ApiResponseType | null): RuleResult[] {
  return rules.map(rule => ({
    id: rule.id,
    description: rule.description,
    ...rule.check(data, type),
  }));
}
