const { env, AutoProcessor, Florence2ForConditionalGeneration, RawImage } = require('@huggingface/transformers');

async function testFlorence() {
  try {
    console.log('⏳ Loading Florence-2 Model (This will download ~250MB once)...');
    const model_id = 'onnx-community/Florence-2-base-ft';
    const processor = await AutoProcessor.from_pretrained(model_id);
    const model = await Florence2ForConditionalGeneration.from_pretrained(model_id, { dtype: 'fp32' });
    console.log('✅ Model loaded!');

    const imagePath = '../data/images/모자안쓴이미지.png';
    console.log(`🖼️ Reading image: ${imagePath}`);
    const image = await RawImage.read(imagePath);

    // Phrase grounding
    const prompts = ['head', 'face', 'person'];
    
    for (const phrase of prompts) {
      console.log(`\n🔍 Searching for: "${phrase}"`);
      const task_prompt = `<CAPTION_TO_PHRASE_GROUNDING> ${phrase}`;
      const inputs = await processor(image, task_prompt);
      
      const outputs = await model.generate({
        ...inputs,
        max_new_tokens: 1024,
      });
      
      const generated_text = processor.batch_decode(outputs, { skip_special_tokens: false })[0];
      const parsed = processor.post_process_generation(generated_text, task_prompt, image.size);
      
      console.log(`[Result for ${phrase}]:`, JSON.stringify(parsed, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testFlorence();
