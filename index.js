const GeminiGenerator = require('./generators/GeminiGenerator');
const FalGenerator = require('./generators/FalGenerator');
const OpenAIGenerator = require('./generators/OpenAIGenerator');

module.exports = {
  OpenAIGenerator,
  OPENAI_MODELS: OpenAIGenerator.MODELS,
  GeminiGenerator,
  FalGenerator,
  MODELS: GeminiGenerator.MODELS,
  FAL_MODELS: FalGenerator.MODELS,
};

