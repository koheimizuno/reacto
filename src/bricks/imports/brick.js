import Brick from '../baseBrick';
import ImportsRenderer from './renderer';
import { CodeOperation, Commit, j } from '../../utils';

class ImportsBrick extends Brick {
  constructor() {
    super();
    this.name = 'Imports';
    this.renderer = ImportsRenderer;
    this.state = {
      imports: [],
      deletedImports: [],
    };
  }

  /**
   * Main callback
   * Called every time code has changed
   */
  evaluate = (code, parsed, store) => {
    this.parseCode();
  }

  /**
   * Handy method to update the brick's state
   */
  parseCode = () => {
    const imports = this.findImports();
    this.setState({ imports });
  }

  /**
   * Find all imports from the current file
   */
  findImports = () => {
    const parsed = this.parsed;
    let imports = [];

    parsed
      .find(j.ImportDeclaration)
      .forEach(path => {
        const node = path.node;
        let imported = {};

        if (node.source.value.substr(0, 1) === '.') {
          imported.local = true;
        } else {
          imported.local = false;
        }

        imported.name = node.source.value;
        imported.node = node;

        imports.push(imported);
      });

    return imports;
  }

  /**
   * Renderer method
   * Delete a given import.
   * Actually sends it to the "plugin's trash"
   *
   * @param {object} imported
   */
  deleteImport = (imported) => {
    let { imports, deletedImports } = this.state;
    let indexToDelete = -1;

    for (let i = 0; i < imports.length; i++) {
      const currentImport = imports[i];
      if (currentImport.name === imported.name) {
        indexToDelete = i;
      }
    }

    if (indexToDelete === -1) return;

    // Remove it from our local list, send it to the local trash
    imports.splice(indexToDelete, 1);
    deletedImports.push(imported);

    // Remove the import declaration from the code
    const removeImport = CodeOperation.findAndRemove(
      j.ImportDeclaration,
      { source: { value: imported.name } }
    );

    new Commit(removeImport).run();
    this.setState({ imports, deletedImports });
  }

  /**
   * Renderer method
   * Restore a given import
   *
   * @param {object} imported
   */
  restoreImport = (imported) => {
    let { deletedImports } = this.state;
    let indexToDelete = -1;

    for (let i = 0; i < deletedImports.length; i++) {
      const currentImport = deletedImports[i];
      if (currentImport.name === imported.name) {
        indexToDelete = i;
      }
    }

    if (indexToDelete === -1) return;

    // Remove it from our local list, send it to the local trash
    deletedImports.splice(indexToDelete, 1);

    this.setState({ deletedImports });

    const restoreIt = CodeOperation.importModule({ node: imported.node });
    new Commit(restoreIt).run();
  }

