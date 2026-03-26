const GeminiGenerator = require('./generators/GeminiGenerator');
const FalGenerator = require('./generators/FalGenerator');

module.exports = {
  GeminiGenerator,
  FalGenerator,
  MODELS: GeminiGenerator.MODELS,
  FAL_MODELS: FalGenerator.MODELS,
};

