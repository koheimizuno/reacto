import React from 'react';
import { connect } from 'react-redux';
import { JSHINT } from 'jshint';
import { getState } from '@rematch/core';
import CodeMirror from 'codemirror';
import { UnControlled as CodeMirrorEditor } from 'react-codemirror2';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/display/rulers';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/sass/sass';
import 'codemirror/mode/css/css';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/comment/continuecomment';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/display/placeholder';
import 'codemirror/keymap/sublime';
import 'codemirror/keymap/vim';
import '../../editor/hint';
import config from '../../config';
import { EditorFooter } from '..';
import placeholders from '../../editor/placeholders';
import { j, hint, file, perf } from '../../utils';

window.JSHINT = JSHINT;

/**
 * Code editor.
 */
class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      code: '',
      cursor: null,
      options: {
        lineNumbers: true,
        theme: 'night-flight',
        tabSize: 2,
        tabMode: 'indentAuto',
        mode: 'jsx',
        keyMap: this.keyMap(),
        // lint: {
        //   getAnnotations: this.getAnnotations,
        //   async: true,
        //   callback: this.linter,
        // },
        gutters: ['CodeMirror-lint-markers'],
        extraKeys: {
          'Cmd-Alt-B': 'autocomplete',
          // TODO find out why it isn't working on macOS
          'Cmd-Alt-C': 'toggleComment',
        },
        scrollbarStyle: null,
        pollInterval: 17,
        placeholder: placeholders.getRandom(),
        autoCloseBrackets: true,
        autoCloseTags: true,
        matchBrackets: true,
        matchTags: true,
        highlightSelectionMatches: true,
        continueComments: true,
        styleActiveLine: true,
      },
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.currentFile.filePath !== this.props.currentFile.filePath) {
      return true;
    }

    if (nextProps.editor !== this.props.editor) {
      return true;
    }

    if (nextProps.bricks.length !== this.props.bricks.length) {
      return true;
    }

    if (nextState.options.mode !== this.state.options.mode) {
      return true;
    }

    return false;
  }

  componentWillMount() {
    this.setState({ code: getState().session.currentSession.code });
  }

  componentWillReceiveProps(nextProps) {
    const currentFile = this.props.currentFile.filePath;
    const nextFile = nextProps.currentFile.filePath;

    const currentBricks = this.props.bricks;
    const nextBricks = nextProps.bricks;

    const didFileChange = currentFile !== nextFile;

    if (nextBricks.length > currentBricks.length) {
      this.parseCode(nextBricks);
    }

    const nextGeneratedCode = nextProps.generatedCode;

    if (
      nextGeneratedCode
      && nextGeneratedCode !== this.props.generatedCode
      && nextGeneratedCode !== this.props.editor.getValue()
    ) {
      this.setState({ code: nextGeneratedCode }, () => {
        // Make the editor fixed. Would move otherwise after `setValue`
        const previousCursor = this.props.editor.getCursor();
        const previousScroll = this.props.editor.getScrollInfo();

        // Allow optional undo/redo operations for the editor
        this.props.editor.operation(() => {
          this.props.editor.setValue(nextGeneratedCode);
        });

        this.props.editor.setCursor(previousCursor);
        this.props.updateCode(nextGeneratedCode);
        this.props.updateGeneratedCode(null);
        this.parseCode(nextBricks);
        this.props.editor.scrollTo(previousScroll.left, previousScroll.top)
      });
    }

    if (didFileChange) {
      const code = nextProps.code;
      const language = file.whichLanguage(nextFile);
      const options = this.state.options;
      options.mode = language;

      this.setState({ options }, () => {
        this.props.editor.operation(() => this.props.editor.setValue(code));
        this.props.editor.focus();
      });
    }
  }

  getAnnotations = (value, updateLinting, options) => {
    if (!value.trim().length) {
      return updateLinting([]);
    }

    options.callback(value, errors => updateLinting(errors));
  };

  /**
   * Gets the current keyMap of the editor.
   */
  keyMap = () => (config().editor.vim ? 'vim' : 'sublime');

  /**
   * TODO
   * Called for linting
   */
  linter = (code, resolver) => {
    // if (this.props.linter && this.props.linter.lint) {
    //   perf.debounce(this.props.linter.lint.bind(this, ApplicationManager, resolver), 3000);
    // }
  };

  editorDidMount = editor => {
    this.props.updateEditor(editor);
  };

  /**
   * Triggered when editor is focused/unfocused.
   */
  onFocus = focused => {
    const { options } = this.state;
    this.setState({ options: { ...options, keyMap: this.keyMap() } });
  };

  /**
   * Update cursor position, cursor selection.
   */
  onCursor = (editor) => {
    const selection = editor.getDoc().getSelection();

    if (selection.length > 0) {
      const cursor = editor.getCursor();
      const from = editor.getCursor(true);
      const to = editor.getCursor(false);
      const distance = selection.length;
      cursor.selection = { from, to, distance };
      this.setState({ cursor });
    }
  };

  /**
   * Triggered whenever code has changed.
   */
  updateCode = (editor, data, code) => {
    this.setState({ code });

    if (data.origin !== 'setValue' && !editor.state.completionActive) {
      CodeMirror.commands.autocomplete(editor, null, { completeSingle: false });
    }
  };

  handleMouseLeave = () => {
    if (this.props.code !== this.state.code) {
      this.props.updateCode(this.state.code);
      this.parseCode();
    }
  };

  /**
   * Called to update all the current bricks's information.
   * @param {Array} currentBricks
   */
  parseCode = currentBricks => {
    currentBricks = currentBricks || this.props.bricks;

    // If there is no brick attached to the current file,
    // or if the language can't be parsed, skip the parsing.
    if (
      !currentBricks.length
      || !file.isJavascript(this.props.currentFile.filePath)
    ) {
      return;
    }

    try {
      const code = this.state.code;
      const parsed = j(code);
      const state = getState();
      currentBricks.forEach(brick => brick.prepareToEvaluate(code, parsed, state));
    } catch (error) {
      console.warn("[Parser] Couldn't parse code");
    }
  };

  render() {
    return (
      <div className="Editor" onMouseLeave={this.handleMouseLeave}>
        <CodeMirrorEditor
          editorDidMount={this.editorDidMount}
          onChange={this.updateCode}
          options={this.state.options}
          onFocus={this.onFocus}
          autoFocus={true}
          autoScroll={false}
        />
        <EditorFooter cursor={this.state.cursor} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  editor: state.session.editor,
  linter: state.project.linter,
  code: state.session.currentSession.code,
  generatedCode: state.session.currentSession.generatedCode,
  currentFile: state.session.currentFile,
  bricks: state.session.currentSession.bricks,
});

const mapDispatchToProps = dispatch => ({
  updateCode: code => dispatch.session.updateCode({ code }),
  updateGeneratedCode: code => dispatch.session.updateGeneratedCode({ code }),
  updateEditor: editor => dispatch.session.updateEditor({ editor }),
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
