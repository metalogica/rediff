const { exec } = require('child_process');
const path = require('path');
const vscode = require('vscode');

class Viewport {
  constructor(options) {
    this.elements = options.elements;
  }

  async renderInitial() {
    const diffContent = this.elements.map(element => renderContent({ 
      elementContent: element.minimalContent,
      elementFilename: element.filename,
      elementType: element.type,
      isVisible: element.visible,
    })).join('');

    const document = await vscode.workspace.openTextDocument({
      content: diffContent,
      language: 'diff'
    });

    await vscode.window.showTextDocument(document);
    vscode.languages.setTextDocumentLanguage(document, 'diff');
  }

  renderOnFilenameChange(clickedElement) {
    this.elements = this.elements.map(element => ({
      ...element, 
      visible: clickedElement.id === element.id ? !element.visible : element.visible, 
    }));

    const diffContent = this.elements.map(element => renderContent({ 
      elementContent: element.minimalContent,
      elementFilename: element.filename,
      elementType: element.type,
      isVisible: element.visible,
    })).join('');

    this._refreshView(diffContent);
  }
  
  renderOnDiffTypeChange(diffType) {
    const diffContent = this.elements.map(element => renderContent({ 
      elementContent: diffType === 'Unified' ? element.unifiedContent : element.minimalContent,
      elementFilename: element.filename,
      elementType: element.type,
      isVisible: element.visible,
    })).join('');

    this._refreshView(diffContent);
  }

  renderOnModuleTypeChange({ moduleType, visible }) {
    this.elements = this.elements.map(element => ({
      ...element, 
      visible: element.type === moduleType ? visible : element.visible, 
    }));

    const diffContent = this.elements.map(element => renderContent({ 
      elementContent: element.minimalContent,
      elementFilename: element.filename,
      elementType: element.type,
      isVisible: element.type === moduleType ? visible : element.visible,
    })).join('');

    this._refreshView(diffContent); 
  }

  _refreshView(diffContent) {
    const activeTextEditor = vscode.window.activeTextEditor;

    vscode.window.activeTextEditor.edit(editBuilder => {
      const documentRange = new vscode.Range(
        0,
        0,
        activeTextEditor.document.lineCount - 1,
        activeTextEditor.document.lineAt(activeTextEditor.document.lineCount - 1).text.length
      );
      editBuilder.replace(documentRange, diffContent);
    });
  }
}

