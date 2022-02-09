/**
 * Manual Steps Required:
 * - Add scripts to dialogues.
 * - To keep the FormIDs down, make sure the next record # is as low as possible
 *   before running this script.
 * 
 * TODO
 * - I think structuring the JSON more hierarchically will be easier to edit.
 * Why?
 *   - I'm jumping back and forth between topic defs and their infos, especially when adding new ones.
 *   - A lot of the common templates aren't really common outside a single topic.
 * 
 * templates
 *   > topics -- Would be helpful for types since I had an issue where I didn't set the properties for a shared info topic correctly.
 *   > conditions
 *   > infos
 * quest
 *   > branches
 *   > topics
 *     > templates
 *       > conditions
 *       > infos
 *     > responses/infos
 */

const config = fh.loadJsonFile(fh.jetpack.cwd() + '\\scripts\\config\\mistborn\\intro-main-hulda.json');

const quest = config.quest;
const branches = config.branches;
const topics = config.topics;
const infoTemplates = config.infoTemplates;
const infos = config.infos;

const conditionTypes = {
  eq:   '10000000',
  ne:   '00000000',
  le:   '10100000',
  ge:   '11000000',
  lt:   '00100000',
  gt:   '01000000'
};

const commonConditions = config.conditions;

// Check for missing audio before proceeding.
let srcAudioCount = 0;
let srcAudioMissingCount = 0;
Object.keys(infos).forEach(topicEditorId => {
  let infoList = infos[topicEditorId];
  infoList.forEach(info => {
    if ('responses' in info) {
      info.responses.forEach(response => {
        let voice = info.voice;
        if (!voice && 'template' in info) voice = infoTemplates[info.template].voice;
        let audioSrc = getAudioSrcPath(topicEditorId, response, voice);
        if (fh.jetpack.exists(audioSrc)) {
          srcAudioCount++;
        } else {
          srcAudioMissingCount++;
          zedit.log("ERROR: Missing audio: " + audioSrc);
        }
      });
    }
  });
});
zedit.log("INFO: Audio files present: " + srcAudioCount.toString());
zedit.log("INFO: Audio files missing: " + srcAudioMissingCount.toString());
if (srcAudioMissingCount > 0) {
  return;
}

let plugin = xelib.FileByName(config.config.pluginName);
xelib.WithHandle(plugin, function() {
  //createQuest(plugin, quest);
  Object.keys(branches).forEach(key =>
    createBranch(plugin, quest, branches[key], topics));
  Object.keys(topics).forEach(key =>
    createTopic(plugin, quest, topics[key]));
  Object.keys(branches).forEach(key => 
    updateBranchStartingTopics(plugin, branches[key]));
  Object.keys(infos).forEach(topicKey => {
    infos[topicKey].forEach(info => createInfo(plugin, topicKey, info));
  });
});

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
    maybeAddElementValue(element, 'PNAM', ('priority' in topic ? topic.priority : "50.0"));
    maybeAddElementValue(element, 'QNAM', quest.editorId);
    if ('branch' in topic) maybeAddElementValue(element, 'BNAM', topic.branch);
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
  });
}

function updateBranchStartingTopics(plugin, branch) {
  let element = xelib.GetElement(plugin, 'DLBR\\' + branch.editorId);
  let startingTopic = topics[branch.startingTopic];
  maybeAddElementValue(element, 'SNAM', startingTopic.editorId);
}

