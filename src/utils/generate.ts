import { Condition, ConditionGroup, OperatorType } from "@/components/Conditions";

function getFieldAccess(condition: Condition): string {
  const offset = condition.offset ? parseInt(condition.offset, 10) : 0;
  const idx = offset === 0 ? "i" : offset > 0 ? `i-${offset}` : `i+${Math.abs(offset)}`;

  switch (condition.field) {
    case "CLOSE":       return `data[${idx}]?.['close']`;
    case "OPEN":        return `data[${idx}]?.['open']`;
    case "HIGH":        return `data[${idx}]?.['high']`;
    case "LOW":         return `data[${idx}]?.['low']`;
    case "LAST":        return `data[${idx}]?.['close']`;
    case "COST":        return "cost";
    case "HOLD":        return "hold";
    case "PROFIT":      return "profit";
    case "INDICATOR":   return condition.indicatorName ? `data[${idx}]?.['${condition.indicatorName}']` : "0";
    default:            return "0";
  }
}

function getValueExpression(condition: Condition): string {
  switch (condition.valueType) {
    case "NUMBER":
      return condition.value || "0";
    case "CLOSE": {
      const closeOffset = condition.value ? parseInt(condition.value, 10) : 0;
      const closeIdx = closeOffset === 0 ? "i" : closeOffset > 0 ? `i-${closeOffset}` : `i+${Math.abs(closeOffset)}`;
      return `data[${closeIdx}]?.['close']`;
    }
    case "COST":
      // If arithmetic operations are specified, apply them
      if (condition.arithmeticOp && condition.arithmeticValue && condition.arithmeticValue !== "") {
        const op = condition.arithmeticOp;
        const val = condition.arithmeticValue.trim();
        // Validate that the value is a valid number
        if (!isNaN(Number(val)) && val !== "") {
          return `(cost ${op} ${val})`;
        }
      }
      return "cost";
    case "HOLD":
      return "hold";
    case "PROFIT":
      return "profit";
    case "RED":
      // RED means the bar closed lower than the previous bar
      const offset = condition.offset ? parseInt(condition.offset, 10) : 0;
      const idx = offset === 0 ? "i" : offset > 0 ? `i-${offset}` : `i+${Math.abs(offset)}`;
      const prevIdx = offset === 0 ? "i-1" : offset > 0 ? `i-${offset+1}` : `i+${Math.abs(offset)-1}`;
      return `(data[${idx}]?.['close'] < data[${prevIdx}]?.['close'])`;
    case "GREEN":
      // GREEN means the bar closed higher than the previous bar
      const offset2 = condition.offset ? parseInt(condition.offset, 10) : 0;
      const idx2 = offset2 === 0 ? "i" : offset2 > 0 ? `i-${offset2}` : `i+${Math.abs(offset2)}`;
      const prevIdx2 = offset2 === 0 ? "i-1" : offset2 > 0 ? `i-${offset2+1}` : `i+${Math.abs(offset2)-1}`;
      return `(data[${idx2}]?.['close'] > data[${prevIdx2}]?.['close'])`;
    case "INDICATOR":
      // Use valueIndicatorOffset if available, otherwise use the regular offset
      const valueOffset = condition.valueIndicatorOffset !== undefined 
        ? (condition.valueIndicatorOffset ? parseInt(condition.valueIndicatorOffset, 10) : 0)
        : (condition.offset ? parseInt(condition.offset, 10) : 0);
      const idx3 = valueOffset === 0 ? "i" : valueOffset > 0 ? `i-${valueOffset}` : `i+${Math.abs(valueOffset)}`;
      return condition.valueIndicatorName ? `data[${idx3}]?.['${condition.valueIndicatorName}']` : "0";
    default:
      return "0";
  }
}

