// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */
self.SourcesTestRunner = self.SourcesTestRunner || {};

SourcesTestRunner.startDebuggerTest = async function(callback, quiet) {
  console.assert(TestRunner.debuggerModel.debuggerEnabled(), 'Debugger has to be enabled');

  if (quiet !== undefined) {
    SourcesTestRunner.quiet = quiet;
  }

  await TestRunner.showPanel('sources');
  TestRunner.addSniffer(SDK.DebuggerModel.prototype, 'pausedScript', SourcesTestRunner.pausedScript, true);
  TestRunner.addSniffer(SDK.DebuggerModel.prototype, 'resumedScript', SourcesTestRunner.resumedScript, true);
  TestRunner.safeWrap(callback)();
};

SourcesTestRunner.startDebuggerTestPromise = function(quiet) {
  let cb;
  const p = new Promise(fullfill => {
    cb = fullfill;
  });
  SourcesTestRunner.startDebuggerTest(cb, quiet);
  return p;
};

SourcesTestRunner.completeDebuggerTest = function() {
  self.Common.settings.moduleSetting('breakpointsActive').set(true);
  SourcesTestRunner.resumeExecution(TestRunner.completeTest.bind(TestRunner));
};

window.addEventListener('unhandledrejection', e => {
  TestRunner.addResult('FAIL: Uncaught exception in promise: ' + e + ' ' + e.stack);
  SourcesTestRunner.completeDebuggerTest();
});

SourcesTestRunner.runDebuggerTestSuite = function(testSuite) {
  const testSuiteTests = testSuite.slice();

  function runner() {
    if (!testSuiteTests.length) {
      SourcesTestRunner.completeDebuggerTest();
      return;
    }

    const nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    TestRunner.safeWrap(nextTest)(runner, runner);
  }

  SourcesTestRunner.startDebuggerTest(runner);
};

SourcesTestRunner.runTestFunction = function() {
  TestRunner.evaluateInPageAnonymously('scheduleTestFunction()');
  TestRunner.addResult('Set timer for test function.');
};

SourcesTestRunner.runTestFunctionAndWaitUntilPaused = function(callback) {
  SourcesTestRunner.runTestFunction();
  SourcesTestRunner.waitUntilPaused(callback);
};

SourcesTestRunner.runTestFunctionAndWaitUntilPausedPromise = function() {
  return new Promise(SourcesTestRunner.runTestFunctionAndWaitUntilPaused);
};

SourcesTestRunner.runAsyncCallStacksTest = function(totalDebuggerStatements, maxAsyncCallStackDepth) {
  const defaultMaxAsyncCallStackDepth = 32;
  SourcesTestRunner.setQuiet(true);
  SourcesTestRunner.startDebuggerTest(step1);

  async function step1() {
    await TestRunner.DebuggerAgent.setAsyncCallStackDepth(maxAsyncCallStackDepth || defaultMaxAsyncCallStackDepth);
    SourcesTestRunner.runTestFunctionAndWaitUntilPaused(didPause);
  }

  let step = 0;
  const callStacksOutput = [];

  async function didPause(callFrames, reason, breakpointIds, asyncStackTrace) {
    ++step;
    callStacksOutput.push(await SourcesTestRunner.captureStackTraceIntoString(callFrames, asyncStackTrace) + '\n');

    if (step < totalDebuggerStatements) {
      SourcesTestRunner.resumeExecution(SourcesTestRunner.waitUntilPaused.bind(SourcesTestRunner, didPause));
    } else {
      TestRunner.addResult('Captured call stacks in no particular order:');
      callStacksOutput.sort();
      TestRunner.addResults(callStacksOutput);
      SourcesTestRunner.completeDebuggerTest();
    }
  }
};

SourcesTestRunner.waitUntilPausedNextTime = function(callback) {
  SourcesTestRunner.waitUntilPausedCallback = TestRunner.safeWrap(callback);
};

SourcesTestRunner.waitUntilPaused = function(callback) {
  callback = TestRunner.safeWrap(callback);

  if (SourcesTestRunner.pausedScriptArguments) {
    callback.apply(callback, SourcesTestRunner.pausedScriptArguments);
  } else {
    SourcesTestRunner.waitUntilPausedCallback = callback;
  }
};

SourcesTestRunner.waitUntilPausedPromise = function() {
  return new Promise(resolve => SourcesTestRunner.waitUntilPaused(resolve));
};

