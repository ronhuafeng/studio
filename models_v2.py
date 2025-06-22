import warnings
import json
from pydantic import BaseModel, Field, ConfigDict, model_validator, HttpUrl
from pydantic.aliases import AliasChoices, AliasPath
from typing import Any, Dict, List, Literal, Optional, Union, Annotated, TypeVar, Generic

# ==============================================================================
# 1. 基础工具和可重用组件
# ==============================================================================

class WarnOnExtraModel(BaseModel):
    """
    【策略1】用于顶层模型。它会忽略未定义的字段，但会为此发出警告。
    这个版本修复了对 Pydantic 别名（alias）的处理，并且完全对类型检查器友好。
    """
    model_config = ConfigDict(extra='allow', use_enum_values=True)

    @model_validator(mode='before')
    @classmethod
    def _warn_and_strip_extra_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # 构建一个包含字段名及其所有可能别名的集合
        allowed_keys: set[str] = set(cls.model_fields.keys())
        
        for field_info in cls.model_fields.values():
            # 1. 处理 'alias' (简单字符串)
            if field_info.alias:
                allowed_keys.add(field_info.alias)
            
            # 2. 处理更复杂的 'validation_alias'
            if field_info.validation_alias:
                va = field_info.validation_alias
                
                if isinstance(va, str):
                    allowed_keys.add(va)
                elif isinstance(va, AliasPath):
                    # 如果 validation_alias 本身就是一个 AliasPath
                    if va.path and isinstance(va.path[0], str):
                        allowed_keys.add(va.path[0])
                elif isinstance(va, AliasChoices):
                    # 遍历 choices 列表，因为其元素可以是 str 或 AliasPath
                    for choice in va.choices:
                        if isinstance(choice, str):
                            allowed_keys.add(choice)
                        elif isinstance(choice, AliasPath):
                            # 对于顶层键检查，只关心路径的第一个部分
                            if choice.path and isinstance(choice.path[0], str):
                                allowed_keys.add(choice.path[0])

        # 找出真正未定义的字段
        extra_keys = set(data.keys()) - allowed_keys
        
        if extra_keys:
            warnings.warn(
                f"在 '{cls.__name__}' 模型中发现并忽略了未定义的字段: {sorted(list(extra_keys))}",
                UserWarning
            )
            # 只移除真正未定义的字段
            return {key: value for key, value in data.items() if key not in extra_keys}
            
        return data


# 【新模型】为 'extra' 对象创建的新基类
class ExtraDataModel(BaseModel):
    """
    【策略2】用于 'extra' 对象。它允许并保留所有未定义的字段。
    """
    model_config = ConfigDict(extra='allow')


class SessionableRequest(WarnOnExtraModel):
    sessionId: str
    documentIds: Optional[List[str]] = None

class NetworkLink(WarnOnExtraModel):
    from_id: int = Field(..., alias='from')
    to_id: int = Field(..., alias='to')
    type: Literal[1, 2] # 1:左连, 2:右连

AllNodeTypes = Literal[
    "action",    # 措施
    "cause",     # 失效原因
    "cha",       # 特性
    "component", # 组件
    "effect",    # 失效影响
    "elem",      # 过程工作要素
    "failure",   # 失效
    "func",      # 功能
    "item",      # 产品过程项/过程项目
    "mode",      # 失效模式
    "requirement", # 需求
    "step",      # 过程步骤
    "step2",     # 子过程步骤
    "subsystem", # 子系统
    "system"     # 系统
]

# 1. 创建一个类型变量，并用 bound 约束其必须是 AllNodeTypes 的子类型
T_NodeType = TypeVar("T_NodeType", bound=AllNodeTypes)
T_Extra = TypeVar("T_Extra") # extra 类型可以是任何东西，所以不加 bound


class BaseAnalysisNode(WarnOnExtraModel, Generic[T_NodeType, T_Extra]): # 顶层模型，使用策略1
    uuid: int
    parentId: int
    nodeType: T_NodeType
    description: str
    extra: T_Extra

