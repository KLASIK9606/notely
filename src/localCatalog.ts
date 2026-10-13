export const localModel = {
  id: 'qwen3-vl-2b-q4-v1', name: 'Qwen3-VL 2B', license: 'Apache 2.0',
  files: [
    { name: 'model.gguf', size: 1107409952, url: 'https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/52d6c8ffea26cc873ac5ad116f8631268d7eb503/Qwen3VL-2B-Instruct-Q4_K_M.gguf' },
    { name: 'mmproj.gguf', size: 445053216, url: 'https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/52d6c8ffea26cc873ac5ad116f8631268d7eb503/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf' },
  ],
};
export const localDownloadBytes = localModel.files.reduce((sum, file) => sum + file.size, 0);
