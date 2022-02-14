/**
 * Manual Steps Required:
 * - Add scripts to dialogues.
 * - Add scenes.
 * - Set up the quest stages, aliases, scripts, etc.
 * - Conditions that reference quest variables need to be opened in the CK so that VM values are set.
 * - To keep the FormIDs down, make sure the next record # is as low as possible
 *   before running this script.
 */

const config = fh.loadJsonFile(fh.jetpack.cwd() + '\\scripts\\config\\mistborn\\esme-intro.json');
const quest = config.quest;
const branches = config.branches;

const topicEditorIds = {};

const conditionTypes = {
  eq:   '10000000',
  ne:   '00000000',
  le:   '10100000',
  ge:   '11000000',
  lt:   '00100000',
  gt:   '01000000'
};
const globalConditionTemplates = config.conditions;
const globalTopicTemplates = config.topics;

plugin = xelib.FileByName(config.constants.pluginName);
// Create the quest if it does not exist.
createQuest(plugin, quest);
// Create the branches and topics.
Object.keys(branches).forEach(editorId => {
  let branch = branches[editorId];
  branch.editorId = editorId;
  createBranch(plugin, branch, quest);
});
// Infos must be created last because they may link to topics.
Object.keys(branches).forEach(branchEditorId => {
  let branch = branches[branchEditorId];
  Object.keys(branch.topics).forEach(topicEditorId => {
    let topic = branch.topics[topicEditorId];
    createTopicInfos(plugin, topic);
  });
});

function createQuest(plugin, quest) {
  debug('createQuest: ' + quest.editorId);
  let element = createGroupChildIfNotPresent(plugin, 'QUST', quest.editorId);
  setValue(element, 'FULL', quest.name);
  setFlags(element, 'DNAM\\Flags', []);
  setValue(element, 'DNAM\\Form Version', '255');
  setValue(element, 'DNAM\\Type', quest.type);
  // Stages
  // Objectives
  // Aliases
}

function createBranch(plugin, branch, quest) {
  debug('createBranch: ' + branch.editorId);
  let element = createGroupChildIfNotPresent(plugin, 'DLBR', branch.editorId);
  setValue(element, 'QNAM', quest.editorId);
  setValue(element, 'TNAM', '0');
  setFlags(element, 'DNAM', branch.flags, []);
  Object.keys(branch.topics).forEach(editorId => {
    let topic = branch.topics[editorId];
    topic.editorId = editorId;
    createTopic(plugin, topic, quest, branch);
  });
  // Make sure the starting topic is valid.
  if (!('startingTopic' in branch) || !(branch.startingTopic in branch.topics)) {
    error('Branch ' + branch.editorId + ': Invalid starting topic');
  } else {
    setValue(element, 'SNAM', branch.startingTopic);
  }
}

function createTopic(plugin, topic, quest, branch) {
  debug('createTopic: ' + topic.editorId);
  let element = createGroupChildIfNotPresent(plugin, 'DIAL', topic.editorId);
  topicEditorIds[topic.editorId] = true;
  
  // Apply template values to the topic first.
  if ('template' in topic) {
    if (!(topic.template in globalTopicTemplates)) {
      error('Bad topic template: ' + topic.template);
      return;
    }
    let template = globalTopicTemplates[topic.template];
    Object.keys(template).forEach(key => {
      if (!(key in topic)) topic[key] = template[key];
    });
  }

  // Topic properties.
  if ('text' in topic) setValue(element, 'FULL', topic.text); // Text is optional and should only be set if used.
  setValue(element, 'PNAM', topic.priority, "50");
  if (!('noBranch' in topic)) setValue(element, 'BNAM', branch.editorId); // noBranch means do not assign the branch to the topic.
  setValue(element, 'QNAM', quest.editorId);
  // If category is set, then the subtype and subtype name MUST be provided.
  if ('category' in topic) {
    setValue(element, 'DATA\\Category', topic.category);
    setValue(element, 'DATA\\Subtype', topic.subtype);
    setValue(element, 'SNAM', topic.subtypeName);
  } else {
    setValue(element, 'DATA\\Category', 'Topic');
    setValue(element, 'DATA\\Subtype', 'Custom');
    setValue(element, 'SNAM', 'CUST');
  }
  setValue(element, 'TIFC', topic.infos.length.toString());
}

