const fs = require('fs');
const {
  Worker
} = require('worker_threads');

// A worker that executes the given script
// TODO: This can be taken from a pool of workers
const worker = new Worker('./worker.js', {

  // TODO: This can be passed via a message instead of passing at the time of
  // instantiation.
  workerData: {
    script: `
      const t1 = performance.now();
      const custom = require('./assets/custom.js');
      const t2 = performance.now();

      console.log('t2 - t1 =', t2 - t1);

      console.log('result from', custom.name, '1 + 2 =', custom.add(1, 2));
      console.log('result from', custom.name, '2 - 1 =', custom.subtract(2, 1));
    `
  }
});

worker.on('message', (message) => {
  // Handle the "require" messages.
  // When this message is passed, the worker pauses itself and waits for the
  // file load to happen. Once the file is loaded, the main thread notifies the
  // worker to wake up and continue execution.
  // This ensures that the script execution in worker "appears" sync even
  // though the script loading is async.
  if (message.type === 'require') {
    const {
      filename,
      sab
    } = message;

    // TODO: handle case where filename = 'fs' and such

    // TODO: handle case where filename = `./custom`, but file is actually
    // `./custom.js`

    fs.readFile(filename, 'utf8', (err, data) => {
      // In case of error, just return data of length 0
      // TODO: This needs to be handled separately because a file can also
      // be empty.
      if (err) {
        Atomics.store(new Int32Array(sab), 0, 0);
        Atomics.notify(new Int32Array(sab), 0);

        return;
      }

      // Store the length in the first byte and the data in the rest of thed
      // bytes
      Atomics.store(new Int32Array(sab), 0, data.length);

      // TODO: optimise this for speed
      for (let i = 0; i < data.length; i++) {
        Atomics.store(new Int32Array(sab), i + 4, data.charCodeAt(i));
      }

      // Finally wake up the worker
      Atomics.notify(new Int32Array(sab), 0);
    }, 1000);
  }
});

worker.on('error', (error) => {
  console.error(error);
});
