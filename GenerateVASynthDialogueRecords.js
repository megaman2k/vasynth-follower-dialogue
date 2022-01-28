const config = fh.loadJsonFile(fh.jetpack.cwd() + '\\scripts\\config.json');

const pluginName = config.config.plugin;
const voice = config.voice;
voice.fullName = ['VAS', voice.sex, voice.game, voice.name].join('_');

const quest = {
  editorId: voice.fullName + '_Dialogue'
};

const branches = config.branches;
Object.keys(branches).forEach(key => 
  branches[key].editorId = voice.fullName + '_Branch_' + branches[key].name);

const topics = config.topics;
Object.keys(topics).forEach(key => 
  topics[key].editorId = voice.fullName + '_Topic_' + topics[key].name);

const infoTemplates = config.infoTemplates;
// TODO - Bring in infos from JSON.
// const infos = config.infos;

const conditionTypes = {
  equals: '10000000',
  notEquals: '00000000',
};

const commonConditions = {
  isNewVoice: {
    comparisonValue: '1.0',
    function: 'GetIsVoiceType',
    parameter1: voice.fullName,
    type: 'equals'
  },
  nonFollower: {
    comparisonValue: '1.0',
    function: 'GetInFaction',
    parameter1: 'CurrentFollowerFaction',
    type: 'notEquals'
  },
};

// Infos can be shared or not. Shared ones have editorIds.
// Infos can use a shared response data or not. Those that do reference the above editorIds. The others have "Response" objects.
const infos = [
  // // shared
  // {topic: 'Shared', editorId: voice.fullName + '_Shared_Yes', conditions: [commonConditions.isNewVoice], responses: [
  //   {text: 'Yes.', emotionType: 'Neutral', emotionValue: 50}
  // ]},
  // // non-shared, uses shared response
  // {topic: 'Agree', flags: ['Random'], conditions: [commonConditions.isNewVoice], responseData: voice.fullName + '_Shared_Yes'},
  // // non-shared, uses own response
  // {topic: 'Agree', flags: ['Random', 'Goodbye'], conditions: [commonConditions.isNewVoice], responses: [
  //    {text: 'Alright. Fine.', emotionType: 'Neutral', emotionValue: 50}
  // ]},

  // "You're back" style greetings.
  // 'GetActorValue' 'WaitingForPlayer' == 1.0
  {topic: 'Hello', flags: ['Random'], conditions: [commonConditions.isNewVoice, commonConditions.nonFollower], responses: [
     {text: 'Greetings.', emotionType: 'Neutral', emotionValue: 50, audioIn: 'Greetings'}]},
  {topic: 'Hello', flags: ['Random'], conditions: [commonConditions.isNewVoice, commonConditions.nonFollower], responses: [
     {text: 'Hey there.', emotionType: 'Neutral', emotionValue: 50, audioIn: 'Hey there'}]},
];

let plugin = xelib.FileByName(pluginName);
xelib.WithHandle(plugin, function() {
  // createVoiceType(plugin, voice);
  // createQuest(plugin, quest);
  // Object.keys(topics).forEach(key => createTopic(plugin, quest, topics[key]));
  // Object.keys(branches).forEach(key => createBranch(plugin, quest, branches[key], topics));
  infos.forEach(info => createInfo(plugin, info));
});

