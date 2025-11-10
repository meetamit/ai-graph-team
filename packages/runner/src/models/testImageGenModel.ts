import path from 'path';
import { readFileSync } from 'fs';
import { MockImageModelV3 } from 'ai/test';

const TEST_IMAGE = new Uint8Array(readFileSync(path.join(__dirname, 'test.png')));

export default function testImageGenModel(): MockImageModelV3 {
  return new MockImageModelV3({
    doGenerate: async (options) => {
      return {
        images: [TEST_IMAGE],
        warnings: [],
        // providerMetadata: {},
        response: {
          timestamp: new Date(),
          modelId: 'test-model-id',
          headers: {},
        },
      };
    },
  });
}