const { env, AutoProcessor, Florence2ForConditionalGeneration, RawImage } = require('@huggingface/transformers');

async function testParsing() {
  try {
    const model_id = 'onnx-community/Florence-2-base-ft';
    const processor = await AutoProcessor.from_pretrained(model_id);
    const model = await Florence2ForConditionalGeneration.from_pretrained(model_id, { dtype: 'fp32' });

    const imagePath = '../data/images/모자안쓴이미지.png';
    const image = await RawImage.read(imagePath);

    const task_prompt = '<CAPTION_TO_PHRASE_GROUNDING> head';
    const inputs = await processor(image, task_prompt);
    
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: 1024,
    });
    
    const generated_text = processor.batch_decode(outputs, { skip_special_tokens: false })[0];
    console.log("Raw generated text:", generated_text);
    
    const parsed = processor.post_process_generation(generated_text, task_prompt, image.size);
    console.log("Parsed result:", JSON.stringify(parsed, null, 2));

  } catch (err) {
    console.error(err);
  }
}

testParsing();
