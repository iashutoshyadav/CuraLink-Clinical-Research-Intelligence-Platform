import { pipeline } from '@xenova/transformers';

async function downloadModels() {
  console.log('📥 Pre-downloading Curalink ONNX models...');
  console.log('   This runs once and caches to ~/.cache/huggingface\n');

  const models = [
    {
      name: 'Bi-encoder (MiniLM-L6-v2)',
      task: 'feature-extraction',
      model: 'Xenova/all-MiniLM-L6-v2',
    },
    {
      name: 'Cross-encoder (ms-marco-MiniLM-L-6-v2)',
      task: 'text-classification',
      model: 'Xenova/ms-marco-MiniLM-L-6-v2',
    },
  ];

  let allOk = true;
  for (const { name, task, model } of models) {
    try {
      process.stdout.write(`   ↳ Downloading ${name}... `);
      const t0 = Date.now();
      const pipe = await pipeline(task, model, { quantized: true });

      if (task === 'feature-extraction') {
        await pipe('warmup', { pooling: 'mean', normalize: true });
      } else {
        await pipe([['warmup', 'warmup passage']], { topk: null });
      }
      console.log(`✅ (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      allOk = false;
    }
  }

  console.log('');
  if (allOk) {
    console.log('✅ All models ready. Server cold-start latency eliminated.');
  } else {
    console.log('⚠️  Some models failed to download. Check internet connection.');
    console.log('   The server will try to download them on first request.');
    process.exit(1);
  }
}

downloadModels().catch((err) => {
  console.error('Fatal error during model download:', err.message);
  process.exit(1);
});