class FilenamesProvider {
  constructor(options) {
    this.elements = options.elements;
    this.hiddenTypes = [];

    this.viewport = options.viewport;
    this.documentUri = vscode.window.activeTextEditor.document.uri;

    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getChildren(element) {
    if (!element) {
      return [...this.elements.sort((a, b) => a.name < b.name )];
    }
  }

  getTreeItem(element) {
    if (this.hiddenTypes.includes(element.type)) {
      return;
    }

    const treeItem = new vscode.TreeItem(element.filename);

    treeItem.visible = element.visible;
    treeItem.iconPath = element.visible ? path.join(__filename, '..', 'media', 'checked.svg') : path.join(__filename, '..', 'media', 'unchecked.svg');
    
    treeItem.command = {
      command: 'filenames.refresh',
      title: '',
      arguments: [element]
    };

    return treeItem;
  }

  async refresh(clickedElement) {
    this.elements = this.elements.map(element => ({
      ...element, 
      visible: clickedElement.id === element.id ? !element.visible : element.visible, 
    }));
    
    this._onDidChangeTreeData.fire();
    
    this.viewport.renderOnFilenameChange({ id: clickedElement.id });
  }
  
  refreshTreeView({ type, visible }) {
    if (visible) {
      this.hiddenTypes = this.hiddenTypes.filter(hiddenType => hiddenType !== type);
    } else {
      this.hiddenTypes.push(type);
    }
    
    this._onDidChangeTreeData.fire();
  }
}

class DiffTypesProvider {
  constructor(options) {
    this.elements = options.elements;
    this.viewport = options.viewport;
    this.diffTypes = [
      { name: 'Minimal', visible: true }, 
      { name: 'Unified', visible: false }
    ];
    this.currentDiffType = 'Minimal';

    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getChildren(element) {
    if (!element) {
      return this.diffTypes;
    } 
  }

  getTreeItem(diffType) {
    const treeItem = new vscode.TreeItem(diffType.name);

    treeItem.visible = diffType.visible;
    treeItem.iconPath = diffType.visible ? path.join(__filename, '..', 'media', 'checked.svg') : path.join(__filename, '..', 'media', 'unchecked.svg');

    treeItem.command = {
      command: 'diffTypes.refresh',
      title: '',
      arguments: [diffType]
    };

    return treeItem;
  }

  refresh(clickedDiffType) {
    if (clickedDiffType.name === this.currentDiffType) {
      return;
    }

    this.diffTypes = this.diffTypes.map(diffType => ({
      name: diffType.name, 
      visible: !diffType.visible,
    }));

    this.currentDiffType = clickedDiffType.name;

    this._onDidChangeTreeData.fire();

    this.viewport.renderOnDiffTypeChange(clickedDiffType.name)
  }
}

class ModuleTypesProvider {
  constructor(options) {
    const distinctModuleTypes = Array.from(
      new Set(
        options.elements.map(element => element.type)
      )
    );

    this.moduleTypes = distinctModuleTypes.map(moduleType => ({ name: moduleType, visible: true }));
    this.viewport = options.viewport;
    this.filenamesProvider = options.filenamesProvider;

    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getChildren(element) {
    if (!element) {
      return this.moduleTypes;
    }
  }

  getTreeItem(moduleType) {
    const treeItem = new vscode.TreeItem(moduleType.name);

    treeItem.visible = moduleType.visible;
    treeItem.iconPath = moduleType.visible ? path.join(__filename, '..', 'media', 'checked.svg') : path.join(__filename, '..', 'media', 'unchecked.svg');

    treeItem.command = {
      command: 'moduleTypes.refresh',
      title: '',
      arguments: [moduleType]
    };

    return treeItem;
  }

  async refresh(clickedModuleType) {
    this.moduleTypes = this.moduleTypes.map(moduleType => ({
      name: moduleType.name, 
      visible: moduleType.name === clickedModuleType.name ? !moduleType.visible : moduleType.visible, 
    }));
    
    this._onDidChangeTreeData.fire();

    this.filenamesProvider.refreshTreeView({ type: clickedModuleType.name, visible: !clickedModuleType.visible });

    this.viewport.renderOnModuleTypeChange({ moduleType: clickedModuleType.name, visible: !clickedModuleType.visible });
  }
}

const execSync = async (shellCommand) => await new Promise((resolve, reject) => 
    exec(shellCommand, (error, stdout, stderror) => {
      if (stdout) {
        return resolve(stdout);
      }

      if (error) {
        return reject(error);
      }

      if (stderror) {
        return reject(error);
      }
    }
));

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {  
  const loadDiff = vscode.commands.registerCommand('rediff.loadBranch', async () => {
    const branchName = await vscode.window.showInputBox({
      prompt: 'Please provide a branch name: ',
      placeHolder: 'Input',
    });

    const retoolDir = vscode.workspace.getConfiguration('rediff').retoolDir; 
    const shellCommand = `cd ${retoolDir} && git diff --no-prefix -U1000 master..${branchName}`;

    const buffer = await execSync(shellCommand)
      .then(stdout => stdout.toString('utf-8'))
      .catch(error => {
        console.error(error);

        return false;
      });

    if (!buffer) {
      vscode.window.showInformationMessage('Unable to load file.');

      return;
    }

    let elements = buffer
      .split(/^diff --git.*$/gm)
      .map(resolveElements)
      .filter(element => element.minimalContent.length)

    const viewport = new Viewport({ elements });
    await viewport.renderInitial();

    const filenamesProvider = new FilenamesProvider({ 
      elements,
      viewport
    });
    vscode.window.registerTreeDataProvider(
      'filenames',
      filenamesProvider 
    );
    vscode.commands.registerCommand('filenames.refresh', (element) => filenamesProvider.refresh(element));

    const diffTypesProvider = new DiffTypesProvider({ 
      elements,
      viewport
    });
    vscode.window.registerTreeDataProvider(
      'diffTypes',
      diffTypesProvider,
    );
    vscode.commands.registerCommand('diffTypes.refresh', (diffType) => diffTypesProvider.refresh(diffType));

    const moduleTypesProvider = new ModuleTypesProvider({ 
      elements,
      viewport,
      filenamesProvider
    });
    vscode.window.registerTreeDataProvider(
      'moduleTypes',
      moduleTypesProvider 
    );
    vscode.commands.registerCommand('moduleTypes.refresh', (element) => moduleTypesProvider.refresh(element));
  });

  context.subscriptions.push(loadDiff);
}

const parseMinimalDiff = line => {
  const isDiff = /^\+[^+].*$|^\-[^-].*$/.test(line);
  if (isDiff) {
    return line;
  }

  return '';
}


const removeLines = line => {
  const ignoredPatterns = [
    /row/,
    /col/,
    /width/,
    /mobileAppSettings/,
  ];
  if (ignoredPatterns.some(pattern => pattern.test(line))) {
    return '';
  }

  return line;
}

const resolveElements = text => {
  const type = text
    .match(/^\+[tT]ype:\s(.+)|[tT]ype:\s(.+)$/gm)
    ?.[0]
    ?.split(':')
    ?.[1]
    ?.replace(/\s/, '') ?? 'Unknown';

  const minimalContent = text
    .split('\n')
    .map(parseMinimalDiff)
    .map(removeLines)
    .filter(Boolean)
    .join('\n');

  const element = {
    id: Math.floor(Math.random() * 100),
    visible: true,
    type,
    minimalContent,
    unifiedContent: text,
  };

  const filename = text.match(/\w+\.yml/);
  if (filename) {
    element.filename = filename[0];
  } 

  return element;
}

const renderContent = ({ elementContent, elementFilename, elementType, isVisible }) => {
  if (!isVisible) {
    return '';
  }

  const formattedContent = `Filename: ${elementFilename}\nType: ${elementType}\n${elementContent}\n\n\n`;

  return formattedContent;
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