function createTopicInfos(plugin, topic) {
  debug('createTopicInfos: ' + topic.editorId);

  // Commonly used conditions can be specified at the top of the file or in a topic itself.
  // Those defined in the topic take precedent over the "global" ones.
  let conditionTemplates = {};
  if ('conditions' in config) conditionTemplates = JSON.parse(JSON.stringify(config.conditions)); // Deep copy to protect the globals.
  if ('conditions' in topic) Object.assign(conditionTemplates, topic.conditions);
  
  let templates = ('infoTemplates' in topic) ? topic.infoTemplates : {};

  topic.infos.forEach(info => {
    // Apply template values to the info first.
    if ('template' in info) { 
      if (!(info.template in templates)) {
        error('Topic ' + topic.editorId + ': Bad info template: ' + info.template);
        return;
      }
      let template = templates[info.template];
      Object.keys(template).forEach(key => {
        if (!(key in info)) info[key] = template[key];
      });
    }
    
    // Now we should have enough info to create the info.
    let element = addElement(plugin, 'DIAL\\' + topic.editorId + '\\INFO\\');

    // Mandatory elements/values.
    addElement(element, 'CNAM'); // Favor Level: defaults to "None"
    addElement(element, 'PNAM'); // Previous INFO: defaults to "NULL"
    // We need to find the previous response in this topic and set PNAM to it.
    let infoGroup = xelib.GetElement(plugin, 'DIAL\\' + topic.editorId + '\\Child Group');
    if (infoGroup != 0) {
      xelib.WithHandle(infoGroup, function() {
        let count = xelib.ElementCount(infoGroup);
        let previousInfoIndex = count - 2;
        if (previousInfoIndex >= 0) {
          let previousInfo = xelib.GetElements(infoGroup)[previousInfoIndex];
          setValue(element, 'PNAM', xelib.GetHexFormID(previousInfo));
        }
      });
    }

    if ('editorId' in info) setValue(element, 'EDID', info.editorId);
    if ('conditions' in info) info.conditions.forEach(condition => createCondition(element, condition, conditionTemplates));
    let i = 0;
    if ('responses' in info) info.responses.forEach(response => createResponse(element, topic.editorId, info, i++));
    if ('flags' in info) setFlags(element, 'ENAM\\Flags', info.flags);
    if ('responseData' in info) setValue(element, 'DNAM', info.responseData);
    if ('links' in info) {
      info.links.forEach(targetEditorId => {
        if (targetEditorId in topicEditorIds) {
          let linkToElement = addArrayItem(element, 'Link To', 'TCLT');
          setValue(linkToElement, '', targetEditorId);
        } else {
          error('Topic ' + topic.editorId + ': Info links to invalid topic: ' + targetEditorId);
        }
      });
    }

    setFlags(element, 'ENAM\\Flags', info.flags, []);
    setValue(element, 'ENAM\\Reset Hours', info.resetHours, '0');
  });
}

function createCondition(infoElement, condition, templates) {
  // Apply template values to the info first.
  if ('template' in condition) { 
    if (!(condition.template in templates)) {
      error('Bad condition template: ' + condition.template);
      return;
    }
    let template = templates[condition.template];
    Object.keys(template).forEach(key => {
      if (!(key in condition)) condition[key] = template[key];
    });
  }

  // Relations are specified using a byte.
  // The left 3 bits are used to specify greater than, equal to, greater than or equal to, etc.
  // The 4th bit from the left is used to flag an OR with the previous condition.
  let conditionType = conditionTypes[condition.type];
  if ('or' in condition && condition.or) {
    conditionType = conditionType.substring(0, 3) + '1' + conditionType.substring(4);
  }

  let element = addArrayItem(infoElement, 'Conditions', 'CTDA');
  setValue(element, 'CTDA\\Function', condition.function);
  if ('parameter1' in condition) setValue(element, 'CTDA\\Parameter #1', condition.parameter1);
  if ('cParameter2' in condition) setValue(element, 'CIS2', condition.cParameter2);
  setValue(element, 'CTDA\\Type', conditionType);
  setValue(element, 'CTDA\\Comparison Value', condition.value);
  if ('reference' in condition) {
    if (condition.reference === 'player') {
      setValue(element, 'CTDA\\Run On', 'Reference');
      setValue(element, 'CTDA\\Reference', 'Player [00000014]');
    }
  }
}

function createResponse(infoElement, topicEditorId, info, responseIndex) {
  debug('createResponse: ' + topicEditorId + ' ' + responseIndex.toString());
  let response = info.responses[responseIndex];
  let responseNumber = responseIndex + 1;
  let element = addArrayItem(infoElement, 'Responses');
  setValue(element, 'TRDT\\Emotion Type', response.emotionType, 'Neutral');
  setValue(element, 'TRDT\\Emotion Value', 'emotionValue' in response ? response.emotionValue.toString() : '50');
  setValue(element, 'TRDT\\Response number', responseNumber.toString());
  setValue(element, 'NAM1', response.text);
  if ('idle' in response) setValue(element, 'SNAM', response.idle);

  let audioSrc = getAudioSrcPath(topicEditorId, response, info.voice);
  let audioDest = getAudioDestPath(topicEditorId, infoElement, responseNumber, info.voice);
  if (fh.jetpack.exists(audioSrc)) {
    debug('Copying "' + audioSrc + '" to "' + audioDest + '"');
    if (!config.constants.dryRun) fh.jetpack.copy(audioSrc, audioDest, { overwrite: true });
  } else {
    error('Audio missing: ' + audioSrc);
  }
}