SourcesTestRunner.waitUntilResumed = function(callback) {
  callback = TestRunner.safeWrap(callback);

  if (!SourcesTestRunner.pausedScriptArguments) {
    callback();
  } else {
    SourcesTestRunner.waitUntilResumedCallback = callback;
  }
};

SourcesTestRunner.waitUntilResumedPromise = function() {
  return new Promise(resolve => SourcesTestRunner.waitUntilResumed(resolve));
};

SourcesTestRunner.resumeExecution = function(callback) {
  if (UI.panels.sources.paused()) {
    UI.panels.sources.togglePause();
  }

  SourcesTestRunner.waitUntilResumed(callback);
};

SourcesTestRunner.waitUntilPausedAndDumpStackAndResume = function(callback, options) {
  SourcesTestRunner.waitUntilPaused(paused);
  TestRunner.addSniffer(Sources.SourcesPanel.prototype, 'updateDebuggerButtonsAndStatusForTest', setStatus);
  let caption;
  let callFrames;
  let asyncStackTrace;

  function setStatus() {
    const statusElement = this.element.querySelector('.paused-message');
    caption = statusElement.deepTextContent();

    if (callFrames) {
      step1();
    }
  }

  async function paused(frames, reason, breakpointIds, async) {
    callFrames = frames;
    asyncStackTrace = async;

    if (typeof caption === 'string') {
      await step1();
    }
  }

  async function step1() {
    await SourcesTestRunner.captureStackTrace(callFrames, asyncStackTrace, options);
    TestRunner.addResult(TestRunner.clearSpecificInfoFromStackFrames(caption));
    TestRunner.deprecatedRunAfterPendingDispatches(step2);
  }

  function step2() {
    SourcesTestRunner.resumeExecution(TestRunner.safeWrap(callback));
  }
};

SourcesTestRunner.stepOver = function() {
  queueMicrotask(function() {
    UI.panels.sources.stepOver();
  });
};

SourcesTestRunner.stepInto = function() {
  queueMicrotask(function() {
    UI.panels.sources.stepInto();
  });
};

SourcesTestRunner.stepIntoAsync = function() {
  queueMicrotask(function() {
    UI.panels.sources.stepIntoAsync();
  });
};

SourcesTestRunner.stepOut = function() {
  queueMicrotask(function() {
    UI.panels.sources.stepOut();
  });
};

SourcesTestRunner.togglePause = function() {
  queueMicrotask(function() {
    UI.panels.sources.togglePause();
  });
};

SourcesTestRunner.waitUntilPausedAndPerformSteppingActions = function(actions, callback) {
  callback = TestRunner.safeWrap(callback);
  SourcesTestRunner.waitUntilPaused(didPause);

  async function didPause(callFrames, reason, breakpointIds, asyncStackTrace) {
    let action = actions.shift();

    if (action === 'Print') {
      await SourcesTestRunner.captureStackTrace(callFrames, asyncStackTrace);
      TestRunner.addResult('');

      while (action === 'Print') {
        action = actions.shift();
      }
    }

    if (!action) {
      callback();
      return;
    }

    TestRunner.addResult('Executing ' + action + '...');

    switch (action) {
      case 'StepInto':
        SourcesTestRunner.stepInto();
        break;
      case 'StepOver':
        SourcesTestRunner.stepOver();
        break;
      case 'StepOut':
        SourcesTestRunner.stepOut();
        break;
      case 'Resume':
        SourcesTestRunner.togglePause();
        break;
      default:
        TestRunner.addResult('FAIL: Unknown action: ' + action);
        callback();
        return;
    }

    SourcesTestRunner.waitUntilResumed(
        (actions.length ? SourcesTestRunner.waitUntilPaused.bind(SourcesTestRunner, didPause) : callback));
  }
};

SourcesTestRunner.captureStackTrace = async function(callFrames, asyncStackTrace, options) {
  TestRunner.addResult(await SourcesTestRunner.captureStackTraceIntoString(callFrames, asyncStackTrace, options));
};