function getOperator(operator: OperatorType): string {
  switch (operator) {
    case "BIGGER":          return ">";
    case "SMALLER":         return "<";
    case "EQUAL":           return "==";
    case "NOT_EQUAL":       return "!=";
    case "BIGGER_EQUAL":    return ">=";
    case "SMALLER_EQUAL":   return "<=";
    default:                return ">";
  }
}

function conditionToCode(condition: Condition): string {
  // Special handling for LAST field with RED/GREEN and EQUAL operator
  // Example: LAST | 5 | EQUAL | RED -> checks if last 5 bars are all red
  // This means: data[i]['close'] < data[i-1]['close'] && data[i-1]['close'] < data[i-2]['close'] && ...
  if (condition.field === "LAST" && (condition.valueType === "RED" || condition.valueType === "GREEN") && (condition.operator === "EQUAL" || condition.operator === "NOT_EQUAL")) {
    const count = condition.offset ? parseInt(condition.offset, 10) : 1;
    const isRed = condition.valueType === "RED";
    const isNotEqual = condition.operator === "NOT_EQUAL";
    
    // Generate code that checks if last N bars are all red/green
    // For count=5, we check: i vs i-1, i-1 vs i-2, i-2 vs i-3, i-3 vs i-4, i-4 vs i-5
    const conditions: string[] = [];
    for (let i = 0; i < count; i++) {
      const currentIdx = i === 0 ? "i" : `i-${i}`;
      const prevIdx = `i-${i + 1}`;
      if (isRed) {
        conditions.push(`data[${currentIdx}]?.['close'] < data[${prevIdx}]?.['close']`);
      } else {
        conditions.push(`data[${currentIdx}]?.['close'] > data[${prevIdx}]?.['close']`);
      }
    }
    
    const combinedCondition = conditions.join(" && ");
    return isNotEqual ? `!(${combinedCondition})` : `(${combinedCondition})`;
  }

  const left = getFieldAccess(condition);
  const operator = getOperator(condition.operator);
  const right = getValueExpression(condition);

  // Special handling for RED/GREEN comparisons (single bar check)
  if (condition.valueType === "RED" || condition.valueType === "GREEN") {
    if (condition.operator === "EQUAL") {
      return right;
    } else if (condition.operator === "NOT_EQUAL") {
      return `!${right}`;
    }
    // For other operators, compare the field access with the red/green expression
    return `${left} ${operator} ${right}`;
  }

  // Handle EQUAL/NOT_EQUAL for special values
  if (condition.valueType === "COST" || condition.valueType === "HOLD" || condition.valueType === "PROFIT" || condition.valueType === "INDICATOR") {
    return `${left} ${operator} ${right}`;
  }

  return `${left} ${operator} ${right}`;
}

function groupToCode(group: ConditionGroup): string {
  
  if (group.conditions.length === 0) return "false";
  
  const conditionCodes = group.conditions.map(conditionToCode);
  const operator = group.operator === "AND" ? " && " : " || ";
  const combined = conditionCodes.join(operator);
  
  // Wrap in parentheses if multiple conditions to ensure proper precedence
  return group.conditions.length > 1 ? `(${combined})` : combined;
}

export function generateStrategyCode(
  openGroups: ConditionGroup[],
  closeGroups: ConditionGroup[],
  openConnection: "AND" | "OR",
  closeConnection: "AND" | "OR",
  activeTab: "BUY" | "SELL"
): string {
  // For open groups: combine all groups with AND (all groups must be true)
  const openCode = openGroups.length > 0 ? openGroups.map(groupToCode).join(openConnection === "AND" ? " && " : " || ") : "false";

  // For close groups: combine all groups with OR (any group can be true)
  const closeCode = closeGroups.length > 0 ? closeGroups.map(groupToCode).join(closeConnection === "AND" ? " && " : " || ") : "false";

  const typeLogic = `type = "${activeTab}"`;

  return `
${typeLogic}
canOpen = ${openCode}
canClose = ${closeCode}
`.trim();
}