# ==============================================================================
# 2. 文档上传模型 (/documents/upload)
# ==============================================================================
class DocumentUploadRequest(SessionableRequest):
    urls: List[HttpUrl]

class DocumentUploadResponse(WarnOnExtraModel):
    documentId: str
    fileName: str
    uploadTime: str
# ==============================================================================
# 3. 通用分析模型
# ==============================================================================
class BaseAnalysisRequest(SessionableRequest):
    scope: Literal["structure_only", "full_doc"]
    nodes: Optional[List[Dict[str, int]]] = None
    extraPayload: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def _validate_nodes_format(cls, data: Any):
        if isinstance(data, dict) and 'nodes' in data and data['nodes'] is not None:
            for node_ref in data['nodes']:
                if not (isinstance(node_ref, dict) and 'uuid' in node_ref and isinstance(node_ref['uuid'], int)):
                    raise ValueError('每个 "nodes" 项必须是包含整数 "uuid" 键的字典')
        return data
# ==============================================================================
# 4. 需求分析模型 (/analysis/requirements)
# ==============================================================================
class RequirementNodeExtra(ExtraDataModel):
    partNo: Optional[str] = None
    partName: Optional[str] = None

class RequirementNodeType(BaseAnalysisNode[Literal["requirement"], RequirementNodeExtra]):
    nodeType: Literal["requirement"] = "requirement"
    extra: RequirementNodeExtra = Field(default_factory=RequirementNodeExtra)

class FunctionNodeReqType(BaseAnalysisNode[Literal["func"], ExtraDataModel]):
    nodeType: Literal["func"] = "func"
    extra: ExtraDataModel = Field(default_factory=ExtraDataModel)

class CharacteristicNodeReqType(BaseAnalysisNode[Literal["cha"], ExtraDataModel]):
    nodeType: Literal["cha"] = "cha"
    extra: ExtraDataModel = Field(default_factory=ExtraDataModel)

RequirementAnalysisNode = Union[RequirementNodeType, FunctionNodeReqType, CharacteristicNodeReqType]

class ModifiedRequirementsStructure(WarnOnExtraModel):
    nodes: List[Annotated[RequirementAnalysisNode, Field(discriminator='nodeType')]]

class RequirementsAnalysisRequest(BaseAnalysisRequest):
    modifiedStructure: Optional[ModifiedRequirementsStructure] = None

class RequirementAnalysisResponse(WarnOnExtraModel):
    nodes: List[Annotated[RequirementAnalysisNode, Field(discriminator='nodeType')]]

# ==============================================================================
# 5. DFMEA 分析模型 (/analysis/dfmea)
# ==============================================================================
class DFMEABaseInfo(WarnOnExtraModel):
    name: str
    partNo: str
    partName: str
    evaluationCriteria: str

class DFMEAInterface(WarnOnExtraModel):
    structureId: int
    startId: int
    endId: int
    type: Literal[1, 2, 3, 4, 5, 6] # 1-物理连接, 2-能力传递, 3-物理间隙, 4-物料交换, 5-人-机, 6-信息传递
    interaction: Literal[0, 1] # 0-单向, 1-双向
    effect: Literal[0, 1] # 0-积极/有用, 1-消极/有害
    description: str
    virtualParts: str

class DFMEAComponentExtra(ExtraDataModel):
    dr: Optional[Literal[0, 1]] = 0 # 0-公司内部(默认), 1-公司外部

class DFMEAFunctionExtra(ExtraDataModel):
    category: Optional[Literal[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]] = 0

class DFMEACharacteristicExtra(ExtraDataModel):
    req_spe: Optional[str] = None               # 要求/规格 (Requirements/Specification 对外显示)
    spe_tol: Optional[str] = None               # 规格/公差（Specification/Tolerance 对内显示）
    classification: Optional[str] = 'QCC'       # 特性分类


class DFMEAFailureExtra(ExtraDataModel):
    failureType: Optional[Literal[0, 1, 2]] = 0                     # 0-未分类(默认), 1-功能失效, 2-设计错误
    severity: Optional[int] = Field(default=None, ge=1, le=10)
    occurrence: Optional[int] = Field(default=None, ge=1, le=10)