SourcesTestRunner.captureStackTraceIntoString = async function(callFrames, asyncStackTrace, options) {
  const results = [];
  options = options || {};

  async function printCallFrames(callFrames, locationFunction, returnValueFunction) {
    let printed = 0;

    for (let i = 0; i < callFrames.length; i++) {
      const frame = callFrames[i];
      const location = locationFunction.call(frame);
      const script = location.script();
      const uiLocation = await self.Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);
      const isFramework =
          uiLocation ? self.Bindings.ignoreListManager.isUserIgnoreListedURL(uiLocation.uiSourceCode.url()) : false;

      if (options.dropFrameworkCallFrames && isFramework) {
        continue;
      }

      let url;
      let lineNumber;

      if (uiLocation && uiLocation.uiSourceCode.project().type() !== Workspace.projectTypes.Debugger) {
        url = uiLocation.uiSourceCode.name();
        lineNumber = uiLocation.lineNumber + 1;
      } else {
        url = Bindings.displayNameForURL(script.sourceURL);
        lineNumber = location.lineNumber + 1;
      }

      let s = ((isFramework ? '  * ' : '    ')) + printed++ + ') ' + frame.functionName + ' (' + url +
          ((options.dropLineNumbers ? '' : ':' + lineNumber)) + ')';
      s = s.replace(/scheduleTestFunction.+$/, 'scheduleTestFunction <omitted>');
      results.push(s);

      if (options.printReturnValue && returnValueFunction && returnValueFunction.call(frame)) {
        results.push('       <return>: ' + returnValueFunction.call(frame).description);
      }

      if (frame.functionName === 'scheduleTestFunction') {
        const remainingFrames = callFrames.length - 1 - i;

        if (remainingFrames) {
          results.push('    <... skipped remaining frames ...>');
        }

        break;
      }
    }

    return printed;
  }

  function runtimeCallFramePosition() {
    return new SDK.DebuggerModel.Location(TestRunner.debuggerModel, this.scriptId, this.lineNumber, this.columnNumber);
  }

  results.push('Call stack:');
  await printCallFrames(
      callFrames, SDK.DebuggerModel.CallFrame.prototype.location, SDK.DebuggerModel.CallFrame.prototype.returnValue);

  while (asyncStackTrace) {
    results.push('    [' + (asyncStackTrace.description || 'Async Call') + ']');
    const printed = await printCallFrames(asyncStackTrace.callFrames, runtimeCallFramePosition);

    if (!printed) {
      results.pop();
    }

    asyncStackTrace = asyncStackTrace.parent;
  }

  return results.join('\n');
};

SourcesTestRunner.dumpSourceFrameContents = function(sourceFrame) {
  TestRunner.addResult('==Source frame contents start==');
  const {baseDoc} = sourceFrame;

  for (let i = 1; i <= baseDoc.lines; ++i) {
    const {text} = baseDoc.line(i);
    TestRunner.addResult(text);
  }

  TestRunner.addResult('==Source frame contents end==');
};

SourcesTestRunner.pausedScript = function(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
  if (!SourcesTestRunner.quiet) {
    TestRunner.addResult('Script execution paused.');
  }

  const debuggerModel = this.target().model(SDK.DebuggerModel);
  SourcesTestRunner.pausedScriptArguments = [
    SDK.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, callFrames), reason, breakpointIds, asyncStackTrace,
    auxData
  ];

  if (SourcesTestRunner.waitUntilPausedCallback) {
    const callback = SourcesTestRunner.waitUntilPausedCallback;
    delete SourcesTestRunner.waitUntilPausedCallback;
    setTimeout(() => callback.apply(callback, SourcesTestRunner.pausedScriptArguments));
  }
};

SourcesTestRunner.resumedScript = function() {
  if (!SourcesTestRunner.quiet) {
    TestRunner.addResult('Script execution resumed.');
  }

  delete SourcesTestRunner.pausedScriptArguments;

  if (SourcesTestRunner.waitUntilResumedCallback) {
    const callback = SourcesTestRunner.waitUntilResumedCallback;
    delete SourcesTestRunner.waitUntilResumedCallback;
    callback();
  }
};

SourcesTestRunner.showUISourceCode = function(uiSourceCode, callback) {
  const panel = UI.panels.sources;
  panel.showUISourceCode(uiSourceCode);
  const sourceFrame = panel.visibleView;

  if (sourceFrame.loaded) {
    callback(sourceFrame);
  } else {
    TestRunner.addSniffer(sourceFrame, 'setContent', callback && callback.bind(null, sourceFrame));
  }
};

SourcesTestRunner.showUISourceCodePromise = function(uiSourceCode) {
  let fulfill;
  const promise = new Promise(x => {
    fulfill = x;
  });
  SourcesTestRunner.showUISourceCode(uiSourceCode, fulfill);
  return promise;
};

SourcesTestRunner.showScriptSource = function(scriptName, callback) {
  SourcesTestRunner.waitForScriptSource(scriptName, onScriptSource);

  function onScriptSource(uiSourceCode) {
    SourcesTestRunner.showUISourceCode(uiSourceCode, callback);
  }
};

