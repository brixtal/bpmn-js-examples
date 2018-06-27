
function createTask(incoming, outgoing) {

	var taskId = 'Task_' + Math.random().toString().replace('0.','');
	var attr = [];

	attr.push({
    	key:   "id",
    	value: taskId
	});	
	var taskTag = tagFactory('Task', attr);
	if(incoming.length > 1){
		var incomingTag = tagFactory('incoming', []);
		var contentTag = textTag(incoming);
		incomingTag.appendChild(contentTag);
		taskTag.appendChild(incomingTag);
	}
	if(outgoing.length > 1){
		var outgoingTag = tagFactory('outgoing', []);
		var contentTag = textTag(outgoing);
		outgoingTag.appendChild(contentTag);
		taskTag.appendChild(outgoingTag);
	}

	return taskTag;
}

function tagFactory(type, attr) {

	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');
	
	var tag = xmlDoc.createElement("bpmn2:" + type);
	var prop;
	var size = attr.length;
	for (var i = 0; i < size; i++) {
		prop = attr.pop();
		tag.setAttribute(prop.key, prop.value);	
	}
	
	return tag;
}

function textTag(text) {
	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');

	var textTag = xmlDoc.createTextNode(text);

	return textTag;
}

function createSequenceFlowId() {
	var sequenceFlowElementId = 'SequenceFlow_' + Math.random().toString().replace('0.','');
	return sequenceFlowElementId;
}

function createSequenceFlowTag(id, sourceRef, targetRef) {
	var attr = [];
	
	attr.push({
    	key:   "sourceRef",
    	value: sourceRef
	},{
    	key:   "targetRef",
    	value: targetRef
	},{
    	key:   "id",
    	value: id
	});		

	var tag = tagFactory('sequenceFlow', attr);
	//tag.setAttribute('sourceRef', sourceRef);

	console.log(tag);

	return tag;
}