class DFMEAActionExtra(ExtraDataModel):
    category: Literal[1, 2] = 1                                     # 1-日常预防控制, 2-日常探测控制
    detection: Optional[int] = Field(default=None, ge=1, le=10)     # detection only exist if category is 2

    

class DFMEAComponentNode(BaseAnalysisNode[Literal["system", "subsystem", "component"], DFMEAComponentExtra]):
    nodeType: Literal["system", "subsystem", "component"]
    extra: DFMEAComponentExtra = Field(default_factory=DFMEAComponentExtra)

class DFMEAFunctionNode(BaseAnalysisNode[Literal["func"], DFMEAFunctionExtra]):
    nodeType: Literal["func"]
    extra: DFMEAFunctionExtra = Field(default_factory=DFMEAFunctionExtra)

class DFMEACharacteristicNode(BaseAnalysisNode[Literal["cha"], DFMEACharacteristicExtra]):
    nodeType: Literal["cha"]
    extra: DFMEACharacteristicExtra

class DFMEAFailureNode(BaseAnalysisNode[Literal["failure"], DFMEAFailureExtra]):
    nodeType: Literal["failure"]
    extra: DFMEAFailureExtra = Field(default_factory=DFMEAFailureExtra)

class DFMEAActionNode(BaseAnalysisNode[Literal["action"], DFMEAActionExtra]):
    nodeType: Literal["action"]
    extra: DFMEAActionExtra

DFMEAAnalysisNode = Union[DFMEAComponentNode, DFMEAFunctionNode, DFMEACharacteristicNode, DFMEAFailureNode, DFMEAActionNode]

class ModifiedDFMEAStructure(WarnOnExtraModel):
    baseInfo: Optional[DFMEABaseInfo] = None
    nodes: List[Annotated[DFMEAAnalysisNode, Field(discriminator='nodeType')]]

class DFMEAAnalysisRequest(BaseAnalysisRequest):
    modifiedStructure: Optional[ModifiedDFMEAStructure] = None

class DFMEAAnalysisResponse(WarnOnExtraModel):
    baseInfo: DFMEABaseInfo
    nodes: List[Annotated[DFMEAAnalysisNode, Field(discriminator='nodeType')]]
    featureNet: Optional[List[NetworkLink]] = None
    failureNet: Optional[List[NetworkLink]] = None
    interface: Optional[List[DFMEAInterface]] = None

# ==============================================================================
# 6. PFMEA 分析模型 (/analysis/pfmea)
# ==============================================================================
class PFMEABaseInfo(WarnOnExtraModel):
    name: str
    partNo: str
    partName: str
    # TODO: 确认是否需要这个字段
    processName: Optional[str] = None # 仍然不确定
    evaluationCriteria: str

class PFMEAStepExtra(ExtraDataModel):
    keyProcess: Optional[bool] = None # 是否关键工序
    preSteps: Optional[List[int]] = None # 上一个步骤ID数组，可以有多个上一步，如：[123, 456]
    category: Optional[Literal[1, 2, 3, 4, 5, 11, 12, 13, 14]] = 1 # 操作分类：1-加工，2-搬运，3-存取，4-返工，5-报废/隔离，11-目视检验，12-手动检验，13-自动检验，14-质量稽核，默认为1

# --- 完善: 使用 Literal 约束 category ---
class PFMEAStep2Extra(ExtraDataModel):
    preSteps: Optional[List[int]] = None
    category: Optional[Literal[1, 2, 3, 4, 5, 11, 12, 13, 14]] = 1  # 操作分类：1-加工，2-搬运，3-存取，4-返工，5-报废/隔离，11-目视检验，12-手动检验，13-自动检验，14-质量稽核，默认为1

class PFMEAElementExtra(ExtraDataModel):
    em: Literal[1, 2, 3, 4, 5, 6] # 1-人, 2-机器, 3-物料, 4-环境, 5-方法, 6-测量

