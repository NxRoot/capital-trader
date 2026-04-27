export type ConditionType = "open" | "close";
export type FieldType = "CLOSE" | "OPEN" | "HIGH" | "LOW" | "LAST" | "COST" | "HOLD" | "PROFIT" | "INDICATOR";
export type OperatorType = "BIGGER" | "SMALLER" | "EQUAL" | "NOT_EQUAL" | "BIGGER_EQUAL" | "SMALLER_EQUAL";
export type ValueType = "COST" | "HOLD" | "PROFIT" | "NUMBER" | "RED" | "GREEN" | "INDICATOR";
export type ArithmeticOpType = "+" | "-" | "*" | "/";

export interface Condition {
    id: string;
    field: FieldType;
    offset: string;
    operator: OperatorType;
    value: string;
    valueType: ValueType;
    indicatorName?: string; // For field === "INDICATOR"
    valueIndicatorName?: string; // For valueType === "INDICATOR"
    valueIndicatorOffset?: string; // For valueType === "INDICATOR" when comparing with field === "INDICATOR"
    arithmeticOp?: ArithmeticOpType;
    arithmeticValue?: string;
}

export interface ConditionGroup {
    id: string;
    operator: "AND" | "OR";
    conditions: Condition[];
}

interface ConditionsProps {
    openGroups: ConditionGroup[];
    closeGroups: ConditionGroup[];
    openConnection: "AND" | "OR";
    closeConnection: "AND" | "OR";
    onOpenGroupsChange: (groups: ConditionGroup[]) => void;
    onCloseGroupsChange: (groups: ConditionGroup[]) => void;
    onOpenConnectionChange: (connection: "AND" | "OR") => void;
    onCloseConnectionChange: (connection: "AND" | "OR") => void;
}

const OPERATOR_OPTIONS: { value: OperatorType; label: string }[] = [
    { value: "BIGGER", label: ">" },
    { value: "SMALLER", label: "<" },
    { value: "EQUAL", label: "==" },
    { value: "NOT_EQUAL", label: "!=" },
    { value: "BIGGER_EQUAL", label: ">=" },
    { value: "SMALLER_EQUAL", label: "<=" },
];

const INDICATOR_OPTIONS = [
    'ao_ao',
    'bbi_bbi',
    'bias_bias1',
    'bias_bias2',
    'bias_bias3',
    'boll_mid',
    'boll_up',
    'boll_dn',
    'brar_ar',
    'brar_br',
    'cci_cci',
    'cr_cr',
    'cr_ma1',
    'cr_ma2',
    'cr_ma3',
    'cr_ma4',
    'dma_dma',
    'dma_ama',
    'dmi_pdi',
    'dmi_mdi',
    'dmi_adx',
    'dmi_adxr',
    'ema_ema1',
    'ema_ema2',
    'ema_ema3',
    'emv_emv',
    'emv_maEmv',
    'kdj_k',
    'kdj_d',
    'kdj_j',
    'ma_ma5',
    'ma_ma10',
    'ma_ma30',
    'ma_ma60',
    'macd_dif',
    'macd_macd',
    'macd_dea',
    'mtm_mtm',
    'mtm_maMtm',
    'psy_psy',
    'psy_maPsy',
    'roc_roc',
    'roc_maRoc',
    'rsi_rsi1',
    'rsi_rsi2',
    'rsi_rsi3',
    'sar_sar',
    'sma_sma',
    'str_hh',
    'str_hl',
    'str_lh',
    'str_ll',
    'trix_trix',
    'trix_maTrix',
    'wr_wr1',
    'wr_wr2',
    'wr_wr3',
];

