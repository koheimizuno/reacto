import { dispatch } from '@rematch/core';
import { clipboard, shell } from 'electron';
import { PromptUserManager } from '../editor/managers';
import BaseMenu from './_base-menu';
const path = window.require('path');

// IDEA copy code from methods to FileTreeManager
// Then call FileTreeManager directly
// e.g. FileTreeManager.renameFile(...)
//      FileTreeManager.deleteFile(...)

/**
 * Context menu for each file entry inside the file tree.
 * @param {object} options a few information about the selected file
 *                         .filePath:string, selected file path
 *                         .isDirectory:boolean
 */
function template({ filePath, isDirectory, ...options }) {
  return [
    {
      label: 'New file',
      click() {
        PromptUserManager.ask({
          question: 'New file',
          inputPlaceholder: (isDirectory ? filePath : path.dirname(filePath)) + path.sep,
        }, (newFilePath) => {
          dispatch.session.createFileAsync(newFilePath);
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Rename',
      click() {
        const path = window.require('path');
        const filename = path.basename(filePath);
        const selection = {
          start: filePath.indexOf(filename),
          end: filePath.length,
        };

        PromptUserManager.ask({
          question: 'Rename file',
          inputPlaceholder: filePath,
          selection,
        }, (newFilePath) => {
          dispatch.session.renameFileAsync({ filePath, newFilePath });
        });
      },
    },
    {
      label: 'Duplicate',
    },
    {
      label: 'Send to Trash',
      click() {
        dispatch.session.closeFileAsync(filePath);

        if (!shell.moveItemToTrash(filePath)) {
          console.log("Couldn't send", filePath, "to trash");
        }
      },
    },
    {
      label: 'Copy',
      click() {
        // TODO: regarding the file type, use different methods
        // fs.readFile(filePath, fileContent = data)
        // writeText or writeImage
        // clipboard.writeText(fileContent);
      }
    },
    {
      label: 'Cut',
      click() {
        // TODO
      },
    },
    {
      label: 'Paste',
      click() {
        // TODO
      },
    },
    { type: 'separator' },
    {
      label: 'Preview Component',
      click() {
        dispatch.project.updateComponentPreviewFilePath({ filePath });
      },
    },
    { type: 'separator' },
    {
      label: 'Copy Full File Path',
      click() {
        clipboard.writeText(filePath);
      },
    },
    {
      label: 'Show in Finder',
      click() {
        if (!shell.showItemInFolder(filePath)) {
          console.log("Couldn't find", filePath, "in finder");
        }
      },
    }
  ];
}

export default new BaseMenu(template);
