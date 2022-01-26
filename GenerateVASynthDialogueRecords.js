const voice = {
  sex: 'Female',
  game: 'FO4',
  name: 'Cait',
};
voice.fullName = ['VAS', voice.sex, voice.game, voice.name].join('_');
const pluginName = 'VASynth_Voices.esp';

let plugin = xelib.FileByName(pluginName);
xelib.WithHandle(plugin, function() {
  createVoiceType(plugin, voice);
  createQuest(plugin, voice);
  addBranches(plugin, voice);
  //addTopics(plugin, voice);
  //addResponses(plugin, voice);
});

function createBranch(plugin, voice, branch) {
  let editorId = getBranchId(voice, branch);
  
  if (xelib.HasElement(plugin, 'DLBR\\' + editorId)) {
    zedit.log('Skipping Branch creation: ' + editorId + ' already exists');
    return;
  }
  
  let dialogBranchGroup = xelib.GetElement(plugin, 'DLBR');
  let branchElement = maybeAddElement(dialogBranchGroup, editorId);
  xelib.Release(dialogBranchGroup);
  maybeAddElementValue(branchElement, 'QNAM', getQuestId(voice));
  maybeAddElementUIntValue(branchElement, 'TNAM', 0);
  let dnamElement = maybeAddGenericElement(branchElement, 'DNAM');
  xelib.WithHandle(dnamElement, function() {
    xelib.SetEnabledFlags(dnamElement, '', [branch.type]);
  });
  
  let topic = createBranchTopic(plugin, voice, branch);
  
  maybeAddElementValue(branchElement, 'SNAM', getTopicId(voice, topic));
}

function createBranchTopic(plugin, voice, branch) {
  let topic = {
    name: branch.name
  };
  let editorId = getTopicId(voice, topic);
  
  if (xelib.HasElement(plugin, 'DIAL\\' + editorId)) {
    zedit.log('Skipping Topic creation: ' + editorId + ' already exists');
    return topic;
  }
  
  let dialogTopicGroup = xelib.GetElement(plugin, 'DIAL');
  let topicElement = maybeAddElement(dialogTopicGroup, editorId);
  xelib.Release(dialogTopicGroup);
  xelib.WithHandle(topicElement, function() {
    maybeAddElementValue(topicElement, 'FULL', branch.topicText);
    maybeAddElementFloatValue(topicElement, 'PNAM', branch.priority);
    if (branch.name.length > 0) {
      maybeAddElementValue(topicElement, 'BNAM', getBranchId(voice, branch));
    }
    maybeAddElementValue(topicElement, 'QNAM', getQuestId(voice));
    xelib.Release(maybeAddGenericElement(topicElement, 'DATA'));
    maybeAddElementValue(topicElement, 'SNAM', 'CUST');
    xelib.Release(maybeAddGenericElement(topicElement, 'TIFC'));
  });

  return topic;
}

function addBranches(plugin, voice) {
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
    createBranch(plugin, voice, branch);
  });

}

function createQuest(plugin, voice) {
  let editorId = getQuestId(voice);
  
  if (xelib.HasElement(plugin, 'QUST\\' + editorId)) {
    zedit.log('Skipping Quest creation: ' + editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Quest...');
  let questGroup = xelib.GetElement(plugin, 'QUST');
  let questElement = maybeAddElement(questGroup, editorId);
  xelib.WithHandles([questGroup, questElement], function () {
    xelib.Release(xelib.AddElementValue(questElement, 'FULL', voice.fullName));
    xelib.Release(xelib.AddElement(questElement, 'NEXT'));
    xelib.Release(xelib.AddElement(questElement, 'ANAM'));
    xelib.Release(xelib.AddElement(questElement, 'DNAM'));
    xelib.SetEnabledFlags(questElement, 'DNAM\\Flags', ['Start Game Enabled', 'Allow repeated stages', 'Unknown 5']);
    xelib.SetUIntValue(questElement, 'DNAM\\Priority', 50);
    xelib.SetUIntValue(questElement, 'DNAM\\Form\ Version', 255);
  });
}

function createVoiceType(plugin, voice) {
  let editorId = voice.fullName;

  if (xelib.HasElement(plugin, 'VTYP\\' + editorId)) {
    zedit.log('Skipping Voice Type creation: ' + editorId + ' already exists');
    return;
  }
  
  zedit.log('Creating a new Voice Type...');
  let voiceTypeGroup = xelib.GetElement(plugin, 'VTYP');
  let newVoiceElement = xelib.AddElement(voiceTypeGroup, '.');
  xelib.Release(xelib.AddElementValue(newVoiceElement, 'EDID', editorId));
  let newVoiceRecord = getRecord(newVoiceElement);
  xelib.SetFlag(newVoiceRecord, 'DNAM', 'Female', (voice.sex === 'Female'));
  xelib.Release(newVoiceRecord);
  xelib.Release(newVoiceElement);
  xelib.Release(voiceTypeGroup);
  
  // Add it to to the FormID List.
  let formIdsElement = xelib.GetElement(plugin, 'FLST\\VAS_VoiceTypes\\LNAM');
  xelib.Release(xelib.AddElementValue(formIdsElement, '.', editorId));
  xelib.Release(formIdsElement);
}

function addTopics(plugin, voice) {
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
    createTopic(plugin, voice, topic);
  });
}

function createTopic(plugin, voice, topic) {
  let editorId = getTopicId(voice, topic);
  
  if (xelib.HasElement(plugin, 'DIAL\\' + editorId)) {
    zedit.log('Skipping Topic creation: ' + editorId + ' already exists');
    return;
  }
  
  let dialogTopicGroup = xelib.GetElement(plugin, 'DIAL');
  let dialogElement = maybeAddElement(dialogTopicGroup, editorId);
  xelib.Release(dialogTopicGroup); 
  xelib.withHandle(dialogELement, function() {
    // TODO
  });
  
  // This should be VERY close to the other topics. What will differ is the population of said topic.
  // At this point I might just start loading in branch and topic settings from JSON files, which
  // would be more useful down the road for creating more generic quest dialogues.
}

function addResponses(plugin, voice, topic) {
  zedit.log('Adding dialogue responses...');
}

function getBranchId(voice, branch) {
  return voice.fullName + '_Branch_' + branch.name;
}

function getQuestId(voice) {
  return voice.fullName + '_Dialogue';
}

function getTopicId(voice, topic) {
  return voice.fullName + '_Topic_' + topic.name;
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