// Combined field options: CLOSE, OPEN, HIGH, LOW, LAST, COST, HOLD + all indicators
const FIELD_SELECT_OPTIONS = [
    { value: "CLOSE", label: "CLOSE" },
    { value: "OPEN", label: "OPEN" },
    { value: "HIGH", label: "HIGH" },
    { value: "LOW", label: "LOW" },
    { value: "LAST", label: "LAST" },
    { value: "COST", label: "COST" },
    { value: "HOLD", label: "HOLD" },
    { value: "PROFIT", label: "PROFIT" },
    ...INDICATOR_OPTIONS.map(ind => ({ value: `INDICATOR:${ind}`, label: ind })),
];

// Combined value options: NUMBER, COST, HOLD, PROFIT, RED, GREEN + all indicators
const VALUE_SELECT_OPTIONS = [
    { value: "NUMBER", label: "NUMBER" },
    { value: "COST", label: "COST" },
    { value: "HOLD", label: "HOLD" },
    { value: "PROFIT", label: "PROFIT" },
    { value: "RED", label: "RED" },
    { value: "GREEN", label: "GREEN" },
    ...INDICATOR_OPTIONS.map(ind => ({ value: `INDICATOR:${ind}`, label: ind })),
];

const ARITHMETIC_OP_OPTIONS: { value: ArithmeticOpType; label: string }[] = [
    { value: "+", label: "+" },
    { value: "-", label: "-" },
    { value: "*", label: "×" },
    { value: "/", label: "÷" },
];