  //
  // /**
  //  * Determine whether a given node is a manual binder such as:
  //  * `this.method = this.method.bind(this)`
  //  *
  //  * @param {Node} node current node
  //  * @return {bool}
  //  * @see {@link https://github.com/reactjs/react-codemod/blob/master/transforms/manual-bind-to-arrow.js#L84}
  //  */
  // isBinder = (node) => {
  //   return (
  //     node.left
  //     && node.right
  //     && node.left.type === 'MemberExpression'
  //     && (
  //       // this
  //       node.left.object.type === 'ThisExpression'
  //       // self
  //       || node.left.object.type === 'Identifier'
  //       && node.left.object.name === 'self'
  //       // (this: any)
  //       || node.left.object.type === 'TypeCastExpression'
  //       && node.left.object.expression.type === 'ThisExpression'
  //     )
  //     && node.left.property.type === 'Identifier'
  //     && node.right.type === 'CallExpression'
  //     && node.right.callee.type === 'MemberExpression'
  //     && node.right.callee.property.type === 'Identifier'
  //     && node.right.callee.property.name === 'bind'
  //     && node.right.callee.object.type === 'MemberExpression'
  //     && node.right.callee.object.property.type === 'Identifier'
  //     && node.right.callee.object.object.type === 'ThisExpression'
  //     && node.left.property.name === node.right.callee.object.property.name
  //     && true
  //   );
  // }
  //
  // /**
  //  * Is the current path node a constructor?
  //  *
  //  * @param {NodePath} path current path
  //  * @return {bool}
  //  */
  // filterNotConstructor = (path) => path.node.kind !== 'constructor';
  //
  // /**
  //  * Is the current node a static property?
  //  *
  //  * @param {NodePath} path current path
  //  * @return {bool}
  //  */
  // filterNonStaticProperty = (path) => !path.node.static;
  //
  // /**
  //  * Easily sort all the methods' name. Improve display for renderer
  //  *
  //  * @param
  //  * @return {Array[Method]}
  //  */
  // sortMethodsByName(methods) {
  //   const compare = (a, b) => a.name > b.name;
  //   return methods.sort(compare);
  // }
  //
  // /**
  //  * Find all class methods from editor's current code and feed state
  //  */
  // findMethods = () => {
  //   const parsed = j(this.code);
  //
  //   let methods = [];
  //   let constructorBindedMethods = [];
  //
  //   // Find: inside constructor(), every `.bind`ed method
  //   parsed
  //     .find(j.ClassMethod)
  //     .filter(path => !this.filterNotConstructor(path))
  //     .forEach(path => {
  //       const constructorNodes = path.node.body.body;
  //
  //       for (const node of constructorNodes) {
  //         if (this.isBinder(node.expression)) {
  //           constructorBindedMethods.push(node.expression.left.property.name);
  //         }
  //       }
  //     });
  //
  //   // Find: method() { ... }
  //   parsed
  //     .find(j.ClassMethod)
  //     .filter(this.filterNotConstructor)
  //     .filter(this.filterNonStaticProperty)
  //     .forEach(path => {
  //       const name = path.node.key.name;
  //       let isBinded;
  //
  //       switch (this.state.bindMethod) {
  //         case ImportsBrick.bindMethods.constructor:
  //           isBinded = constructorBindedMethods.includes(name);
  //           break;
  //
  //         case ImportsBrick.bindMethods.arrowFunction:
  //           // Because it could be binded inside the constructor
  //           // But it doesn't follow the current binding method
  //           isBinded = false;
  //           break;
  //       }
  //
  //       const method = { name, isBinded, isArrowFunction: false };
  //       methods.push(method);
  //     });
  //
  //   // Find: method = () => { ... }
  //   parsed
  //     .find(j.ClassProperty, { value: { type: 'ArrowFunctionExpression'} })
  //     .filter(this.filterNotConstructor)
  //     .filter(this.filterNonStaticProperty)
  //     .forEach(path => {
  //       const name = path.node.key.name;
  //       const method = { name, isBinded: true, isArrowFunction: true };
  //       methods.push(method);
  //     });
  //
  //   methods = this.sortMethodsByName(methods);
  //
  //   return methods;
  // }
  //
  // /**
  //  * Renderer method
  //  * Allow to set a different binding method
  //  *
  //  * @param {ImportsBrick.bindMethods} bindMethod new binding method
  //  */
  // bindMethodChange(bindMethod) {
  //   bindMethod = ImportsBrick.bindMethods[bindMethod];
  //   this.setState({ bindMethod });
  //   this.parseCode();
  // }
  //
  // /**
  //  * Renderer method
  //  * Toggle one method's binding.
  //  * Can only bind a method that isn't an arrow function
  //  *
  //  * @param {Method} method method to bind or unbind
  //  */
  // toggleBindMethod = (method) => {
  //   const { name, isBinded, isArrowFunction } = method;
  //
  //   if (isArrowFunction) {
  //     return;
  //   }
  //
  //   switch (this.state.bindMethod) {
  //     case ImportsBrick.bindMethods.constructor:
  //       if (isBinded) {
  //         this.removeBindingFromConstructor(method);
  //       } else {
  //         this.addBindingToConstructor(method);
  //       }
  //       break;
  //
  //     case ImportsBrick.bindMethods.arrowFunction:
  //       if (!isBinded) {
  //         this.methodToArrowFunction(method);
  //       }
  //       break;
  //   }
  // }
  //
  // /**
  //  * Remove a `this.method = this.method.bind(this)` line to `constructor(...)`
  //  *
  //  * @param {Method} method
  //  */
  // removeBindingFromConstructor = (method) => {
  //   const removeBinding = new CodeOperation((parsed) => {
  //     return parsed
  //       .find(j.ClassMethod)
  //       .filter(path => !this.filterNotConstructor(path))
  //       .forEach(path => {
  //         let indexToRemove;
  //         const constructorNodes = path.node.body.body;
  //
  //         for (let i = 0; i < constructorNodes.length; i++) {
  //           const node = constructorNodes[i];
  //
  //           if (
  //             this.isBinder(node.expression)
  //             && method.name === node.expression.left.property.name
  //           ) {
  //             indexToRemove = i;
  //           }
  //         }
  //
  //         if (!isNaN(indexToRemove)) {
  //           constructorNodes.splice(indexToRemove, 1);
  //         }
  //
  //         // If only a `super(props)` call remains
  //         if (constructorNodes.length === 1) {
  //           const supposedSuperCallNode = constructorNodes[0];
  //
  //           if (ast.isSuperCall(constructorNodes[0])) {
  //             j(path).remove();
  //           }
  //         }
  //
  //         return path;
  //       });
  //   });
  //
  //   new Commit(removeBinding).run();
  // }
  //
  // /**
  //  * Add a `this.method = this.method.bind(this)` line to `constructor(...)`
  //  *
  //  * @param {Method} method
  //  */
  // addBindingToConstructor = (method) => {
  //   const expression = `this.${method.name} = this.${method.name}.bind(this);`;
  //   const binding = j.template.statement([expression + '\n']);
  //
  //   const addBinding = new CodeOperation((parsed) => {
  //     const findConstructor = parsed
  //       .find(j.ClassMethod)
  //       .filter(path => !this.filterNotConstructor(path));
  //
  //     if (findConstructor.size() === 0) {
  //       return parsed.find(j.ClassBody).forEach(path => {
  //         const newConstructor = ast.createComponentConstructor(expression);
  //         const bodyNodes = ast.sortClassBodyNodes([newConstructor, ...path.value.body]);
  //         const classbody = j.classBody(bodyNodes);
  //         return path.replace(classbody);
  //       });
  //     } else {
  //       return findConstructor.forEach(path => {
  //         path.node.body.body.push(binding);
  //         return path;
  //       });
  //     }
  //   });
  //
  //   new Commit(addBinding).run();
  // }
  //
  // /**
  //  * Transform a given node to an arrow function.
  //  * Useful here as we turn class methods into arrow properties
  //  *
  //  * @param {Node} node
  //  * @return {Node}
  //  * @see {@link https://github.com/reactjs/react-codemod/blob/master/transforms/manual-bind-to-arrow.js#L53}
  //  */
  // createArrowProperty = (node) => {
  //   const property = j.classProperty(
  //     j.identifier(node.key.name),
  //     ast.createArrowFunctionExpression(node),
  //     null,
  //     false
  //   );
  //
  //   ast.withComments(property, node);
  //
  //   return property;
  // }
  //
  // /**
  //  * Transform a class `method()` to an arrow function `method = () => { ... }`
  //  *
  //  * @param {Method} method
  //  */
  // methodToArrowFunction = (method) => {
  //   const toArrowFunction = new CodeOperation((parsed) => {
  //     return parsed
  //       .find(j.ClassMethod)
  //       .filter(path => path.node.key.name === method.name)
  //       .replaceWith(path => this.createArrowProperty(path.node));
  //   });
  //
  //   new Commit(toArrowFunction).run();
  //
  //   if (!method.isArrowFunction) {
  //     this.removeBindingFromConstructor(method);
  //   }
  // }
}

export default ImportsBrick;