function createInfo(plugin, topicKey, info) {
  let topic = topics[topicKey];
  let element = xelib.AddElement(plugin, 'DIAL\\' + topic.editorId + '\\INFO\\');

  // Templates are used to keep info definitions in JSON simple.
  if ('template' in info) {
    if (info.template in infoTemplates) {
      let template = infoTemplates[info.template];
      if ('flags' in template && !('flags' in info)) info.flags = template.flags;
      if ('conditions' in template && !('conditions' in info)) info.conditions = template.conditions;
      if ('links' in template && !('links' in info)) info.links = template.links;
      if ('voice' in template && !('voice' in info)) info.voice = template.voice;
      if ('responseData' in template && !(!'responseData' in info)) info.responseData = template.responseData;
    } else {
      zedit.log('WARNING: INFO template not found: ' + info.template)
    }
  }

  if ('editorId' in info) maybeAddElementValue(element, 'EDID', info.editorId);
  if ('conditions' in info) info.conditions.forEach(condition => createCondition(element, condition));
  let i = 0;
  if ('responses' in info) info.responses.forEach(response => createResponse(element, topicKey, info, i++));
  if ('flags' in info) {
    let f = xelib.AddElement(element, 'ENAM');
    xelib.SetEnabledFlags(f, 'Flags', info.flags);
  }
  if ('responseData' in info) {
    xelib.AddElementValue(element, 'DNAM', info.responseData);
  }
  if ('links' in info) {
    info.links.forEach(targetEditorId => {
      let linkToElement = xelib.AddArrayItem(element, 'Link To', 'TCLT');
      xelib.SetValue(linkToElement, '', targetEditorId);
    });
  }

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

  if ('template' in condition) {
    if (condition.template in commonConditions) {
      let template = commonConditions[condition.template];
      if (('function' in template) && !('function' in condition)) condition.function = template.function;
      if (('parameter1' in template) && !('parameter1' in condition)) condition.parameter1 = template.parameter1;
      if (('comparisonValue' in template) && !('comparisonValue' in condition)) condition.comparisonValue = template.comparisonValue;
      if (('type' in template) && !('type' in condition)) condition.type = template.type;
      if (('or' in template) && !('or' in condition)) condition.or = template.or;
      if (('reference' in template) && !('reference' in condition)) condition.reference = template.reference;
    } else {
      zedit.log('WARNING: Condition template not found: ' + condition);
      return;
    }
  }
  let conditionType = conditionTypes[condition.type];
  if ('or' in condition && condition.or) {
    conditionType = conditionType.substring(0, 3) + '1' + conditionType.substring(4);
  }

  let element = xelib.AddArrayItem(infoElement, 'Conditions', 'CTDA');
  xelib.SetValue(element, 'CTDA\\Function', condition.function);
  if ('parameter1' in condition) xelib.SetValue(element, 'CTDA\\Parameter #1', condition.parameter1);
  xelib.SetValue(element, 'CTDA\\Type', conditionType);
  xelib.SetValue(element, 'CTDA\\Comparison Value', condition.comparisonValue);
  if ('reference' in condition) {
    if (condition.reference === 'player') {
      xelib.SetValue(element, 'CTDA\\Run On', 'Reference');
      xelib.SetValue(element, 'CTDA\\Reference', 'Player [00000014]');
    }
  }
}

function createResponse(infoElement, topicKey, info, responseIndex) {
  let response = info.responses[responseIndex];
  let responseNumber = responseIndex + 1;
  let element = xelib.AddArrayItem(infoElement, 'Responses');
  xelib.SetValue(element, 'TRDT\\Emotion Type', 'emotionType' in response ? response.emotionType : 'Neutral');
  xelib.SetValue(element, 'TRDT\\Emotion Value', 'emotionValue' in response ? response.emotionValue.toString() : '50');
  xelib.SetValue(element, 'TRDT\\Response number', responseNumber.toString());
  xelib.AddElementValue(infoElement, 'Responses\\[' + responseIndex.toString() + ']\\NAM1', response.text);

  let audioSrc = getAudioSrcPath(topicKey, response, info.voice);
  let audioDest = getAudioDestPath(topicKey, infoElement, responseNumber, info.voice);
  if (fh.jetpack.exists(audioSrc)) {
    zedit.log('DEBUG: Copying "' + audioSrc + '" to "' + audioDest + '"');
    fh.jetpack.copy(audioSrc, audioDest, { overwrite: true });
  } else {
    zedit.log('ERROR: Could not find audio file: ' + audioSrc);
  }
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
function getAudioSrcPath(topicEditorId, response, voice) {
  // Example:
  //   D:\my\vasynth-outputs\f4_cait\
  //     Hello\
  //       Hey there friend.fuz
  let fuzFileName = 'audioIn' in response ? response.audioIn : response.text;
  fuzFileName = fuzFileName.replace(/\W$/, '') + '.fuz';
  return [config.config.audioInputPath[voice], topicEditorId, fuzFileName].join('\\');
}

/**
 * Gets the full path to the .fuz file associated with a specific response in an INFO.
 * 
 * @param {*} topicKey The topic the INFO falls under.
 * @param {*} infoElement The xelib element for the INFO.
 * @param {*} responseNumber The number of the response in its INFO(1-based). Usually this is 1,
 *   but an INFO may have multiple responses.
 * @returns The full path to the response's .fuz file.
 */
function getAudioDestPath(topicKey, infoElement, responseNumber, voice) {
  // Example:
  //   C:\Program Files\Steam\steamapps\common\Skyrim Special Edition\Data\
  //     sound\voice\
  //       VASynth_Voices.esp\
  //         VAS_Female_FO4_Cait\
  //           voiceFileName
  return [
    config.config.dataPath,
    'sound\\voice',
    config.config.pluginName,
    voice,
    getVoiceFileName(topicKey, infoElement, responseNumber)
  ].join('\\');
}

/**
 * Gets the filename for a .fuz file associated with a specific response in an INFO.
 * 
 * @param {*} topicKey The topic the INFO falls under.
 * @param {*} infoElement The xelib element for the INFO.
 * @param {*} responseNumber The number of the response in its INFO(1-based). Usually this is 1,
 *   but an INFO may have multiple responses.
 * @returns The filename for the response's .fuz file.
 */
function getVoiceFileName(topicKey, infoElement, responseNumber) {
  return [
    quest.editorId.substring(0, 10),                        // First 10 chars of the Quest's EditorID
    topics[topicKey].editorId.substring(0, 15),             // First 15 chars of the Topic's EditorID
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