function ConditionRow({
    condition,
    onChange,
    onDelete,
}: {
    condition: Condition;
    onChange: (condition: Condition) => void;
    onDelete: () => void;
}) {
    // Get current field value for the select (either field type or "INDICATOR:indicatorName")
    const getFieldSelectValue = (): string => {
        if (condition.field === "INDICATOR" && condition.indicatorName) {
            return `INDICATOR:${condition.indicatorName}`;
        }
        return condition.field;
    };

    // Get current value type for the select (either value type or "INDICATOR:indicatorName")
    const getValueSelectValue = (): string => {
        if (condition.valueType === "INDICATOR" && condition.valueIndicatorName) {
            return `INDICATOR:${condition.valueIndicatorName}`;
        }
        return condition.valueType;
    };

    // Check if field is an indicator
    const isFieldIndicator = condition.field === "INDICATOR";
    // Check if value is an indicator
    const isValueIndicator = condition.valueType === "INDICATOR";

    const showOffset = condition.field !== "COST" && condition.field !== "HOLD" && condition.field !== "PROFIT";
    const showValueIndicatorOffset = isFieldIndicator && isValueIndicator;

    const handleFieldChange = (value: string) => {
        if (value.startsWith("INDICATOR:")) {
            const indicatorName = value.replace("INDICATOR:", "");
            onChange({
                ...condition,
                field: "INDICATOR",
                indicatorName,
            });
        } else {
            onChange({
                ...condition,
                field: value as FieldType,
                indicatorName: undefined,
            });
        }
    };

    const handleValueChange = (value: string) => {
        if (value.startsWith("INDICATOR:")) {
            const indicatorName = value.replace("INDICATOR:", "");
            const updates: Partial<Condition> = {
                valueType: "INDICATOR",
                valueIndicatorName: indicatorName,
                value: "",
            };
            // Reset arithmetic fields
            updates.arithmeticOp = undefined;
            updates.arithmeticValue = undefined;
            onChange({ ...condition, ...updates });
        } else {
            const newValueType = value as ValueType;
            const updates: Partial<Condition> = {
                valueType: newValueType,
                valueIndicatorName: undefined,
                valueIndicatorOffset: undefined,
                value: newValueType === "COST" || newValueType === "HOLD" || newValueType === "PROFIT" || newValueType === "RED" || newValueType === "GREEN" ? "" : condition.value,
            };
            // Reset arithmetic fields if not COST
            if (newValueType !== "COST") {
                updates.arithmeticOp = undefined;
                updates.arithmeticValue = undefined;
            } else if (!condition.arithmeticOp) {
                // Initialize arithmetic op to "+" if switching to COST
                updates.arithmeticOp = "+";
                updates.arithmeticValue = condition.arithmeticValue || "";
            }
            onChange({ ...condition, ...updates });
        }
    };

    return (
        <div className="flex items-center gap-2 py-1 last:border-b-0">
            <select
                value={getFieldSelectValue()}
                onChange={(e) => handleFieldChange(e.target.value)}
                className="rounded-0 border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
            >
                {FIELD_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {showOffset && (
                <input
                    type="number"
                    min="0"
                    value={condition.offset}
                    onChange={(e) => onChange({ ...condition, offset: e.target.value })}
                    placeholder="0"
                    className="w-12 rounded-0 border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
                />
            )}

            <select
                value={condition.operator}
                onChange={(e) => onChange({ ...condition, operator: e.target.value as OperatorType })}
                className="rounded-0 w-12 border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
            >
                {OPERATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            <select
                value={getValueSelectValue()}
                onChange={(e) => handleValueChange(e.target.value)}
                className="rounded-0 border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
            >
                {VALUE_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {condition.valueType === "NUMBER" && (
                <input
                    type="number"
                    step="any"
                    value={condition.value}
                    onChange={(e) => onChange({ ...condition, value: e.target.value })}
                    placeholder="0"
                    className="w-16 rounded-0 border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
                />
            )}

            {condition.valueType === "COST" && (
                <>
                    <select
                        value={condition.arithmeticOp || "+"}
                        onChange={(e) => onChange({ ...condition, arithmeticOp: e.target.value as ArithmeticOpType })}
                        className="w6 rounded-0 border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
                    >
                        {ARITHMETIC_OP_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        step="any"
                        value={condition.arithmeticValue || ""}
                        onChange={(e) => onChange({ ...condition, arithmeticValue: e.target.value })}
                        placeholder="0"
                        className="w-16 rounded-0 border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
                    />
                </>
            )}

            {/* Offset input for value indicator - only shown when both field and valueType are INDICATOR */}
            {showValueIndicatorOffset && (
                <input
                    type="number"
                    min="0"
                    value={condition.valueIndicatorOffset || "0"}
                    onChange={(e) => onChange({ ...condition, valueIndicatorOffset: e.target.value })}
                    placeholder="0"
                    className="w-16 rounded-0 border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
                />
            )}

            <button
                onClick={onDelete}
                className="rounded-0 cursor-pointer p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-400"
                aria-label="Delete condition"
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

function ConditionGroupComponent({
    group,
    onChange,
    onDelete,
}: {
    group: ConditionGroup;
    onChange: (group: ConditionGroup) => void;
    onDelete: () => void;
}) {
    const addCondition = () => {
        onChange({
            ...group,
            conditions: [
                ...group.conditions,
                {
                    id: Date.now().toString(),
                    field: "CLOSE",
                    offset: "0",
                    operator: "BIGGER",
                    value: "",
                    valueType: "NUMBER",
                },
            ],
        });
    };

    const updateCondition = (id: string, updated: Condition) => {
        onChange({
            ...group,
            conditions: group.conditions.map((c) => (c.id === id ? updated : c)),
        });
    };

    const deleteCondition = (id: string) => {
        onChange({
            ...group,
            conditions: group.conditions.filter((c) => c.id !== id),
        });
    };

    return (
        <div className="mb-4 border border-zinc-700 rounded-0 p-4 bg-zinc-900/50 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={"text-xs font-semibold uppercase px-2 py-1 rounded-0 bg-zinc-800" + (group.operator === "AND" ? " text-purple-400" : " text-blue-400")}>
                        {group.operator}
                    </span>
                    <span className="text-xs text-zinc-500">
                        {group.conditions.length} condition{group.conditions.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={addCondition}
                        className="rounded-0 cursor-pointer px-2 py-1 text-xs font-semibold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition"
                    >
                        + Add Condition
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded-0 cursor-pointer p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-400"
                        aria-label="Delete group"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            {group.conditions.length === 0 ? (
                <div className="text-sm text-zinc-500 py-2 text-center">
                    No conditions in this group. Click "Add Condition" to get started.
                </div>
            ) : (
                group.conditions.map((condition) => (
                    <ConditionRow
                        key={condition.id}
                        condition={condition}
                        onChange={(updated) => updateCondition(condition.id, updated)}
                        onDelete={() => deleteCondition(condition.id)}
                    />
                ))
            )}
        </div>
    );
}

function ConditionSection({
    title,
    groups,
    onGroupsChange,
    connection,
    onConnectionChange,
}: {
    title: string;
    groups: ConditionGroup[];
    onGroupsChange: (groups: ConditionGroup[]) => void;
    connection: "AND" | "OR";
    onConnectionChange: (connection: "AND" | "OR") => void;
}) {
    const addGroup = (operator: "AND" | "OR") => {
        onGroupsChange([
            ...groups,
            {
                id: Date.now().toString(),
                operator,
                conditions: [
                    {
                        id: (Date.now() + 1).toString(),
                        field: "CLOSE",
                        offset: "0",
                        operator: "BIGGER",
                        value: "",
                        valueType: "NUMBER",
                    },
                ],
            },
        ]);
    };

    const updateGroup = (id: string, updated: ConditionGroup) => {
        onGroupsChange(groups.map((g) => (g.id === id ? updated : g)));
    };

    const deleteGroup = (id: string) => {
        onGroupsChange(groups.filter((g) => g.id !== id));
    };

    return (
        <div className="mb-3">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase text-zinc-400 pl-1.5">{title}</h3>
                <div className="flex items-center gap-1">
                    <select
                        value={connection}
                        onChange={(e) => onConnectionChange(e.target.value as "AND" | "OR")}
                        className="mr-1 rounded-0 border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300/30"
                    >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                    </select>
                    <button
                        onClick={() => addGroup("AND")}
                        className="rounded-0 cursor-pointer px-4 py-2 text-xs font-semibold bg-black text-purple-400 hover:opacity-80 transition border border-zinc-700"
                    >
                        AND
                    </button>
                    <button
                        onClick={() => addGroup("OR")}
                        className="rounded-0 cursor-pointer px-4 py-2 text-xs font-semibold bg-black text-blue-400 hover:opacity-80 transition border border-zinc-700"
                    >
                        OR
                    </button>
                </div>
            </div>
            {groups.length === 0 ? (
                <div className="text-sm text-zinc-500 py-9 text-center border border-zinc-700 rounded-0 p-4 bg-zinc-900/50 mb-4">
                    No groups. <br></br>Add a new group by clicking the "AND" or "OR" button.
                </div>
            ) : (
                groups.map((group) => (
                    <ConditionGroupComponent
                        key={group.id}
                        group={group}
                        onChange={(updated) => updateGroup(group.id, updated)}
                        onDelete={() => deleteGroup(group.id)}
                    />
                ))
            )}
        </div>
    );
}

export function Conditions({
    openGroups,
    closeGroups,
    openConnection,
    closeConnection,
    onOpenConnectionChange,
    onCloseConnectionChange,
    onOpenGroupsChange,
    onCloseGroupsChange,
}: ConditionsProps) {
    return (
        <div className="flex flex-col flex-1 p-4 overflow-y-auto">
            <ConditionSection
                title="Open Conditions"
                groups={openGroups}
                onGroupsChange={onOpenGroupsChange}
                connection={openConnection}
                onConnectionChange={onOpenConnectionChange}
            />
            <ConditionSection
                title="Close Conditions"
                groups={closeGroups}
                onGroupsChange={onCloseGroupsChange}
                connection={closeConnection}
                onConnectionChange={onCloseConnectionChange}
            />
        </div>
    );
}