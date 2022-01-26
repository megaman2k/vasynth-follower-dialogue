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
  let branchElement = maybeAddElementWithEditorId(dialogBranchGroup, editorId);
  xelib.Release(dialogBranchGroup);
  maybeAddElementValue(branchElement, 'QNAM', getQuestId(voice));
  maybeAddElementValue(branchElement, 'TNAM', 0, 'UInt');
  let dnamElement = maybeAddElement(branchElement, 'DNAM');
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
  let topicElement = maybeAddElementWithEditorId(dialogTopicGroup, editorId);
  xelib.Release(dialogTopicGroup);
  xelib.WithHandle(topicElement, function() {
    maybeAddElementValue(topicElement, 'FULL', branch.topicText);
    maybeAddElementValue(topicElement, 'PNAM', branch.priority, 'Float');
    if (branch.name.length > 0) {
      maybeAddElementValue(topicElement, 'BNAM', getBranchId(voice, branch));
    }
    maybeAddElementValue(topicElement, 'QNAM', getQuestId(voice));
    xelib.Release(maybeAddElement(topicElement, 'DATA'));
    maybeAddElementValue(topicElement, 'SNAM', 'CUST');
    xelib.Release(maybeAddElement(topicElement, 'TIFC'));
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
  let questElement = maybeAddElementWithEditorId(questGroup, editorId);
  xelib.Release(questGroup);
  xelib.WithHandle(questElement, function () {
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
  let newVoiceElement = maybeAddElementWithEditorId(voiceTypeGroup, editorId);
  xelib.Release(voiceTypeGroup);
  let newVoiceRecord = getRecord(newVoiceElement);
  xelib.SetFlag(newVoiceRecord, 'DNAM', 'Female', (voice.sex === 'Female'));
  xelib.Release(newVoiceRecord);
  xelib.Release(newVoiceElement);
  
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
  let dialogElement = maybeAddElementWithEditorId(dialogTopicGroup, editorId);
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

// This adds an element to a group, then sets that element's EditorID.
// If an element already exists with that EditorID, it will be returned.
function maybeAddElementWithEditorId(parent, editorId) {
  if (xelib.HasElement(parent, editorId)) {
    return xelib.GetElement(parent, editorId);
  }
  let element = xelib.AddElement(parent, '.');
  xelib.Release(xelib.AddElementValue(element, 'EDID', editorId));
  return element;
}

// This adds an element to another, then returns it.
// If the element already exists with that name, it will be returned.
function maybeAddElement(parent, elementName) {
  if (xelib.HasElement(parent, elementName)) {
    return xelib.GetElement(parent, elementName);
  }
  return xelib.AddElement(parent, elementName);
}

// This adds an element to another, if it does not already exist.
// The added/fetched element's value is then set based on the provided type.
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