function addArrayItem(element, path) {
  debug('addArrayItem: path=' + path);
  if (!config.constants.dryRun) return xelib.AddArrayItem(element, path);
  return null;
}

function addArrayItem(element, path, subpath) {
  debug('addArrayItem: path=' + path + ', subpath=' + subpath);
  if (!config.constants.dryRun) return xelib.AddArrayItem(element, path, subpath);
  return null;
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
  // Characters that do not get trimmed: word chars, !, space.
  // Common characters that do get trimmed: a single period, ?.
  fuzFileName = fuzFileName.replace(/[^\w! ]$/, '') + '.fuz';
  return [config.constants.audioInputPath[voice], topicEditorId, fuzFileName].join('\\');
}

/**
 * Gets the full path to the .fuz file associated with a specific response in an INFO.
 * 
 * @param {*} topicEditorId The topic the INFO falls under.
 * @param {*} infoElement The xelib element for the INFO.
 * @param {*} responseNumber The number of the response in its INFO(1-based). Usually this is 1,
 *   but an INFO may have multiple responses.
 * @returns The full path to the response's .fuz file.
 */
function getAudioDestPath(topicEditorId, infoElement, responseNumber, voice) {
  // Example:
  //   C:\Program Files\Steam\steamapps\common\Skyrim Special Edition\Data\
  //     sound\voice\
  //       VASynth_Voices.esp\
  //         VAS_Female_FO4_Cait\
  //           voiceFileName
  return [
    config.constants.dataPath,
    'sound\\voice',
    config.constants.pluginName,
    voice,
    getVoiceFileName(topicEditorId, infoElement, responseNumber)
  ].join('\\');
}

/**
 * Gets the filename for a .fuz file associated with a specific response in an INFO.
 * 
 * @param {*} topicEditorId The topic the INFO falls under.
 * @param {*} infoElement The xelib element for the INFO.
 * @param {*} responseNumber The number of the response in its INFO(1-based). Usually this is 1,
 *   but an INFO may have multiple responses.
 * @returns The filename for the response's .fuz file.
 */
function getVoiceFileName(topicEditorId, infoElement, responseNumber) {
  return [
    quest.editorId.substring(0, 10),                        // First 10 chars of the Quest's EditorID
    topicEditorId.substring(0, 15),                         // First 15 chars of the Topic's EditorID
    config.constants.dryRun ? 'DRY_RUN_FAKE_VALUE' : ('00' + xelib.GetHexFormID(infoElement, false, true)), // FormID for the INFO (starting with 00)
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

function info(message) {
  zedit.log('INFO: ' + message);
}

function debug(message) {
  zedit.log('DEBUG: ' + message);
}

function error(message) {
  zedit.error(message);
}

function addElement(element, path) {
  debug('addElement: path=' + path);
  if (!config.constants.dryRun) return xelib.AddElement(element, path);
  return null;
}

function setValue(element, path, value, defaultValue) {
  if (value == null) {
    if (defaultValue == null) {
      error('required value not specified in JSON: ' + path);
      return;
    }
    value = defaultValue;
  }
  debug('setValue: path=' + path + ', value=' + value);
  if (!config.constants.dryRun) xelib.AddElementValue(element, path, value);
}

function setFlags(element, path, flagArray, defaultValue) {
  if (flagArray == null) {
    if (defaultValue == null) {
      error('required array not specified in JSON: ' + path);
      return;
    }
    flagArray = defaultValue;
  }
  debug('setFlags: path=' + path + ', flagArray=' + flagArray.join(','));
  if (!config.constants.dryRun) {
    xelib.AddElement(element, path);
    xelib.SetEnabledFlags(element, path, flagArray);
  }
}

function createGroupChildIfNotPresent(plugin, group, editorId) {
  let element = xelib.GetElement(plugin, group + '\\' + editorId);
  if (element == 0) {
    debug('CREATING ' + group + '\\' + editorId);
    if (!config.constants.dryRun) {
      element = xelib.AddElement(plugin, group + '\\.');
      xelib.AddElementValue(element, 'EDID', editorId);
    }
  }
  return element;
}

return;