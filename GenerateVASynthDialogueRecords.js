const templateVoiceName = 'VAS_Female_CP2077_Misty',
	sex = 'Female',
	game = 'FO4',
	persona = 'Cait',
	fullName = ['VAS', sex, game, persona].join('_'),
	pluginName = 'VASynth_Voices.esp';

// TODO - Let's embrace the JSON way and treat the above as a voice object.
// (Keeping the method args in sync is a royal pain.)

let plugin = xelib.FileByName(pluginName);
xelib.WithHandle(plugin, function() {
  createVoiceType(plugin, fullName, sex);
  createQuest(plugin, fullName);
  addBranches(plugin, fullName);
  //addTopics();
  //addResponses();
});

function createBranch(plugin, voiceName, branch) {
  let branchEditorId = getBranchId(voiceName, branch.name);
  
  if (xelib.HasElement(plugin, 'DLBR\\' + branchEditorId)) {
    zedit.log('Skipping Branch creation: ' + branchEditorId + ' already exists');
    return;
  }
  
  let dialogBranchGroup = xelib.GetElement(plugin, 'DLBR');
  let branchElement = maybeAddElement(dialogBranchGroup, branchEditorId);
  xelib.Release(dialogBranchGroup);
  maybeAddElementValue(branchElement, 'QNAM', getQuestId(voiceName));
  maybeAddElementUIntValue(branchElement, 'TNAM', 0);
  let dnamElement = maybeAddGenericElement(branchElement, 'DNAM');
  xelib.WithHandle(dnamElement, function() {
    xelib.SetEnabledFlags(dnamElement, '', [branch.type]);
  });
  
  createBranchTopic(plugin, voiceName, branch);
  
  maybeAddElementValue(branchElement, 'SNAM', getTopicId(voiceName, branch.name));
  
}

function createBranchTopic(plugin, voiceName, branch) {
  let topicEditorId = getTopicId(voiceName, branch.name);
  
  if (xelib.HasElement(plugin, 'DIAL\\' + topicEditorId)) {
    zedit.log('Skipping Topic creation: ' + topicEditorId + ' already exists');
    return;
  }
  
  let dialogTopicGroup = xelib.GetElement(plugin, 'DIAL');
  let topicElement = maybeAddElement(dialogTopicGroup, topicEditorId);
  xelib.Release(dialogTopicGroup);
  xelib.WithHandle(topicElement, function() {
    maybeAddElementValue(topicElement, 'FULL', branch.topicText);
    maybeAddElementFloatValue(topicElement, 'PNAM', branch.priority);
    if (branch.name.length > 0) {
      maybeAddElementValue(topicElement, 'BNAM', getBranchId(voiceName, branch.name));
    }
    maybeAddElementValue(topicElement, 'QNAM', getQuestId(voiceName));
    xelib.Release(maybeAddGenericElement(topicElement, 'DATA'));
    maybeAddElementValue(topicElement, 'SNAM', 'CUST');
    xelib.Release(maybeAddGenericElement(topicElement, 'TIFC'));
  });
}

function addBranches(plugin, voiceName) {
  zedit.log('Adding dialogue branches...');
  
  const branches = [
    {name: 'Recruit',   topicText: 'Follow me. I need your help.',          priority: 10.0},
    {name: 'Dismiss',   topicText: 'It\'s time for us to part ways.',       priority: 0.0},
    {name: 'Wait',      topicText: 'Wait here.',                            priority: 100.0},
    {name: 'Follow',    topicText: 'Follow me.',                            priority: 100.0},
    {name: 'Favor',     topicText: 'I need you to do something.',           priority: 50.0},
    {name: 'FavorMore', topicText: '',                                      priority: 50.0},
    {name: 'Trade',     topicText: 'I need to trade some things with you.', priority: 10.0}
  ];
    
  branches.forEach(branch => {
    branch.type = 'Top-Level';
    if (branch.name === 'FavorMore') {
      branch.type = 'Blocking';
    }
    createBranch(plugin, voiceName, branch);
  });

}

