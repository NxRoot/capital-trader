
const parseJson = (text) => {
    const cleaned = text?.match(/```(?:json)?\s*\n?([\s\S]*?)```/i)?.[1]?.trim() ?? text ?? "";
    try { return JSON.parse(cleaned) } catch (err) { return "" }
}


/** Calls Anthropic Claude with the current prompt. */
async function callAnthropic(config, messages, model = 'claude-opus-4-6') {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: { 'x-api-key': config?.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
		body: JSON.stringify({ model, max_tokens: Number(config?.tokens) || 10000, messages }),
	});
	if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
	const data = await res.json();
	return parseJson(data?.content?.find((b) => b.type === 'text')?.text ?? '{}');
}


/** Calls OpenAI ChatGPT with the current prompt. */
async function callOpenAI(config, messages, model = 'gpt-4o') {
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: { 'Authorization': `Bearer ${config?.apiKey}`, 'content-type': 'application/json' },
		body: JSON.stringify({ model, max_tokens: Number(config?.tokens) || 10000, messages }),
	});
	if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
	const data = await res.json();
	return parseJson(data?.choices?.[0]?.message?.content ?? '{}');
}


/** Makes a prompt for the AI assistant. */
const makePrompt = (cfg) => `You are an expert trader. Modify the strategy code based on the user's request.
            
EPIC: ${cfg.epic}
ORDER SIZE: ${Number(cfg.orderSize)}
TIMEFRAME: ${cfg.timeframe}


Strategy will be evaluated in javascript by the following function:
"""
const evaluator = new Function('data', 'i', 'trend', 'cost', 'hold', {
    let type = "BUY"; let canOpen = false; let canClose = false;   // type, canOpen, canClose variables already exist, don't recreate them or code will break, only change their values

    // User code strategy will be evaluated here later.

    return [canOpen, canClose, type]; // [boolean, boolean, "BUY" or "SELL"]
})
"""

This is the current strategy code:
"""
${JSON.stringify(cfg.strategyCode)}
"""


1. How to write a condition

- Conditions are written in javascript language.
- You can use internal variables to write your conditions.
- The 'canOpen' and 'canClose' variables must be true to execute an order.

(LONG) 
type = "BUY"                // type of order
canOpen = true              // can open order
canClose = true             // can close order

(SHORT)
type = "SELL"               // type of order
canOpen = true              // can open order
canClose = true             // can close order


2. Variables

i                           // index of current bar
data                        // all bar values
order                       // has order open
cost                        // cost of last order
hold                        // number of bars after order

profit                      // total profit
pro                         // order profit
drawdown                    // max drawdown
dd                          // order drawdown

trend                       // trend of last 50 bars
back                        // number of bars used for trend


3. Combinations (data[i-index] might be undefined, always use ?. to check if it is defined)

data?.[i]                     // current bar values
data?.[i-1]                   // previous bar values
data?.[i]?.['close']          // current bar value -> [ 'open' 'high' 'low' 'close' ]


Respond ONLY with RAW JSON format:
{
    "code": "<string, the strategy code or null if the user asks a question>",
    "response": "<string, response to the user>"
}
`

module.exports = { callAnthropic, callOpenAI, makePrompt };