function createVoiceType(plugin, voice) {
  let editorId = voice.fullName;
  if (xelib.HasElement(plugin, 'VTYP\\' + editorId)) {
    zedit.log('Skipping Voice Type creation: ' + editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Voice Type "' + editorId + '"...');
  let voiceTypeGroup = xelib.GetElement(plugin, 'VTYP');
  let element = maybeAddElementWithEditorId(voiceTypeGroup, editorId);
  xelib.Release(voiceTypeGroup);
  xelib.WithHandle(element, function() {
    xelib.SetFlag(element, 'DNAM', 'Female', (voice.sex === 'Female'));
  });
  
  // Add it to to the FormID List.
  let formIdsElement = xelib.GetElement(plugin, 'FLST\\VAS_VoiceTypes\\LNAM');
  xelib.WithHandle(formIdsElement, function() {
    xelib.Release(xelib.AddElementValue(formIdsElement, '.', editorId));
  });
}

function createQuest(plugin, quest) {
  if (xelib.HasElement(plugin, 'QUST\\' + quest.editorId)) {
    zedit.log('Skipping Quest creation: ' + quest.editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Quest...');
  let questGroup = xelib.GetElement(plugin, 'QUST');
  let element = maybeAddElementWithEditorId(questGroup, quest.editorId);
  xelib.Release(questGroup);
  xelib.WithHandle(element, function () {
    maybeAddElementValue(element, 'FULL', quest.editorId);
    xelib.Release(maybeAddElement(element, 'NEXT'));
    xelib.Release(maybeAddElement(element, 'ANAM'));
    xelib.Release(maybeAddElement(element, 'DNAM'));
    xelib.SetEnabledFlags(element, 'DNAM\\Flags', ['Start Game Enabled', 'Allow repeated stages', 'Unknown 5']);
    xelib.SetUIntValue(element, 'DNAM\\Priority', 50);
    xelib.SetUIntValue(element, 'DNAM\\Form\ Version', 255);
  });
}

function createTopic(plugin, quest, topic) {
  if (xelib.HasElement(plugin, 'DIAL\\' + topic.editorId)) {
    zedit.log('Skipping Topic creation: ' + topic.editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Topic "' + topic.editorId + '"...');
  let dialogTopicGroup = xelib.GetElement(plugin, 'DIAL');
  let element = maybeAddElementWithEditorId(dialogTopicGroup, topic.editorId);
  xelib.Release(dialogTopicGroup); 
  xelib.WithHandle(element, function() {
    if ('text' in topic) maybeAddElementValue(element, 'FULL', topic.text);
    maybeAddElementValue(element, 'PNAM', ('priority' in topic ? topic.priority : 50.0), 'Float');
    maybeAddElementValue(element, 'QNAM', quest.editorId);
    let dataElement = maybeAddElement(element, 'DATA');
    xelib.WithHandle(dataElement, function() {
      maybeAddElementValue(dataElement, 'Category', topic.category);
      maybeAddElementValue(dataElement, 'Subtype', topic.subtype);
    });
    maybeAddElementValue(element, 'SNAM', topic.subtypeName);
    xelib.Release(maybeAddElement(element, 'TIFC'));
  });
}

function createBranch(plugin, quest, branch, topics) {
  if (xelib.HasElement(plugin, 'DLBR\\' + branch.editorId)) {
    zedit.log('Skipping Branch creation: ' + branch.editorId + ' already exists');
    return;
  }

  zedit.log('Creating a new Branch "' + branch.editorId + '"...');
  let startingTopic = topics[branch.startingTopic];
  let dialogBranchGroup = xelib.GetElement(plugin, 'DLBR');
  let element = maybeAddElementWithEditorId(dialogBranchGroup, branch.editorId);
  xelib.Release(dialogBranchGroup);
  xelib.WithHandle(element, function() {
    maybeAddElementValue(element, 'QNAM', quest.editorId);
    maybeAddElementValue(element, 'TNAM', 0, 'UInt');
    let dnamElement = maybeAddElement(element, 'DNAM');
    xelib.WithHandle(dnamElement, function() {
       xelib.SetEnabledFlags(dnamElement, '', [branch.type]);
    });
    maybeAddElementValue(element, 'SNAM', startingTopic.editorId);
  });

  // We need to update the starting topic to point back to this branch.
  let topicElement = xelib.GetElement(plugin, 'DIAL\\' + startingTopic.editorId);
  xelib.WithHandle(topicElement, function() {
    maybeAddElementValue(topicElement, 'BNAM', branch.editorId);
  });
}

function createInfo(plugin, info) {
  let topic = topics[info.topic];
  let element = xelib.AddElement(plugin, 'DIAL\\' + topic.editorId + '\\INFO\\');

  if ('editorId' in info) maybeAddElementValue(element, 'EDID', info.editorId);
  if ('conditions' in info) info.conditions.forEach(condition => createCondition(element, condition));
  let i = 0;
  if ('responses' in info) info.responses.forEach(response => createResponse(element, info, i++));
  if ('flags' in info) {
    let f = xelib.AddElement(element, 'ENAM');
    xelib.SetEnabledFlags(f, 'Flags', info.flags);
  }
  if ('responseData' in info) xelib.AddElementValue(element, 'DNAM', info.responseData);

  // Mandatory elements/values:
  xelib.AddElement(element, 'CNAM'); // Favor Level: defaults to "None"
  xelib.AddElement(element, 'PNAM'); // Previous INFO: defaults to "NULL"
  // We need to find the previous response in this topic and set PNAM to it.
  let infoGroup = xelib.GetElement(plugin, 'DIAL\\' + topic.editorId + '\\Child Group');
  xelib.WithHandle(infoGroup, function() {
    let count = xelib.ElementCount(infoGroup);
    let previousInfoIndex = count - 2;
    if (previousInfoIndex >= 0) {
      let previousInfo = xelib.GetElements(infoGroup)[previousInfoIndex];
      xelib.SetValue(element, 'PNAM', xelib.GetHexFormID(previousInfo));
    }
  });
}

function createCondition(infoElement, condition) {
  let element = xelib.AddArrayItem(infoElement, 'Conditions', 'CTDA');
  xelib.SetValue(element, 'CTDA\\Function', condition.function);
  xelib.SetValue(element, 'CTDA\\Parameter #1', condition.parameter1);
  xelib.SetValue(element, 'CTDA\\Type', conditionTypes[condition.type]);
  xelib.SetValue(element, 'CTDA\\Comparison Value', condition.comparisonValue);
}

function createResponse(infoElement, info, responseIndex) {
  let response = info.responses[responseIndex];
  let responseNumber = responseIndex + 1;
  let element = xelib.AddArrayItem(infoElement, 'Responses');
  xelib.SetValue(element, 'TRDT\\Emotion Type', response.emotionType);
  xelib.SetValue(element, 'TRDT\\Emotion Value', response.emotionValue.toString());
  xelib.SetValue(element, 'TRDT\\Response number', responseNumber.toString());
  xelib.AddElementValue(infoElement, 'Responses\\[' + responseIndex.toString() + ']\\NAM1', response.text);
  logElement(infoElement);

  let audioSrc = getAudioSrcPath(info, response);
  let audioDest = getAudioDestPath(info, infoElement, responseNumber);
  zedit.log('DEBUG: Copying "' + audioSrc + '" to "' + audioDest + '"');
  fh.jetpack.copy(audioSrc, audioDest, { overwrite: true });
}

/**
 * ----------------------------------------------------------------------------
 *                              HELPER FUNCTIONS 
 * ----------------------------------------------------------------------------
 */

/**
 * Gets the full path to the custom audio that will be used for a response in an INFO.
 * 
 * @param {*} info The object describing the INFO's content.
 * @param {*} response The object describing the response's content.
 * @returns The full path to the input .fuz file that will be used for the response.
 */
function getAudioSrcPath(info, response) {
  // Example:
  //   D:\my\vasynth-outputs\f4_cait\
  //     Hello\
  //       Hey there friend.fuz
  return [config.config.audioInputPath, info.topic, response.audioIn + '.fuz'].join('\\');
}

/**
 * Gets the full path to the .fuz file associated with a specific response in an INFO.
 * 
 * @param {*} info The object describing the INFO's content.
 * @param {*} infoElement The xelib element for the INFO.
 * @param {*} responseNumber The number of the response in its INFO(1-based). Usually this is 1,
 *   but an INFO may have multiple responses.
 * @returns The full path to the response's .fuz file.
 */
function getAudioDestPath(info, infoElement, responseNumber) {
  // Example:
  //   C:\Program Files\Steam\steamapps\common\Skyrim Special Edition\Data\
  //     sound\voice\
  //       VASynth_Voices.esp\
  //         VAS_Female_FO4_Cait\
  //           voiceFileName
  return [
    config.config.dataPath,
    'sound\\voice',
    pluginName,
    voice.fullName,
    getVoiceFileName(info, infoElement, responseNumber)
  ].join('\\');
}

/**
 * Gets the filename for a .fuz file associated with a specific response in an INFO.
 * 
 * @param {*} info The object describing the INFO's contents.
 * @param {*} infoElement The xelib element for the INFO.
 * @param {*} responseNumber The number of the response in its INFO(1-based). Usually this is 1,
 *   but an INFO may have multiple responses.
 * @returns The filename for the response's .fuz file.
 */
function getVoiceFileName(info, infoElement, responseNumber) {
  return [
    quest.editorId.substring(0, 10),                        // First 10 chars of the Quest's EditorID
    topics[info.topic].editorId.substring(0, 15),           // First 15 chars of the Topic's EditorID
    '00' + xelib.GetHexFormID(infoElement, false, true),    // FormID for the INFO (starting with 00)
    responseNumber.toString()                               // The response number for the audio in the INFO (1-indexed)
  ].join('_') + '.fuz';                                     // Separated by underscores, plus the extension.
}

/**
 * Logs some info about an element for debugging purposes.
 */
function logElement(element) {
  zedit.log('============================');
  zedit.log('Name: ' + xelib.Name(element));
  zedit.log('LongName: ' + xelib.LongName(element));
  zedit.log('DisplayName: ' + xelib.DisplayName(element));
  zedit.log('Path: ' + xelib.Path(element));
  zedit.log('LongPath: ' + xelib.LongPath(element));
  zedit.log('LocalPath: ' + xelib.LocalPath(element));
  zedit.log('Signature: ' + xelib.Signature(element));
  zedit.log('FormID (default): ' + xelib.GetHexFormID(element, false, false));
  zedit.log('FormID (native): ' + xelib.GetHexFormID(element, true, false));
  zedit.log('FormID (local): ' + xelib.GetHexFormID(element, false, true));
  zedit.log('Child Elements:');
  logChildElements(element);
  zedit.log('============================');
}

/**
 * Logs the long path of all child elements of the input element.
 */
function logChildElements(rootElement) {
  xelib.GetElements(rootElement, '', false).forEach(element => {
    zedit.log(xelib.LongPath(element));
  });
}

// This adds an element to a group, then sets that element's EditorID.
// If an element already exists with that EditorID, it will be returned.
/**
 * Adds an child element to another (if it does not exist) and sets its EditorID.
 * 
 * @param {*} parent The parent element.
 * @param {*} editorId The EditorID of the child element.
 * @returns The handle to the child element with an EditorID.
 */
function maybeAddElementWithEditorId(parent, editorId) {
  if (xelib.HasElement(parent, editorId)) {
    return xelib.GetElement(parent, editorId);
  }
  let element = xelib.AddElement(parent, '.');
  xelib.Release(xelib.AddElementValue(element, 'EDID', editorId));
  return element;
}

/**
 * Adds a child element to another (if it does not exist), then returns it.
 * 
 * @param {*} parent The parent element.
 * @param {*} elementName The name of the child element.
 * @returns The handle to the child element.
 */
function maybeAddElement(parent, elementName) {
  if (xelib.HasElement(parent, elementName)) {
    return xelib.GetElement(parent, elementName);
  }
  return xelib.AddElement(parent, elementName);
}

// TODO - The variable values can probably just be deleted in favor of using strings.
/**
 * Adds a child element (if necessary) and sets a value on it.
 * 
 * @param {*} parent The parent element where a child is being added.
 * @param {*} elementName The name of the child element.
 * @param {*} value The value to assign to the child element.
 * @param {*} type The type of the child element.
 */
function maybeAddElementValue(parent, elementName, value, type) {
  let element = maybeAddElement(parent, elementName);
  xelib.WithHandle(element, function() {
    switch (type) {
      case 'Int':
        xelib.SetIntValue(element, '', value);
        break;
      case 'UInt':
        xelib.SetUIntValue(element, '', value);
        break;
      case 'Float':
        xelib.SetFloatValue(element, '', value);
        break;
      default:
        xelib.SetValue(element, '', value)
    };
  });
}

return;