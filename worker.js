const {
  parentPort,
  workerData,
} = require('worker_threads');

const { script } = workerData;

// Evaluate a given script in a new context with the given require function
const evalInContext = (requireFn) => (script) => {
  const context = {
    exports: {}
  };
  const fn = new Function('exports', 'require', 'module', 'console', script);

  fn.call(context, context.exports, requireFn, context, console);

  return context.exports;
};

const requireFn = (filename) => {
  const sab = new SharedArrayBuffer(4096);

  // Pass on the message with the shared buffer. This buffer will be used
  // to pass back the data from the main thread to the worker.
  parentPort.postMessage({
    type: 'require',
    filename,
    sab,
  });

  // Pause the execution for the file to be loaded.
  Atomics.wait(new Int32Array(sab), 0, 0, 10000);

  const length = Atomics.load(new Int32Array(sab), 0);

  // TODO: The length can be zero if file is empty. Handle this better.
  if (length === 0) {
    throw new Error('Could not find module to load');
  }

  const codes = [];

  // TODO: optimise this for speed
  for (let i = 0; i < length; i++) {
    codes.push(Atomics.load(new Int32Array(sab), i + 4));
  }

  const val = String.fromCharCode(...codes);

  return evalInContext(requireFn)(val);
};

evalInContext(requireFn)(script);
