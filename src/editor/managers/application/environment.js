/**
 * Helpers to communicate with the local environment.
 */
export default class Environment {
  /**
   * Check if a command is available in local env
   *
   * @param {string} command
   * @return {boolean}
   */
  hasCommand(command = '') {
    return new Promise((resolve, reject) => {
      const listener = (event) => {
        if (event.data.type === 'which' && event.data.command === command) {
          if (event.data.success) resolve(true);
          else resolve(false);
          navigator.serviceWorker.removeEventListener('message', listener);
        }
      };
      navigator.serviceWorker.addEventListener('message', listener);
      navigator.serviceWorker.controller.postMessage({ type: 'which', command });
    });
  }

  /**
   * Run a command
   *
   * @param {string} command 'ls', 'node'
   * @param {Array[string]} args ['-al']
   * @return
   */
  run(command = '', args = []) {
    const wholeCommand = [command, ...args].join(' ');
    return new Promise((resolve, reject) => {
      const listener = (event) => {
        if (event.data.type === 'run' && event.data.wholeCommand === wholeCommand) {
          if (event.data.success) resolve();
          else reject();
          navigator.serviceWorker.removeEventListener('message', listener);
        }
      };

      navigator.serviceWorker.addEventListener('message', listener);
      navigator.serviceWorker.controller.postMessage({
        type: 'run',
        command,
        args,
        wholeCommand,
      });
    });
  }
}
