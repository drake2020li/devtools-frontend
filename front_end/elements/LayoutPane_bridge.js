// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* WARNING: do not modify this file by hand!
* it was automatically generated by the bridge generator
* if you made changes to the source code and need to update this file, run:
*  npm run generate-bridge-file front_end/elements/LayoutPane.ts
*/

import './LayoutPane.js';
/**
* @typedef {EnumSetting|BooleanSetting}
*/
// @ts-ignore we export this for Closure not TS
export let Setting;
/**
* @typedef {{
* id:number,
* color:string,
* name:string,
* domId:(string|undefined),
* domClasses:(!Array.<string>|undefined),
* enabled:boolean,
* reveal:function():void,
* toggle:function(boolean):void,
* setColor:function(string):void,
* highlight:function():void,
* hideHighlight:function():void,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let LayoutElement;
/**
* @typedef {{
* name:string,
* type:!SettingType,
* title:string,
* options:!Array.<!EnumSettingOption>,
* value:string,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let EnumSetting;
/**
* @typedef {{
* name:string,
* type:!SettingType,
* title:string,
* options:!Array.<!BooleanSettingOption>,
* value:boolean,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let BooleanSetting;
/**
* @enum {string}
*/
// @ts-ignore we export this for Closure not TS
export let SettingType = {
  BOOLEAN: 'boolean',
  ENUM: 'enum',
};
/**
* @typedef {{
* title:string,
* value:string,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let EnumSettingOption;
/**
* @typedef {{
* title:string,
* value:boolean,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let BooleanSettingOption;
// eslint-disable-next-line no-unused-vars
export class LayoutPaneClosureInterface extends HTMLElement {
  /**
  * @param {{settings: !Array.<!Setting>, gridElements: !Array.<!LayoutElement>}} data
  */
  set data(data) {
  }
}
/**
* @return {!LayoutPaneClosureInterface}
*/
export function createLayoutPane() {
  return /** @type {!LayoutPaneClosureInterface} */ (document.createElement('devtools-layout-pane'));
}
