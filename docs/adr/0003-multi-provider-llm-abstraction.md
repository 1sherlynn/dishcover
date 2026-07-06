# LLM access goes through a multi-provider abstraction

Recipe generation and fridge-photo Scan call the LLM through the Vercel AI SDK rather than any provider's SDK directly. Default model: Gemini 2.5 Flash (cheap, vision-capable, good structured output); swapping providers/models is a config change, not a refactor. Chosen over committing to a single provider because generation quality/cost trade-offs are still unknown and the abstraction cost is near zero when adopted from day one — retrofitting one later is a real refactor.

Constraint this imposes: prompts and schemas must stay provider-neutral (no provider-specific features like Anthropic tool-choice quirks or OpenAI response_format extensions) unless wrapped behind the abstraction.