SourcesTestRunner.showScriptSourcePromise = function(scriptName) {
  return new Promise(resolve => SourcesTestRunner.showScriptSource(scriptName, resolve));
};

SourcesTestRunner.waitForScriptSource = function(scriptName, callback, contentType) {
  const panel = UI.panels.sources;
  const uiSourceCodes = panel.workspace.uiSourceCodes();

  for (let i = 0; i < uiSourceCodes.length; ++i) {
    if (uiSourceCodes[i].project().type() === Workspace.projectTypes.Service) {
      continue;
    }

    if (uiSourceCodes[i].name() === scriptName &&
        (uiSourceCodes[i].contentType() === contentType || contentType === undefined)) {
      callback(uiSourceCodes[i]);
      return;
    }
  }

  TestRunner.addSniffer(
      Sources.SourcesView.prototype, 'addUISourceCode',
      SourcesTestRunner.waitForScriptSource.bind(SourcesTestRunner, scriptName, callback, contentType));
};

SourcesTestRunner.setBreakpoint = async function(sourceFrame, lineNumber, condition, enabled) {
  const debuggerPlugin = SourcesTestRunner.debuggerPlugin(sourceFrame);
  if (!debuggerPlugin.muted) {
    const bp = await debuggerPlugin.setBreakpoint(lineNumber, 0, condition, enabled);
    await bp.refreshInDebugger();  // Make sure the breakpoint is really set
  }
};

SourcesTestRunner.removeBreakpoint = function(sourceFrame, lineNumber) {
  const debuggerPlugin = SourcesTestRunner.debuggerPlugin(sourceFrame);
  const breakpointLocations = debuggerPlugin.breakpointManager.allBreakpointLocations();
  const breakpointLocation = breakpointLocations.find(
      breakpointLocation => breakpointLocation.uiLocation.uiSourceCode === sourceFrame.uiSourceCode() &&
          breakpointLocation.uiLocation.lineNumber === lineNumber);
  breakpointLocation.breakpoint.remove();
};

SourcesTestRunner.createNewBreakpoint = async function(sourceFrame, lineNumber, condition, enabled) {
  const debuggerPlugin = SourcesTestRunner.debuggerPlugin(sourceFrame);
  const promise =
      new Promise(resolve => TestRunner.addSniffer(debuggerPlugin.__proto__, 'breakpointWasSetForTest', resolve));
  await debuggerPlugin.createNewBreakpoint(lineNumber, condition, enabled);
  return promise;
};

SourcesTestRunner.toggleBreakpoint = async function(sourceFrame, lineNumber, disableOnly) {
  const debuggerPlugin = SourcesTestRunner.debuggerPlugin(sourceFrame);
  if (!debuggerPlugin.muted) {
    await debuggerPlugin.toggleBreakpoint(lineNumber, disableOnly);
  }
};

SourcesTestRunner.dumpScopeVariablesSidebarPane = function() {
  TestRunner.addResult('Scope variables sidebar pane:');
  const sections = SourcesTestRunner.scopeChainSections();

  SourcesTestRunner.dumpSectionsWithIndent(sections, 0);
};

SourcesTestRunner.dumpSectionsWithIndent = function(treeElements, depth) {
  if (!treeElements || treeElements.length === 0) {
    return;
  }

  for (const treeElement of treeElements) {
    const textContent = TestRunner.textContentWithLineBreaks(treeElement.listItemElement);
    const text = TestRunner.clearSpecificInfoFromStackFrames(textContent);
    if (text.length > 0) {
      TestRunner.addResult('    '.repeat(depth) + text);
    }
    if (!treeElement.expanded && depth === 0) {
      TestRunner.addResult('    <section collapsed>');
    }
    SourcesTestRunner.dumpSectionsWithIndent(treeElement.children(), depth + 1);
  }
};

SourcesTestRunner.scopeChainSections = function() {
  return Sources.ScopeChainSidebarPane.instance().treeOutline.rootElement().children();
};

SourcesTestRunner.expandScopeVariablesSidebarPane = function(callback) {
  const sections = SourcesTestRunner.scopeChainSections();

  for (let i = 0; i < sections.length - 1; ++i) {
    sections[i].expand();
  }

  setTimeout(() => {
    TestRunner.deprecatedRunAfterPendingDispatches(callback);
  }, 1000);
};

SourcesTestRunner.expandProperties = function(properties, callback) {
  let index = 0;

  function expandNextPath() {
    if (index === properties.length) {
      TestRunner.safeWrap(callback)();
      return;
    }

    const parentTreeElement = properties[index++];
    const path = properties[index++];
    SourcesTestRunner.expandProperty(parentTreeElement, path, 0, expandNextPath);
  }

  TestRunner.deprecatedRunAfterPendingDispatches(expandNextPath);
};

