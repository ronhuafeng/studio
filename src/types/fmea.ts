export type ApiResponseType = 'requirements' | 'dfmea' | 'pfmea';

export interface BaseApiNode {
  uuid: number;
  parentId: number;
  nodeType: string;
  description: string;
  extra?: Record<string, any>;
}

// Requirements Analysis
export interface RequirementExtra {
  partNo?: string;
  partName?: string;
}
export interface RequirementApiNode extends BaseApiNode {
  nodeType: 'requirement' | 'func' | 'cha';
  extra?: RequirementExtra;
}
export interface RequirementAnalysisResponse {
  nodes: RequirementApiNode[];
}

// DFMEA Analysis
export interface DfmeaBaseInfo {
  name: string;
  partNo: string;
  partName: string;
  evaluationCriteria: string;
}
export interface DfmeaSystemExtra { dr?: number; }
export interface DfmeaFuncExtra { category?: number; }
export interface DfmeaFailureExtra { failureType?: number; severity?: number; occurrence?: number; }
export interface DfmeaActionExtra { category?: number; detection?: number; }

export type DfmeaNodeType = 'system' | 'subsystem' | 'component' | 'func' | 'cha' | 'failure' | 'action';

export interface DfmeaApiNode extends BaseApiNode {
  nodeType: DfmeaNodeType;
  extra?: DfmeaSystemExtra | DfmeaFuncExtra | DfmeaFailureExtra | DfmeaActionExtra | Record<string, any>;
}
export interface NetworkLink {
  from: number;
  to: number;
  type: number;
}
export interface DFMEAAnalysisResponse {
  baseInfo?: DfmeaBaseInfo;
  nodes: DfmeaApiNode[];
  featureNet?: NetworkLink[];
  failureNet?: NetworkLink[];
}

// PFMEA Analysis
export interface PfmeaBaseInfo extends DfmeaBaseInfo {}

export interface PfmeaElemExtra { em?: number; }
export interface PfmeaChaExtra { type?: 'product' | 'process' | string; } // Allow string for flexibility
export interface PfmeaEffectExtra { category?: number; severity?: number; }
export interface PfmeaCauseExtra { occurrence?: number; }
export interface PfmeaActionExtra { category?: number; detection?: number; }

export type PfmeaNodeType = 'item' | 'step' | 'step2' | 'elem' | 'func' | 'cha' | 'mode' | 'effect' | 'cause' | 'action';
export interface PfmeaApiNode extends BaseApiNode {
  nodeType: PfmeaNodeType;
  extra?: PfmeaElemExtra | PfmeaChaExtra | PfmeaEffectExtra | PfmeaCauseExtra | PfmeaActionExtra | Record<string, any>;
}
export interface PFMEAAnalysisResponse {
  baseInfo?: PfmeaBaseInfo;
  nodes: PfmeaApiNode[];
  featureNet?: NetworkLink[];
  failureNet?: NetworkLink[];
}

// Union type for any FMEA node
export type FmeaNode = RequirementApiNode | DfmeaApiNode | PfmeaApiNode;

// Union type for API responses
export type FmeaApiResponse = RequirementAnalysisResponse | DFMEAAnalysisResponse | PFMEAAnalysisResponse;

// For React Flow custom node data
export interface CustomNodeData {
  label: string;
  type: string; // nodeType from API
  originalApiNode: FmeaNode;
  color?: string; 
  icon?: React.ComponentType<{ className?: string }>;
}
