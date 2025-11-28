const fs = require('fs');
const path = require('path');
const hashFactory = require('hash-factory');

class BaseGenerator {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Generates a hash from the text prompt.
   * @param {string} prompt 
   * @param {Object} options 
   * @returns {string}
   */
  generateHash(prompt, options = { length: 10 }) {
    return hashFactory(prompt, options);
  }

  /**
   * Saves generated images to the specified directory using hashed filenames.
   * @param {string[]} images - Array of base64 image strings.
   * @param {string} directory - Target directory path.
   * @param {string} prompt - The prompt used for generation (to create hash).
   * @param {string} [extension='png'] - File extension.
   * @returns {string[]} Array of saved file paths.
   */
  saveImages(images, directory, prompt, extension = 'png') {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return [];
    }

    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const savedPaths = [];
    const hash = this.generateHash(prompt);

    images.forEach((imgData, index) => {
      const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Using format: hash_index.ext
      const fileName = `${hash}_${index + 1}.${extension}`;
      const outputPath = path.join(directory, fileName);
      
      fs.writeFileSync(outputPath, buffer);
      savedPaths.push(outputPath);
    });

    return savedPaths;
  }
}

module.exports = BaseGenerator;