SourcesTestRunner.expandProperty = function(parentTreeElement, path, pathIndex, callback) {
  if (pathIndex === path.length) {
    TestRunner.addResult('Expanded property: ' + path.join('.'));
    callback();
    return;
  }

  const name = path[pathIndex++];
  const propertyTreeElement = SourcesTestRunner.findChildPropertyTreeElement(parentTreeElement, name);

  if (!propertyTreeElement) {
    TestRunner.addResult('Failed to expand property: ' + path.slice(0, pathIndex).join('.'));
    SourcesTestRunner.completeDebuggerTest();
    return;
  }

  propertyTreeElement.expand();
  TestRunner.deprecatedRunAfterPendingDispatches(
      SourcesTestRunner.expandProperty.bind(SourcesTestRunner, propertyTreeElement, path, pathIndex, callback));
};

SourcesTestRunner.findChildPropertyTreeElement = function(parent, childName) {
  const children = parent.children();

  for (let i = 0; i < children.length; i++) {
    const treeElement = children[i];
    const property = treeElement.property;

    if (property.name === childName) {
      return treeElement;
    }
  }
};

SourcesTestRunner.setQuiet = function(quiet) {
  SourcesTestRunner.quiet = quiet;
};

SourcesTestRunner.queryScripts = function(filter) {
  const scripts = TestRunner.debuggerModel.scripts();
  return (filter ? scripts.filter(filter) : scripts);
};

SourcesTestRunner.checkRawLocation = function(script, lineNumber, columnNumber, location) {
  TestRunner.assertEquals(script.scriptId, location.scriptId, 'Incorrect scriptId');
  TestRunner.assertEquals(lineNumber, location.lineNumber, 'Incorrect lineNumber');
  TestRunner.assertEquals(columnNumber, location.columnNumber, 'Incorrect columnNumber');
};

SourcesTestRunner.checkUILocation = function(uiSourceCode, lineNumber, columnNumber, location) {
  TestRunner.assertEquals(
      uiSourceCode, location.uiSourceCode,
      'Incorrect uiSourceCode, expected \'' + ((uiSourceCode ? uiSourceCode.url() : null)) + '\',' +
          ' but got \'' + ((location.uiSourceCode ? location.uiSourceCode.url() : null)) + '\'');

  TestRunner.assertEquals(
      lineNumber, location.lineNumber,
      'Incorrect lineNumber, expected \'' + lineNumber + '\', but got \'' + location.lineNumber + '\'');

  TestRunner.assertEquals(
      columnNumber, location.columnNumber,
      'Incorrect columnNumber, expected \'' + columnNumber + '\', but got \'' + location.columnNumber + '\'');
};

SourcesTestRunner.waitForExecutionContextInTarget = function(target, callback) {
  const runtimeModel = target.model(SDK.RuntimeModel);

  if (runtimeModel.executionContexts().length) {
    callback(runtimeModel.executionContexts()[0]);
    return;
  }

  runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, contextCreated);

  function contextCreated() {
    runtimeModel.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, contextCreated);
    callback(runtimeModel.executionContexts()[0]);
  }
};

SourcesTestRunner.selectThread = function(target) {
  self.UI.context.setFlavor(SDK.Target, target);
};

SourcesTestRunner.evaluateOnCurrentCallFrame = function(code) {
  return TestRunner.debuggerModel.evaluateOnSelectedCallFrame({expression: code, objectGroup: 'console'});
};

SourcesTestRunner.debuggerPlugin = function(sourceFrame) {
  return sourceFrame.plugins.find(plugin => plugin instanceof Sources.DebuggerPlugin);
};

SourcesTestRunner.setEventListenerBreakpoint = function(id, enabled, targetName) {
  const pane = BrowserDebugger.EventListenerBreakpointsSidebarPane.instance();

  const auxData = {'eventName': id};

  if (targetName) {
    auxData.targetName = targetName;
  }

  const breakpoint = self.SDK.domDebuggerManager.resolveEventListenerBreakpoint(auxData);

  if (breakpoint.enabled() !== enabled) {
    pane.breakpoints.get(breakpoint).checkbox.checked = enabled;
    pane.breakpointCheckboxClicked(breakpoint);
  }
};

TestRunner.deprecatedInitAsync(`
  function scheduleTestFunction() {
    setTimeout(testFunction, 0);
  }
`);
