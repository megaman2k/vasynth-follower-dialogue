const voice = {
  sex: 'Female',
  game: 'FO4',
  name: 'Cait',
};
voice.fullName = ['VAS', voice.sex, voice.game, voice.name].join('_');
const pluginName = 'VASynth_Voices.esp';

const quest = {
  editorId: voice.fullName + '_Dialogue'
};

const branches = {
  Recruit:   {name: 'Recruit',   type: 'Top-Level', startingTopic: 'Recruit'},
  Dismiss:   {name: 'Dismiss',   type: 'Top-Level', startingTopic: 'Dismiss'},
  Wait:      {name: 'Wait',      type: 'Top-Level', startingTopic: 'Wait'},
  Follow:    {name: 'Follow',    type: 'Top-Level', startingTopic: 'Follow'},
  Favor:     {name: 'Favor',     type: 'Top-Level', startingTopic: 'Favor'},
  FavorMore: {name: 'FavorMore', type: 'Blocking',  startingTopic: 'FavorMore'},
  Trade:     {name: 'Trade',     type: 'Top-Level', startingTopic: 'Trade'}
};
Object.keys(branches).forEach(key => 
  branches[key].editorId = voice.fullName + '_Branch_' + branches[key].name);
    
const topics = {
    Recruit:        {name: 'Recruit',   priority: 10.0,  category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: 'Follow me. I need your help.'},
    Dismiss:        {name: 'Dismiss',   priority: 0.0,   category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: 'It\'s time for us to part ways'},
    Wait:           {name: 'Wait',      priority: 100.0, category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: 'Wait here.'},
    Follow:         {name: 'Follow',    priority: 100.0, category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: 'Follow me.'},
    Favor:          {name: 'Favor',     priority: 50.0,  category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: 'I need you to do something.'},
    FavorMore:      {name: 'FavorMore', priority: 50.0,  category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: ''},
    Trade:          {name: 'Trade',     priority: 10.0,  category: 'Topic',         subtype: 'Custom', subtypeName: 'CUST', text: 'I need to trade some things with you.'},
    Hello:          {name: 'Hello',                      category: 'Miscellaneous', subtype: 'Hello', subtypeName: 'HELO'},
    Goodbye:        {name: 'Goodbye',                    category: 'Miscellaneous', subtype: 'GoodBye', subtypeName: 'GBYE'},
    Shared:         {name: 'Shared',                     category: 'Miscellaneous', subtype: 'SharedInfo', subtypeName: 'IDAT'},
    Idle:           {name: 'Idle',                       category: 'Miscellaneous', subtype: 'Idle', subtypeName: 'IDLE'},
    Collide:        {name: 'Collide',                    category: 'Miscellaneous', subtype: 'ActorCollidewithActor', subtypeName: 'ACAC'},
    CombatToNormal: {name: 'CombatToNormal',             category: 'Detection',     subtype: 'CombatToNormal', subtypeName: 'COTN'},
    NormalToCombat: {name: 'NormalToCombat',             category: 'Detection',     subtype: 'NormalToCombat', subtypeName: 'NOTC'},
    Agree:          {name: 'Agree',                      category: 'Favors',        subtype: 'Agree', subtypeName: 'AGRE'},
    Refuse:         {name: 'Refuse',                     category: 'Favors',        subtype: 'Refuse', subtypeName: 'REFU'},
    ExitFavor:      {name: 'ExitFavor',                  category: 'Favors',        subtype: 'ExitFavorState', subtypeName: 'FEXT'},
    Attack:         {name: 'Attack',                     category: 'Combat',        subtype: 'Attack', subtypeName: 'ATCK'},
    PowerAttack:    {name: 'PowerAttack',                category: 'Combat',        subtype: 'PowerAttack', subtypeName: 'POAT'},
    Block:          {name: 'Block',                      category: 'Combat',        subtype: 'Block', subtypeName: 'BLOC'},
    Hit:            {name: 'Hit',                        category: 'Combat',        subtype: 'Hit', subtypeName: 'HIT_'},
    Taunt:          {name: 'Taunt',                      category: 'Combat',        subtype: 'Taunt', subtypeName: 'TAUT'},
    Bleedout:       {name: 'Bleedout',                   category: 'Combat',        subtype: 'Bleedout', subtypeName: 'BLED'}
};
Object.keys(topics).forEach(key => 
  topics[key].editorId = voice.fullName + '_Topic_' + topics[key].name);

let plugin = xelib.FileByName(pluginName);
xelib.WithHandle(plugin, function() {
  createVoiceType(plugin, voice);
  createQuest(plugin, quest);
  Object.keys(topics).forEach(key => createTopic(plugin, quest, topics[key]));
  Object.keys(branches).forEach(key => createBranch(plugin, quest, branches[key], topics));
  //addResponses(plugin, voice);
});

function addResponses(plugin, voice, topic) {
  zedit.log('Adding dialogue responses...');
}

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

/**
 * ----------------------------------------------------------------------------
 *                              HELPER FUNCTIONS 
 * ----------------------------------------------------------------------------
 */

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