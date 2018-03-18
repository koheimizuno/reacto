import { default as newFile } from './new-file';
import { default as closeFile } from './close-file';
import { default as quickTabSwitch } from './quick-tab-switch';
import { default as saveFile } from './save-file';
import { default as search } from './search';
import { default as switchPackageManager } from './switch-package-manager';
import { default as componentPreview } from './component-preview';
import { EventsManager } from '../managers';

const events = {
  newFile,
  closeFile,
  componentPreview,
  quickTabSwitchBackward: quickTabSwitch.quickTabSwitchBackward,
  quickTabSwitchForward: quickTabSwitch.quickTabSwitchForward,
  saveFile,
  search,
  switchPackageManagerToNpm: switchPackageManager.switchPackageManagerToNpm,
  switchPackageManagerToYarn: switchPackageManager.switchPackageManagerToYarn,
};

EventsManager
  .on('new-file', () => events.newFile())
  .on('close-file', () => events.closeFile())
  .on('save-file', () => events.saveFile())
  .on('search', () => events.search())
  .on('quick-switch-tab-backward', () => events.quickTabSwitchBackward())
  .on('quick-switch-tab-forward', () => events.quickTabSwitchForward())
  .on('switch-package-manager-to-npm', () => events.switchPackageManagerToNpm())
  .on('switch-package-manager-to-yarn', () => events.switchPackageManagerToYarn())
  .on('component-preview', () => events.componentPreview());

export default events;