class PFMEACharacteristicExtra(ExtraDataModel):
    type: Literal["product", "process"]         # 特性类型，product-产品特性，process-过程特性
    req_spe: Optional[str] = None               # 要求/规格 (Requirements/Specification 对外显示)
    spe_tol: Optional[str] = None               # 规格/公差（Specification/Tolerance 对内显示）
    classification: Optional[str] = 'QCC'       # 特性分类

class PFMEAEffectExtra(ExtraDataModel):
    severity: Optional[int] = Field(default=None, ge=1, le=10)      # 严重度： 1-10
    category: Optional[Literal[1, 2, 3]] = None                       # 1-厂内, 2-直接发运工厂, 3-最终用户

class PFMEACauseExtra(ExtraDataModel):
    occurrence: Optional[int] = Field(default=None, ge=1, le=10)    # 发生度： 1-10

class PFMEAActionExtra(ExtraDataModel):
    detection: Optional[int] = Field(default=None, ge=1, le=10)     # 探测度 1-10
    category: Literal[1, 2, 3] = 1                                  # 1-日常预防控制, 2-日常探测控制, 3-设计更改

class PFMEAItemNode(BaseAnalysisNode[Literal["item"], ExtraDataModel]):
    nodeType: Literal["item"]
    extra: ExtraDataModel = Field(default_factory=ExtraDataModel)

class PFMEAStepNode(BaseAnalysisNode[Literal["step"], PFMEAStepExtra]):
    nodeType: Literal["step"]
    extra: PFMEAStepExtra = Field(default_factory=PFMEAStepExtra)

class PFMEAStep2Node(BaseAnalysisNode[Literal["step2"], PFMEAStep2Extra]):
    nodeType: Literal["step2"]
    extra: PFMEAStep2Extra = Field(default_factory=PFMEAStep2Extra)

class PFMEAElementNode(BaseAnalysisNode[Literal["elem"], PFMEAElementExtra]):
    nodeType: Literal["elem"]
    extra: PFMEAElementExtra

class PFMEAFunctionNode(BaseAnalysisNode[Literal["func"], ExtraDataModel]):
    nodeType: Literal["func"]
    extra: ExtraDataModel = Field(default_factory=ExtraDataModel)

class PFMEACharacteristicNode(BaseAnalysisNode[Literal["cha"], PFMEACharacteristicExtra]):
    nodeType: Literal["cha"]
    extra: PFMEACharacteristicExtra

class PFMEAModeNode(BaseAnalysisNode[Literal["mode"], ExtraDataModel]):
    nodeType: Literal["mode"]
    extra: ExtraDataModel = Field(default_factory=ExtraDataModel)

class PFMEAEffectNode(BaseAnalysisNode[Literal["effect"], PFMEAEffectExtra]):
    nodeType: Literal["effect"]
    extra: PFMEAEffectExtra

class PFMEACauseNode(BaseAnalysisNode[Literal["cause"], PFMEACauseExtra]):
    nodeType: Literal["cause"]
    extra: PFMEACauseExtra

class PFMEAActionNode(BaseAnalysisNode[Literal["action"], PFMEAActionExtra]):
    nodeType: Literal["action"]
    extra: PFMEAActionExtra

PFMEAAnalysisNode = Union[PFMEAItemNode, PFMEAStepNode, PFMEAStep2Node, PFMEAElementNode, PFMEAFunctionNode, PFMEACharacteristicNode, PFMEAModeNode, PFMEAEffectNode, PFMEACauseNode, PFMEAActionNode]

class ModifiedPFMEAStructure(WarnOnExtraModel):
    baseInfo: Optional[PFMEABaseInfo] = None
    nodes: List[Annotated[PFMEAAnalysisNode, Field(discriminator='nodeType')]]

class PFMEAAnalysisRequest(BaseAnalysisRequest):
    modifiedStructure: Optional[ModifiedPFMEAStructure] = None

class PFMEAAnalysisResponse(WarnOnExtraModel):
    baseInfo: PFMEABaseInfo
    nodes: List[Annotated[PFMEAAnalysisNode, Field(discriminator='nodeType')]]
    featureNet: Optional[List[NetworkLink]] = None
    failureNet: Optional[List[NetworkLink]] = None