function createQuest(plugin, voiceName) {
  let editorId = getQuestId(voiceName);
  
  if (xelib.HasElement(plugin, 'QUST\\' + editorId)) {
    zedit.log('Skipping Quest creation: ' + editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Quest...');
  let questGroup = xelib.GetElement(plugin, 'QUST');
  let questElement = maybeAddElement(questGroup, editorId);
  xelib.WithHandles([questGroup, questElement], function () {
    xelib.Release(xelib.AddElementValue(questElement, 'FULL', voiceName));
    xelib.Release(xelib.AddElement(questElement, 'NEXT'));
    xelib.Release(xelib.AddElement(questElement, 'ANAM'));
    xelib.Release(xelib.AddElement(questElement, 'DNAM'));
    xelib.SetEnabledFlags(questElement, 'DNAM\\Flags', ['Start Game Enabled', 'Allow repeated stages', 'Unknown 5']);
    xelib.SetUIntValue(questElement, 'DNAM\\Priority', 50);
    xelib.SetUIntValue(questElement, 'DNAM\\Form\ Version', 255);
  });
}

function createVoiceType(plugin, editorId, sex) {
  if (xelib.HasElement(plugin, 'VTYP\\' + editorId)) {
    zedit.log('Skipping Voice Type creation: ' + editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Voice Type...');
  let voiceTypeGroup = xelib.GetElement(plugin, 'VTYP');
  let newVoiceElement = xelib.AddElement(voiceTypeGroup, '.');
  xelib.Release(xelib.AddElementValue(newVoiceElement, 'EDID', editorId));
  let newVoiceRecord = getRecord(newVoiceElement);
  xelib.SetFlag(newVoiceRecord, 'DNAM', 'Female', (sex === 'Female')); // DNAM flag
  xelib.Release(newVoiceRecord);
  xelib.Release(newVoiceElement);
  xelib.Release(voiceTypeGroup);
  
  // Add it to to the FormID List.
  let formIdsElement = xelib.GetElement(plugin, 'FLST\\VAS_VoiceTypes\\LNAM');
  xelib.Release(xelib.AddElementValue(formIdsElement, '.', editorId));
  xelib.Release(formIdsElement);
}

function addTopics() {
  zedit.log('Adding dialogue topics...');
  
  const topics = [
    {name: 'Hello'},
    {name: 'Goodbye'},
    {name: 'Shared'},
    {name: 'Idle'},
    {name: 'Collide'},
    {name: 'CombatToNormal'},
    {name: 'NormalToCombat'},
    {name: 'Agree'},
    {name: 'Refuse'},
    {name: 'ExitFavor'},
    {name: 'Attack'},
    {name: 'PowerAttack'},
    {name: 'Block'},
    {name: 'Hit'},
    {name: 'Taunt'},
    {name: 'Bleedout'},
  ];
  
  topics.forEach(topic => {
    createTopic(plugin, voiceName, topic);
  });
}

function createTopic(plugin, voiceName, topic) {
  let topicEditorId = getTopicId(voiceName, topic.name);
  
  if (xelib.HasElement(plugin, 'DIAL\\' + topicEditorId)) {
    zedit.log('Skipping Topic creation: ' + topicEditorId + ' already exists');
    return;
  }
  
  let dialogTopicGroup = xelib.GetElement(plugin, 'DIAL');
  let dialogElement = maybeAddElement(dialogTopicGroup, topicEditorId);
  xelib.Release(dialogTopicGroup); 
  xelib.withHandle(dialogELement, function() {
    // TODO
  });
  
  // This should be VERY close to the other topics. What will differ is the population of said topic.
  // At this point I might just start loading in branch and topic settings from JSON files, which
  // would be more useful down the road for creating more generic quest dialogues.
}

function addResponses() {
  zedit.log('Adding dialogue responses...');
}

function getBranchId(voiceName, name) {
  return voiceName + '_Branch_' + name;
}

function getQuestId(voiceName) {
  return voiceName + '_Dialogue';
}

function getTopicId(voiceName, name) {
  return voiceName + '_Topic_' + name;
}

function getRecord(element) {
  let formId = xelib.GetFormID(element, false, false);
  return xelib.GetRecord(0, formId); // load-order-based record lookup
}

// TODO - I can probably eliminate this function.
function findElementByEditorId(rootElement, searchId) {
  return xelib.GetElements(rootElement, '', false).find(element => {
    let formId = xelib.GetFormID(element, false, false);
    let record = xelib.GetRecord(0, formId);
    let editorId = xelib.EditorID(record);
    xelib.Release(record);
    return (editorId === searchId);
  });
}

function logChildElements(rootElement) {
  xelib.GetElements(rootElement, '', false).forEach(element => {
    zedit.log(xelib.LongPath(element));
  });
}

/**
 * TODO - Clean up these functions:
 * - maybeAddElement is too specific and should be combined with the other usages.
 * - I'd rather specify the type as an arg instead of having mostly duplicate functions.
 */
function maybeAddElement(parent, editorId) {
  if (xelib.HasElement(parent, editorId)) {
    zedit.log('DEBUG: maybeAddElement: ' + editorId + ' exists');
    return xelib.GetElement(parent, editorId);
  }
  let child = xelib.AddElement(parent, '.');
  xelib.Release(xelib.AddElementValue(child, 'EDID', editorId));
  zedit.log('DEBUG: maybeAddElement: ' + editorId + ' created');
  return child;
}

function maybeAddGenericElement(parent, elementName) {
  let element = null;
  if (xelib.HasElement(parent, elementName)) {
    element = xelib.GetElement(parent, elementName);
  } else {
    element = xelib.AddElement(parent, elementName);
  }
  return element;  
}

function maybeAddElementValue(parent, elementName, value) {
  let element = maybeAddGenericElement(parent, elementName);
  xelib.WithHandle(element, function() {
  	xelib.SetValue(element, '', value);
  });
}

function maybeAddElementIntValue(parent, elementName, value) {
  let element = maybeAddGenericElement(parent, elementName);
  xelib.WithHandle(element, function() {
  	xelib.SetIntValue(element, '', value);
  });
}

function maybeAddElementUIntValue(parent, elementName, value) {
  let element = maybeAddGenericElement(parent, elementName);
  xelib.WithHandle(element, function() {
  	xelib.SetUIntValue(element, '', value);
  });
}

function maybeAddElementFloatValue(parent, elementName, value) {
  let element = maybeAddGenericElement(parent, elementName);
  xelib.WithHandle(element, function() {
  	xelib.SetFloatValue(element, '', value);
  });
}

return;